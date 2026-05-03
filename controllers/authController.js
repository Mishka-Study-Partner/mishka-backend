const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { HttpError } = require("../utils/httpError");

const SALT_ROUNDS = 10;

function issueToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign(payload, process.env.JWT_SECRET || "dev-secret-change-me", {
    expiresIn,
  });
  return { token, expiresIn };
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

exports.register = asyncHandler(async (req, res) => {
  const body = req.body;
  const password = body.password ? await bcrypt.hash(body.password, SALT_ROUNDS) : null;

  const user = await prisma.user.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phoneNumber: body.phoneNumber,
      countryCode: body.countryCode,
      agreeTerms: body.agreeTerms,
      provider: body.provider,
      providerId: body.providerId,
      password,
      fullName: `${body.firstName} ${body.lastName}`,
    },
  });

  const { token, expiresIn } = issueToken(user);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return res.apiCreated(authPayload(user, token, expiresIn), "CREATED");
});

exports.login = asyncHandler(async (req, res) => {
  const body = req.body;
  const where = body.email
    ? { email: body.email }
    : { phoneNumber: body.phoneNumber, countryCode: body.countryCode || undefined };

  const user = await prisma.user.findFirst({ where });
  if (!user || !user.password) {
    throw new HttpError(401, "Invalid credentials", undefined, "AUTH_INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials", undefined, "AUTH_INVALID_CREDENTIALS");
  }

  const { token, expiresIn } = issueToken(user);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return res.apiSuccess(authPayload(user, token, expiresIn), "OK", 200);
});

exports.me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
  if (!user) throw new HttpError(404, "User not found", undefined, "USER_NOT_FOUND");
  return res.apiSuccess({ user: userResponse(user) }, "OK", 200);
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const body = req.body;
  const user = await prisma.user.findFirst({
    where: body.email ? { email: body.email } : { phoneNumber: body.phoneNumber },
  });

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
  const { userId, resetCode, newPassword } = req.body;

  const token = await prisma.passwordResetToken.findFirst({
    where: {
      userId,
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

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { password: hash } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { isUsed: true } }),
  ]);

  return res.apiSuccess({ reset: true }, "OK", 200);
});
