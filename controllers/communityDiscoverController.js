const asyncHandler = require("../utils/asyncHandler");
const {
  getRecommendedCommunities,
  discoverCommunities,
  getDiscoverCategories,
  getCommunityCategoryTitles,
} = require("../services/communityRecommendationService");

exports.recommended = asyncHandler(async (req, res) => {
  const locale = req.query.locale === "ar" ? "ar" : "en";
  const data = await getRecommendedCommunities(req.auth.sub, {
    limit: req.query.limit,
    section: req.query.section,
    locale,
  });
  res.apiSuccess(data, "OK", 200);
});

exports.discover = asyncHandler(async (req, res) => {
  const locale = req.query.locale === "ar" ? "ar" : "en";
  const data = await discoverCommunities(
    req.auth.sub,
    {
      subject: req.query.subject,
      educationStatus: req.query.educationStatus,
      schoolTrack: req.query.schoolTrack,
      schoolGrade: req.query.schoolGrade != null ? Number(req.query.schoolGrade) : undefined,
      universityYear: req.query.universityYear != null ? Number(req.query.universityYear) : undefined,
      purpose: req.query.purpose,
      locale: req.query.localeFilter || req.query.communityLocale,
      q: req.query.q,
    },
    { limit: req.query.limit, offset: req.query.offset, locale }
  );
  res.apiSuccess(data, "OK", 200);
});

exports.categories = asyncHandler(async (req, res) => {
  const locale = req.query.locale === "ar" ? "ar" : "en";
  const data = await getDiscoverCategories(locale, req.auth.sub);
  res.apiSuccess(data, "OK", 200);
});

exports.categoryTitles = asyncHandler(async (req, res) => {
  const data = await getCommunityCategoryTitles(req.auth.sub, {
    q: req.query.q,
    limit: req.query.limit,
  });
  res.apiSuccess(data, "OK", 200);
});
