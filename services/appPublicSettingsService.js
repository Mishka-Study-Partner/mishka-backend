const prisma = require("../utils/prisma");

const DEFAULT_ID = "default";

async function getOrCreate() {
  let row = await prisma.appPublicSettings.findUnique({ where: { id: DEFAULT_ID } });
  if (!row) {
    row = await prisma.appPublicSettings.create({
      data: { id: DEFAULT_ID, privacyPolicyText: "" },
    });
  }
  return row;
}

/**
 * @param {Partial<{
 *   privacyPolicyText: string,
 *   supportEmail: string | null,
 *   supportPhone: string | null,
 *   supportFacebookUrl: string | null,
 *   supportInstagramUrl: string | null,
 * }>} data
 */
async function updateSettings(data) {
  await getOrCreate();
  return prisma.appPublicSettings.update({
    where: { id: DEFAULT_ID },
    data: {
      ...(data.privacyPolicyText !== undefined && { privacyPolicyText: data.privacyPolicyText }),
      ...(data.supportEmail !== undefined && { supportEmail: data.supportEmail }),
      ...(data.supportPhone !== undefined && { supportPhone: data.supportPhone }),
      ...(data.supportFacebookUrl !== undefined && { supportFacebookUrl: data.supportFacebookUrl }),
      ...(data.supportInstagramUrl !== undefined && { supportInstagramUrl: data.supportInstagramUrl }),
    },
  });
}

module.exports = { getOrCreate, updateSettings, DEFAULT_ID };
