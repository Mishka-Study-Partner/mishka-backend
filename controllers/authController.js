const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { HttpError } = require("../utils/httpError");
const {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
  verifyFacebookAccessToken,
  upsertOAuthUser,
} = require("../services/oauthVerify");
const { allocateUsername, ensureUsernameAssigned } = require("../utils/generateUsername");
const { jwtSecret } = require("../utils/jwtSecret");
const {
  EDUCATION_SELECT,
  touchesEducation,
  educationProfileSchema,
  mergeEducationState,
  educationToPrismaData,
} = require("../utils/educationProfile");

const SALT_ROUNDS = 10;

function expiresInForRemember(rememberMe) {
  return rememberMe
    ? process.env.JWT_REMEMBER_ME_EXPIRES_IN || "30d"
    : process.env.JWT_EXPIRES_IN || "7d";
}

function issueToken(user, rememberMe) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const expiresIn = expiresInForRemember(Boolean(rememberMe));
  const token = jwt.sign(payload, jwtSecret(), {
    expiresIn,
  });
  return { token, expiresIn };
}

function sessionExpiryFromToken(token) {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded.exp === "number") {
    return new Date(decoded.exp * 1000);
  }
  const fallbackDays = 7;
  return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000);
}

function userResponse(user) {
  const { password, ...safe } = user;
  return safe;
}

function authPayload(user, token, expiresIn) {
  return {
    accessToken: token,
    token,
    tokenType: "Bearer",
    expiresIn,
    user: userResponse(user),
  };
}

function oauthExtrasFromBody(body) {
  return {
    agreeTerms: body.agreeTerms,
    rememberMe: body.rememberMe,
    phoneNumber: body.phoneNumber,
    countryCode: body.countryCode,
    firstName: body.firstName,
    lastName: body.lastName,
    educationStatus: body.educationStatus,
    educationOtherDetail: body.educationOtherDetail,
    schoolTrack: body.schoolTrack,
    schoolGrade: body.schoolGrade,
    universityYear: body.universityYear,
  };
}

async function finalizeAuthResponse(res, incomingUser, bodyRememberMe, created) {
  const user = await ensureUsernameAssigned(prisma, incomingUser.id);
  if (typeof bodyRememberMe === "boolean") {
    await prisma.user.update({
      where: { id: user.id },
      data: { rememberMe: bodyRememberMe },
    });
    user.rememberMe = bodyRememberMe;
  }
  const rememberMe = typeof bodyRememberMe === "boolean" ? bodyRememberMe : user.rememberMe;
  const { token, expiresIn } = issueToken(user, rememberMe);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      isActive: true,
      expiresAt: sessionExpiryFromToken(token),
    },
  });
  const payload = authPayload(user, token, expiresIn);
  if (created) {
    return res.apiCreated(payload, "CREATED");
  }
  return res.apiSuccess(payload, "OK", 200);
}

function userWhereForPhone(phoneNumber, countryCode) {
  if (countryCode != null && countryCode !== "") {
    return { phoneNumber, countryCode };
  }
  return { phoneNumber, countryCode: null };
}

/** Until real SMS/email OTP ships: any `signupOtp` equal to this value skips DB verification. Disable in production with `DISABLE_SIGNUP_OTP_BYPASS=true`. */
function signupOtpBypassesVerification(signupOtp) {
  if (process.env.DISABLE_SIGNUP_OTP_BYPASS === "true") return false;
  const bypass = process.env.SIGNUP_OTP_BYPASS_CODE ?? "111111";
  return typeof signupOtp === "string" && signupOtp === bypass;
}

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {{ email: string; phoneNumber: string; countryCode?: string | null; signupOtp: string }} body
 */
async function assertSignupOtpValid(tx, body) {
  const row = await tx.signupVerification.findFirst({
    where: {
      code: body.signupOtp,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      OR: [{ email: body.email }, userWhereForPhone(body.phoneNumber, body.countryCode ?? null)],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    throw new HttpError(400, "Invalid or expired signup code", undefined, "SIGNUP_OTP_INVALID");
  }
  const emailChannel = Boolean(row.email);
  const ok = emailChannel
    ? row.email === body.email
    : row.phoneNumber === body.phoneNumber &&
        (row.countryCode ?? null) === (body.countryCode ?? null);
  if (!ok) {
    throw new HttpError(400, "Invalid or expired signup code", undefined, "SIGNUP_OTP_INVALID");
  }
  await tx.signupVerification.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
}

exports.sendSignupOtp = asyncHandler(async (req, res) => {
  const body = req.body;
  const showCode = process.env.RETURN_SIGNUP_OTP_IN_RESPONSE === "true";
  try {
    if (!prisma.signupVerification || typeof prisma.signupVerification.create !== "function") {
      throw new HttpError(
        503,
        "Signup OTP storage is not ready",
        { step: "signupVerification.delegate" },
        "SIGNUP_OTP_STORAGE_NOT_READY"
      );
    }

    if (body.email) {
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        throw new HttpError(409, "This email is already registered", undefined, "AUTH_EMAIL_IN_USE");
      }
      await prisma.signupVerification.updateMany({
        where: { email: body.email, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    } else {
      const existing = await prisma.user.findFirst({
        where: userWhereForPhone(body.phoneNumber, body.countryCode ?? null),
      });
      if (existing) {
        throw new HttpError(409, "This phone number is already registered", undefined, "AUTH_PHONE_IN_USE");
      }
      await prisma.signupVerification.updateMany({
        where: {
          phoneNumber: body.phoneNumber,
          countryCode: body.countryCode ?? null,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
    }

    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.signupVerification.create({
      data: {
        email: body.email || null,
        phoneNumber: body.email ? null : body.phoneNumber,
        countryCode: body.email ? null : body.countryCode ?? null,
        code,
        expiresAt,
      },
    });

    const data = showCode
      ? {
          sent: true,
          signupOtp: code,
          expiresAt: expiresAt.toISOString(),
          channel: body.email ? "email" : "phone",
        }
      : { sent: true, channel: body.email ? "email" : "phone" };

    return res.apiSuccess(data, "OK", 200);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const lowMessage = String(err?.message || "").toLowerCase();
    const errorName = String(err?.name || "");
    const failureHint = errorName === "PrismaClientInitializationError"
      ? "PRISMA_INIT_OR_DB_UNREACHABLE"
      : lowMessage.includes("does not exist")
      ? "MISSING_TABLE_OR_COLUMN"
      : lowMessage.includes("unknown arg")
        ? "OUTDATED_PRISMA_CLIENT"
        : lowMessage.includes("null constraint")
          ? "DB_NOT_NULL_CONSTRAINT"
          : "UNKNOWN";
    console.error("[auth.sendSignupOtp] failed", {
      channel: body.email ? "email" : "phone",
      prismaCode: err?.code || null,
      errorName: errorName || null,
      failureHint,
      message: err?.message || "Unknown error",
    });
    throw new HttpError(
      500,
      "Failed to create signup verification",
      {
        step: "signupVerification.create",
        prismaCode: err?.code || null,
        errorName: errorName || null,
        failureHint,
        ...(process.env.NODE_ENV === "development"
          ? { developerMessage: err?.message || String(err) }
          : {}),
      },
      "SIGNUP_OTP_SEND_FAILED"
    );
  }
});

exports.verifySignupOtp = asyncHandler(async (req, res) => {
  const body = req.body;
  if (signupOtpBypassesVerification(body.signupOtp)) {
    return res.apiSuccess(
      {
        verified: true,
        bypass: true,
        channel: body.email ? "email" : "phone",
      },
      "OK",
      200
    );
  }

  const row = await prisma.signupVerification.findFirst({
    where: {
      code: body.signupOtp,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      OR: body.email
        ? [{ email: body.email }]
        : [{ phoneNumber: body.phoneNumber, countryCode: body.countryCode ?? null }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row) {
    throw new HttpError(400, "Invalid or expired signup code", undefined, "SIGNUP_OTP_INVALID");
  }

  return res.apiSuccess(
    {
      verified: true,
      expiresAt: row.expiresAt.toISOString(),
      channel: row.email ? "email" : "phone",
    },
    "OK",
    200
  );
});

exports.register = asyncHandler(async (req, res) => {
  const body = req.body;
  const password = body.password ? await bcrypt.hash(body.password, SALT_ROUNDS) : null;

  const educationOther =
    body.educationStatus === "other" ? String(body.educationOtherDetail || "").trim() : null;
  const schoolTrack = body.educationStatus === "school" ? body.schoolTrack : null;
  const schoolGrade = body.educationStatus === "school" ? body.schoolGrade : null;
  const universityYear = body.educationStatus === "university" ? body.universityYear : null;

  const otpRequired = process.env.SIGNUP_OTP_REQUIRED === "true";
  const markVerified = otpRequired;

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      if (otpRequired) {
        if (!body.signupOtp) {
          throw new HttpError(400, "signupOtp is required", undefined, "SIGNUP_OTP_INVALID");
        }
        if (!signupOtpBypassesVerification(body.signupOtp)) {
          await assertSignupOtpValid(tx, {
            email: body.email,
            phoneNumber: body.phoneNumber,
            countryCode: body.countryCode,
            signupOtp: body.signupOtp,
          });
        }
      }

      const fullNameStr = `${body.firstName} ${body.lastName}`.trim().slice(0, 150);
      const username = await allocateUsername(tx, {
        firstName: body.firstName,
        lastName: body.lastName,
        fullName: fullNameStr,
      });
      return tx.user.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phoneNumber: body.phoneNumber,
          countryCode: body.countryCode,
          agreeTerms: body.agreeTerms,
          rememberMe: body.rememberMe ?? false,
          provider: body.provider,
          providerId: body.providerId,
          password,
          fullName: fullNameStr,
          username,
          ...(body.gender ? { gender: body.gender } : {}),
          educationStatus: body.educationStatus,
          educationOtherDetail: educationOther,
          schoolTrack,
          schoolGrade,
          universityYear,
          isVerified: markVerified,
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Email or phone number is already in use", undefined, "UNIQUE_VIOLATION");
    }
    throw e;
  }

  return finalizeAuthResponse(res, user, body.rememberMe, true);
});

exports.login = asyncHandler(async (req, res) => {
  const body = req.body;
  const where = body.email
    ? { email: body.email }
    : userWhereForPhone(body.phoneNumber, body.countryCode ?? null);

  const user = await prisma.user.findFirst({ where });
  if (!user || !user.password) {
    throw new HttpError(401, "Invalid credentials", undefined, "AUTH_INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials", undefined, "AUTH_INVALID_CREDENTIALS");
  }

  if (typeof body.rememberMe === "boolean") {
    await prisma.user.update({
      where: { id: user.id },
      data: { rememberMe: body.rememberMe },
    });
    user.rememberMe = body.rememberMe;
  }

  return finalizeAuthResponse(res, user, body.rememberMe, false);
});

exports.oauthGoogle = asyncHandler(async (req, res) => {
  const profile = await verifyGoogleIdToken(req.body.idToken);
  const { user, created } = await upsertOAuthUser("google", profile, oauthExtrasFromBody(req.body));
  return finalizeAuthResponse(res, user, req.body.rememberMe, created);
});

exports.oauthApple = asyncHandler(async (req, res) => {
  const profile = await verifyAppleIdentityToken(req.body.identityToken);
  const { user, created } = await upsertOAuthUser("apple", profile, oauthExtrasFromBody(req.body));
  return finalizeAuthResponse(res, user, req.body.rememberMe, created);
});

exports.oauthFacebook = asyncHandler(async (req, res) => {
  const profile = await verifyFacebookAccessToken(req.body.accessToken);
  const { user, created } = await upsertOAuthUser("facebook", profile, oauthExtrasFromBody(req.body));
  return finalizeAuthResponse(res, user, req.body.rememberMe, created);
});

exports.me = asyncHandler(async (req, res) => {
  await ensureUsernameAssigned(prisma, req.auth.sub);
  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    include: { userPreference: true },
  });
  if (!user) throw new HttpError(404, "User not found", undefined, "USER_NOT_FOUND");
  const { password, userPreference, ...safeUser } = user;
  void password;
  return res.apiSuccess({ user: safeUser, preference: userPreference ?? null }, "OK", 200);
});

exports.updateMe = asyncHandler(async (req, res) => {
  const userId = req.auth.sub;
  const body = req.body;

  const data = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.email !== undefined) data.email = body.email;
  if (body.phoneNumber !== undefined) data.phoneNumber = body.phoneNumber;
  if (body.countryCode !== undefined) data.countryCode = body.countryCode;
  if (body.gender !== undefined) data.gender = body.gender;
  if (body.profileImageUrl !== undefined) data.profileImageUrl = body.profileImageUrl;
  if (body.rememberMe !== undefined) data.rememberMe = body.rememberMe;

  if (touchesEducation(body)) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: EDUCATION_SELECT,
    });
    const merged = mergeEducationState(body, current);
    if (!merged.educationStatus) {
      throw new HttpError(
        400,
        "educationStatus is required when updating education fields",
        undefined,
        "VALIDATION_ERROR"
      );
    }
    const eduResult = educationProfileSchema.safeParse(merged);
    if (!eduResult.success) {
      throw new HttpError(400, "Validation failed", eduResult.error.issues, "VALIDATION_ERROR");
    }
    Object.assign(data, educationToPrismaData(eduResult.data));
  }

  if (body.fullName !== undefined) {
    data.fullName = body.fullName;
  } else if (body.firstName !== undefined || body.lastName !== undefined) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    const fn = body.firstName ?? current?.firstName ?? "";
    const ln = body.lastName ?? current?.lastName ?? "";
    data.fullName = `${fn} ${ln}`.trim().slice(0, 150);
  }

  if (body.password != null && body.password !== "") {
    data.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  }

  if (data.firstName || data.lastName || data.fullName) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, fullName: true } });
    const username = await allocateUsername(prisma, {
      firstName: data.firstName ?? current?.firstName,
      lastName: data.lastName ?? current?.lastName,
      fullName: data.fullName ?? current?.fullName,
      excludeUserId: userId,
    });
    data.username = username;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: { userPreference: true },
    });
    const { password: _pw, userPreference, ...safeUser } = updated;
    void _pw;
    return res.apiSuccess({ user: safeUser, preference: userPreference ?? null }, "OK", 200);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Email or phone number is already in use", { target: e.meta?.target }, "UNIQUE_VIOLATION");
    }
    throw e;
  }
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, "No file uploaded. Send a multipart field named 'avatar'.", undefined, "VALIDATION_ERROR");
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimes.includes(req.file.mimetype)) {
    throw new HttpError(400, "Only JPEG, PNG, WebP, and GIF images are allowed.", undefined, "VALIDATION_ERROR");
  }

  const fs = require("fs");
  const path = require("path");
  const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${req.auth.sub}_${Date.now()}.${ext}`;
  const dir = path.join(__dirname, "..", "uploads", "avatars");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const oldUser = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { profileImageUrl: true } });
  if (oldUser?.profileImageUrl) {
    const oldPath = path.join(__dirname, "..", oldUser.profileImageUrl.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  fs.writeFileSync(path.join(dir, filename), req.file.buffer);

  const host = req.get("host");
  const protocol = req.protocol;
  const baseUrl = process.env.AVATAR_BASE_URL || `${protocol}://${host}`;
  const profileImageUrl = `${baseUrl}/uploads/avatars/${filename}`;

  const updated = await prisma.user.update({
    where: { id: req.auth.sub },
    data: { profileImageUrl },
    include: { userPreference: true },
  });
  const { password: _pw2, userPreference, ...safeUser } = updated;
  void _pw2;
  return res.apiSuccess({ user: safeUser, preference: userPreference ?? null }, "OK", 200);
});

exports.deleteAvatar = asyncHandler(async (req, res) => {
  const fs = require("fs");
  const path = require("path");

  const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { profileImageUrl: true } });
  if (user?.profileImageUrl && user.profileImageUrl.includes("/uploads/avatars/")) {
    const url = new URL(user.profileImageUrl);
    const filePath = path.join(__dirname, "..", url.pathname.replace(/^\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const updated = await prisma.user.update({
    where: { id: req.auth.sub },
    data: { profileImageUrl: null },
    include: { userPreference: true },
  });
  const { password: _pw3, userPreference: pref, ...safeUser } = updated;
  void _pw3;
  return res.apiSuccess({ user: safeUser, preference: pref ?? null }, "OK", 200);
});

exports.logout = asyncHandler(async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    throw new HttpError(401, "Missing Bearer token", undefined, "AUTH_MISSING_TOKEN");
  }
  await prisma.userSession.updateMany({
    where: { userId: req.auth.sub, token, isActive: true },
    data: { isActive: false },
  });
  return res.apiSuccess({ loggedOut: true }, "OK", 200);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const body = req.body;
  const where = body.email
    ? { email: body.email }
    : userWhereForPhone(body.phoneNumber, body.countryCode ?? null);

  const user = await prisma.user.findFirst({ where });

  const showCode = process.env.RETURN_RESET_CODE_IN_RESPONSE === "true";

  if (!user) {
    return res.apiSuccess({ sent: true }, "OK", 200);
  }

  const resetCode = `${Math.floor(10000 + Math.random() * 90000)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      resetCode,
      expiresAt,
      isUsed: false,
    },
  });

  const data = showCode
    ? {
        sent: true,
        userId: user.id,
        resetCode,
        expiresAt: expiresAt.toISOString(),
      }
    : { sent: true };

  return res.apiSuccess(data, "OK", 200);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { userId, email, phoneNumber, countryCode, resetCode, newPassword } = req.body;
  const identityWhere = userId
    ? { userId }
    : email
      ? { user: { email } }
      : { user: userWhereForPhone(phoneNumber, countryCode ?? null) };

  const token = await prisma.passwordResetToken.findFirst({
    where: {
      ...identityWhere,
      resetCode,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) {
    throw new HttpError(400, "Invalid or expired reset code", undefined, "RESET_CODE_INVALID");
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const resolvedUserId = token.userId;

  await prisma.$transaction([
    prisma.user.update({ where: { id: resolvedUserId }, data: { password: hash } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { isUsed: true } }),
  ]);

  return res.apiSuccess({ reset: true }, "OK", 200);
});
