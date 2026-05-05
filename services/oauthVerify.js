const crypto = require("crypto");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const { Prisma } = require("@prisma/client");
const jose = require("jose");
const prisma = require("../utils/prisma");
const { HttpError } = require("../utils/httpError");
const { allocateUsername } = require("../utils/generateUsername");

const APPLE_ISSUER = "https://appleid.apple.com";
const appleJwks = jose.createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/**
 * @returns {Promise<{ sub: string; email?: string; givenName: string; familyName: string; picture?: string }>}
 */
async function verifyGoogleIdToken(idToken) {
  const audiences = (process.env.GOOGLE_OAUTH_CLIENT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!audiences.length) {
    throw new HttpError(503, "Google OAuth is not configured (set GOOGLE_OAUTH_CLIENT_IDS)", undefined, "OAUTH_NOT_CONFIGURED");
  }

  const client = new OAuth2Client();
  let payload = null;
  let lastErr = null;
  for (const aud of audiences) {
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: aud });
      payload = ticket.getPayload();
      if (payload) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!payload || !payload.sub) {
    throw new HttpError(401, "Invalid Google ID token", { reason: String(lastErr?.message || "verify_failed") }, "OAUTH_TOKEN_INVALID");
  }

  return {
    sub: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    givenName: typeof payload.given_name === "string" ? payload.given_name : "",
    familyName: typeof payload.family_name === "string" ? payload.family_name : "",
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

/**
 * @returns {Promise<{ sub: string; email?: string; givenName: string; familyName: string; picture?: string }>}
 */
async function verifyAppleIdentityToken(identityToken) {
  const raw = process.env.APPLE_CLIENT_IDS || process.env.APPLE_CLIENT_ID || "";
  const audiences = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!audiences.length) {
    throw new HttpError(503, "Apple Sign In is not configured (set APPLE_CLIENT_IDS)", undefined, "OAUTH_NOT_CONFIGURED");
  }

  let payload = null;
  for (const aud of audiences) {
    try {
      const { payload: p } = await jose.jwtVerify(identityToken, appleJwks, {
        issuer: APPLE_ISSUER,
        audience: aud,
      });
      payload = p;
      break;
    } catch {
      /* try next audience */
    }
  }
  if (!payload || !payload.sub) {
    throw new HttpError(401, "Invalid Apple identity token", undefined, "OAUTH_TOKEN_INVALID");
  }

  return {
    sub: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    givenName: "",
    familyName: "",
    picture: undefined,
  };
}

/**
 * @returns {Promise<{ sub: string; email?: string; givenName: string; familyName: string; picture?: string }>}
 */
async function verifyFacebookAccessToken(accessToken) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new HttpError(503, "Facebook Login is not configured (set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET)", undefined, "OAUTH_NOT_CONFIGURED");
  }

  const appAccess = `${appId}|${appSecret}`;
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccess)}`;
  const { data } = await axios.get(debugUrl, { validateStatus: () => true });
  const d = data?.data;
  if (!d?.is_valid || String(d.app_id) !== String(appId)) {
    throw new HttpError(401, "Invalid Facebook access token", undefined, "OAUTH_TOKEN_INVALID");
  }

  const meUrl = `https://graph.facebook.com/v18.0/me?fields=id,email,first_name,last_name&access_token=${encodeURIComponent(accessToken)}`;
  const meRes = await axios.get(meUrl, { validateStatus: () => true });
  if (meRes.status < 200 || meRes.status >= 300 || !meRes.data?.id) {
    throw new HttpError(401, "Could not read Facebook profile", undefined, "OAUTH_TOKEN_INVALID");
  }
  const m = meRes.data;
  const picture =
    m.picture && typeof m.picture === "object" && typeof m.picture.data?.url === "string" ? m.picture.data.url : undefined;

  return {
    sub: String(m.id),
    email: typeof m.email === "string" ? m.email.toLowerCase() : undefined,
    givenName: typeof m.first_name === "string" ? m.first_name : "",
    familyName: typeof m.last_name === "string" ? m.last_name : "",
    picture,
  };
}

function derivePlaceholderEmail(provider, sub) {
  const h = crypto.createHash("sha256").update(`${provider}:${sub}`).digest("hex").slice(0, 40);
  return `oauth.${provider}.${h}@internal.mishka`.slice(0, 150);
}

function splitDisplayName(given, family, emailForHint) {
  let first = (given || "").trim().slice(0, 50);
  let last = (family || "").trim().slice(0, 50);
  if (!first && !last && emailForHint && emailForHint.includes("@")) {
    const local = emailForHint.split("@")[0].replace(/[.+]/g, " ").trim() || "user";
    first = local.slice(0, 50) || "User";
    last = "Member";
  }
  if (!first) first = "User";
  if (!last) last = "Member";
  return { firstName: first, lastName: last };
}

/**
 * @param {string} provider — `google` | `apple` | `facebook`
 * @param {{ sub: string; email?: string; givenName: string; familyName: string; picture?: string }} profile
 * @param {{ agreeTerms: boolean; rememberMe?: boolean; phoneNumber?: string | null; countryCode?: string | null; firstName?: string; lastName?: string; educationStatus?: string; educationOtherDetail?: string | null; schoolTrack?: string | null; schoolGrade?: number | null; universityYear?: number | null }} extras
 * @returns {Promise<{ user: import("@prisma/client").User; created: boolean }>}
 */
async function upsertOAuthUser(provider, profile, extras) {
  const { sub, email: tokenEmail, givenName, familyName, picture } = profile;
  const resolvedEmail =
    tokenEmail && tokenEmail.includes("@") ? tokenEmail.slice(0, 150) : derivePlaceholderEmail(provider, sub);

  const fn = (extras.firstName || givenName || "").trim().slice(0, 50);
  const ln = (extras.lastName || familyName || "").trim().slice(0, 50);
  const names = splitDisplayName(fn, ln, resolvedEmail);

  const existingByProvider = await prisma.user.findFirst({
    where: { provider, providerId: sub },
  });
  if (existingByProvider) {
    const data = {};
    if (picture) data.profileImageUrl = picture.slice(0, 2048);
    const placeholder = existingByProvider.email.includes("@internal.mishka");
    if (tokenEmail && placeholder) {
      const taken = await prisma.user.findFirst({
        where: { email: resolvedEmail, NOT: { id: existingByProvider.id } },
      });
      if (!taken) data.email = resolvedEmail;
    }
    if (Object.keys(data).length) {
      const user = await prisma.user.update({ where: { id: existingByProvider.id }, data });
      return { user, created: false };
    }
    return { user: existingByProvider, created: false };
  }

  const byEmail = await prisma.user.findUnique({ where: { email: resolvedEmail } });
  if (byEmail) {
    if (byEmail.provider && byEmail.providerId && (byEmail.provider !== provider || byEmail.providerId !== sub)) {
      throw new HttpError(409, "This email is linked to another sign-in method", undefined, "AUTH_OAUTH_EMAIL_CONFLICT");
    }
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        provider,
        providerId: sub,
        isVerified: true,
        profileImageUrl: picture ? picture.slice(0, 2048) : byEmail.profileImageUrl,
      },
    });
    return { user, created: false };
  }

  const eduOther =
    extras.educationStatus === "other" ? String(extras.educationOtherDetail || "").trim() || null : null;
  const schoolTrack = extras.educationStatus === "school" ? extras.schoolTrack : null;
  const schoolGrade = extras.educationStatus === "school" ? extras.schoolGrade : null;
  const universityYear = extras.educationStatus === "university" ? extras.universityYear : null;

  try {
    const fullNameStr = `${names.firstName} ${names.lastName}`.slice(0, 150);
    const username = await allocateUsername(prisma, {
      firstName: names.firstName,
      lastName: names.lastName,
      fullName: fullNameStr,
    });
    const user = await prisma.user.create({
      data: {
        firstName: names.firstName,
        lastName: names.lastName,
        email: resolvedEmail,
        phoneNumber: extras.phoneNumber || null,
        countryCode: extras.countryCode ?? null,
        agreeTerms: extras.agreeTerms,
        rememberMe: extras.rememberMe ?? false,
        provider,
        providerId: sub,
        password: null,
        fullName: fullNameStr,
        username,
        isVerified: true,
        profileImageUrl: picture ? picture.slice(0, 2048) : null,
        educationStatus: extras.educationStatus || null,
        educationOtherDetail: eduOther,
        schoolTrack: schoolTrack || null,
        schoolGrade: schoolGrade ?? null,
        universityYear: universityYear ?? null,
      },
    });
    return { user, created: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Email or phone number is already in use", undefined, "UNIQUE_VIOLATION");
    }
    throw e;
  }
}

module.exports = {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
  verifyFacebookAccessToken,
  upsertOAuthUser,
};
