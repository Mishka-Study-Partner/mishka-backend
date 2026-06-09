const { normalizeSubjectKeys } = require("./communityDiscoverTaxonomy");
const { resolveCategoryFromBody } = require("./communityCategory");

/**
 * Build Prisma data for community discovery columns from validated request body.
 * @param {object} body
 * @param {{ partial?: boolean }} [opts]
 */
function communityDiscoveryDataFromBody(body, opts = {}) {
  const data = {};
  const locale = body.locale === "ar" ? "ar" : "en";
  const categoryTouched = body.category !== undefined || body.newCategoryTitle !== undefined;

  let subjectKeys;
  if (!opts.partial || body.subjectKeys !== undefined) {
    const inferCategory = body.newCategoryTitle ?? body.category;
    subjectKeys = normalizeSubjectKeys(body.subjectKeys, inferCategory);
    data.subjectKeys = subjectKeys;
  }

  if (!opts.partial || categoryTouched) {
    const keysForDefault = subjectKeys ?? normalizeSubjectKeys(body.subjectKeys);
    data.category = resolveCategoryFromBody(body, {
      partial: opts.partial,
      subjectKeysForDefault: keysForDefault,
      locale,
    });
  }

  if (!opts.partial || body.educationStatus !== undefined) {
    data.educationStatus = body.educationStatus ?? null;
  }
  if (!opts.partial || body.schoolTrack !== undefined) {
    data.schoolTrack = body.schoolTrack ?? null;
  }
  if (!opts.partial || body.schoolGrade !== undefined) {
    data.schoolGrade = body.schoolGrade ?? null;
  }
  if (!opts.partial || body.universityYear !== undefined) {
    data.universityYear = body.universityYear ?? null;
  }
  if (!opts.partial || body.purpose !== undefined) {
    data.purpose = body.purpose ?? "general";
  }
  if (!opts.partial || body.locale !== undefined) {
    data.locale = body.locale === "ar" ? "ar" : "en";
  }
  return data;
}

module.exports = { communityDiscoveryDataFromBody };
