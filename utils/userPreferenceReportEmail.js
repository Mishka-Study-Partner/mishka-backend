const prisma = require("./prisma");
const { badRequest } = require("./httpError");

function mapReportEmailSettings(pref) {
  return {
    reportEmailAutoEnabled: pref.reportEmailAutoEnabled ?? false,
    reportEmailFrequency: pref.reportEmailFrequency ?? null,
    reportEmailLocale: pref.reportEmailLocale ?? "en",
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
