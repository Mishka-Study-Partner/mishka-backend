const prisma = require("./prisma");
const { badRequest } = require("./httpError");

function mapReportEmailSettings(pref, accountEmail) {
  const custom = pref.reportEmailRecipient?.trim() || null;
  const account = accountEmail?.trim() || null;
  return {
    reportEmailAutoEnabled: pref.reportEmailAutoEnabled ?? false,
    reportEmailFrequency: pref.reportEmailFrequency ?? null,
    reportEmailLocale: pref.reportEmailLocale ?? "en",
    /** Account email from signup/login — use for “send to my email” option in UI. */
    accountEmail: account,
    /** Custom address when user picks “other email”; null means use account email. */
    reportEmailRecipient: custom,
    /** True when a custom recipient is saved (not account email). */
    usingCustomRecipient: Boolean(custom),
    /** Address used for scheduled auto-email: custom if set, else account. */
    effectiveRecipientEmail: custom || account,
    reportEmailLastSentAt: pref.reportEmailLastSentAt?.toISOString?.() ?? pref.reportEmailLastSentAt ?? null,
    reportEmailLastPeriodKey: pref.reportEmailLastPeriodKey ?? null,
  };
}

async function ensureUserPreference(userId) {
  return prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      reportEmailAutoEnabled: false,
      reportEmailLocale: "en",
    },
    update: {},
  });
}

/**
 * @param {object} body validated PATCH body
 */
function buildReportEmailPreferenceUpdate(body) {
  const data = {};

  if (body.reportEmailLocale !== undefined) {
    data.reportEmailLocale = body.reportEmailLocale;
  }

  if (body.reportEmailRecipient !== undefined) {
    data.reportEmailRecipient = body.reportEmailRecipient;
  }

  if (body.reportEmailAutoEnabled === false) {
    data.reportEmailAutoEnabled = false;
    data.reportEmailFrequency = null;
    return data;
  }

  if (body.reportEmailAutoEnabled === true) {
    if (!body.reportEmailFrequency) {
      throw badRequest(
        "reportEmailFrequency (weekly or monthly) is required when enabling auto email",
        undefined,
        "VALIDATION_ERROR"
      );
    }
    data.reportEmailAutoEnabled = true;
    data.reportEmailFrequency = body.reportEmailFrequency;
    return data;
  }

  if (body.reportEmailFrequency !== undefined) {
    if (body.reportEmailFrequency === null) {
      data.reportEmailAutoEnabled = false;
      data.reportEmailFrequency = null;
    } else {
      data.reportEmailAutoEnabled = true;
      data.reportEmailFrequency = body.reportEmailFrequency;
    }
  }

  return data;
}

module.exports = {
  mapReportEmailSettings,
  ensureUserPreference,
  buildReportEmailPreferenceUpdate,
};
