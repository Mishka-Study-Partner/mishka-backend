const prisma = require("../utils/prisma");
const {
  COMMUNITY_SUBJECTS,
  COMMUNITY_PURPOSES,
  primaryCategoryLabel,
} = require("../utils/communityDiscoverTaxonomy");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function mapCommunityCard(row, locale = "en") {
  const memberCount = row._count?.members ?? 0;
  const channelCount = row._count?.channels ?? 0;
  const { _count, ...rest } = row;
  return {
    ...rest,
    memberCount,
    channelCount,
    primarySubjectLabel: primaryCategoryLabel(rest.subjectKeys, locale),
  };
}

async function loadUserDiscoveryContext(userId) {
  const [user, memberships, savedCategories, joinedCommunities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        educationStatus: true,
        schoolTrack: true,
        schoolGrade: true,
        universityYear: true,
      },
    }),
    prisma.userCommunity.findMany({
      where: { userId },
      select: { communityId: true },
    }),
    prisma.userSavedCategory.findMany({
      where: { userId },
      include: { category: { select: { title: true, routeKey: true } } },
    }),
    prisma.userCommunity.findMany({
      where: { userId },
      select: { community: { select: { subjectKeys: true, category: true } } },
    }),
  ]);

  const joinedIds = new Set(memberships.map((m) => m.communityId));

  const savedSubjectHints = new Set();
  for (const sc of savedCategories) {
    const rk = (sc.category?.routeKey || sc.category?.title || "").toLowerCase();
    if (rk) savedSubjectHints.add(rk.replace(/\s+/g, "_"));
  }

  const joinedSubjectHints = new Set();
  for (const m of joinedCommunities) {
    for (const k of m.community?.subjectKeys || []) joinedSubjectHints.add(k);
  }

  return {
    user,
    joinedIds,
    savedSubjectHints,
    joinedSubjectHints,
    profileHints: {
      educationStatus: user?.educationStatus ?? null,
      schoolTrack: user?.schoolTrack ?? null,
      schoolGrade: user?.schoolGrade ?? null,
      universityYear: user?.universityYear ?? null,
    },
  };
}

function subjectOverlap(communityKeys, hintSet) {
  if (!hintSet?.size || !communityKeys?.length) return false;
  return communityKeys.some((k) => hintSet.has(k));
}

/**
 * @param {object} community
 * @param {ReturnType<typeof loadUserDiscoveryContext> extends Promise<infer T> ? T : never} ctx
 */
function scoreCommunity(community, ctx) {
  let score = 0;
  const reasons = [];
  const tags = [...(community.subjectKeys || [])];
  if (community.educationStatus) tags.push(community.educationStatus);
  if (community.schoolGrade != null) tags.push(`grade_${community.schoolGrade}`);
  if (community.universityYear != null) tags.push(`year_${community.universityYear}`);

  const u = ctx.user;
  if (u?.educationStatus && community.educationStatus === u.educationStatus) {
    score += 40;
    reasons.push("education_match");
  }
  if (
    u?.educationStatus === "school" &&
    community.educationStatus === "school" &&
    u.schoolGrade != null &&
    community.schoolGrade === u.schoolGrade
  ) {
    score += 20;
    reasons.push("grade_match");
  }
  if (
    u?.educationStatus === "university" &&
    community.educationStatus === "university" &&
    u.universityYear != null &&
    community.universityYear === u.universityYear
  ) {
    score += 20;
    reasons.push("year_match");
  }
  if (subjectOverlap(community.subjectKeys, ctx.savedSubjectHints)) {
    score += 30;
    reasons.push("interest_match");
  } else if (subjectOverlap(community.subjectKeys, ctx.joinedSubjectHints)) {
    score += 15;
    reasons.push("similar_communities");
  }

  const members = community._count?.members ?? 0;
  const channels = community._count?.channels ?? 0;
  score += Math.min(15, Math.log10(members + 1) * 8);
  score += Math.min(5, channels);

  const createdAt = community.createdAt ? new Date(community.createdAt).getTime() : 0;
  if (createdAt > Date.now() - WEEK_MS) {
    score += 8;
    reasons.push("new");
  }

  if (reasons.length === 0) reasons.push("popular");

  const matchReason =
    reasons.includes("education_match") || reasons.includes("grade_match") || reasons.includes("year_match")
      ? "Because of your profile"
      : reasons.includes("interest_match")
        ? "Matches your interests"
        : reasons.includes("similar_communities")
          ? "Similar to communities you joined"
          : reasons.includes("new")
            ? "New this week"
            : "Popular in Mishka";

  return { score, matchReason, matchTags: [...new Set(reasons)], matchReasonCode: reasons[0] };
}

function publicDiscoverWhere(ctx, filters = {}) {
  const where = {
    visibility: "public",
    id: { notIn: [...ctx.joinedIds] },
  };
  if (filters.educationStatus) where.educationStatus = filters.educationStatus;
  if (filters.schoolTrack) where.schoolTrack = filters.schoolTrack;
  if (filters.schoolGrade != null) where.schoolGrade = filters.schoolGrade;
  if (filters.universityYear != null) where.universityYear = filters.universityYear;
  if (filters.purpose) where.purpose = filters.purpose;
  if (filters.locale) where.locale = filters.locale;
  if (filters.subject) {
    where.subjectKeys = { has: filters.subject };
  }
  if (filters.q) {
    const q = String(filters.q).trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }
  }
  return where;
}

const communityInclude = { _count: { select: { members: true, channels: true } } };

/**
 * @param {string} userId
 * @param {{ limit?: number; section?: string; locale?: string }} opts
 */
async function getRecommendedCommunities(userId, opts = {}) {
  const limit = Math.min(50, Math.max(1, parseInt(String(opts.limit || 20), 10) || 20));
  const section = opts.section || "for_you";
  const locale = opts.locale === "ar" ? "ar" : "en";
  const ctx = await loadUserDiscoveryContext(userId);

  const where = publicDiscoverWhere(ctx);

  let rows = await prisma.community.findMany({
    where,
    include: communityInclude,
    take: section === "for_you" ? 200 : limit,
    orderBy: section === "new" ? { createdAt: "desc" } : { name: "asc" },
  });

  if (section === "popular") {
    rows.sort((a, b) => (b._count?.members ?? 0) - (a._count?.members ?? 0));
    rows = rows.slice(0, limit);
    return {
      section,
      profileHints: ctx.profileHints,
      items: rows.map((c) => ({
        community: mapCommunityCard(c, locale),
        score: c._count?.members ?? 0,
        matchReason: "Popular in Mishka",
        matchReasonCode: "popular",
        matchTags: ["popular"],
      })),
    };
  }

  if (section === "new") {
    rows = rows.slice(0, limit);
    return {
      section,
      profileHints: ctx.profileHints,
      items: rows.map((c) => ({
        community: mapCommunityCard(c, locale),
        score: new Date(c.createdAt).getTime(),
        matchReason: "New this week",
        matchReasonCode: "new",
        matchTags: ["new"],
      })),
    };
  }

  const scored = rows
    .map((c) => {
      const { score, matchReason, matchTags, matchReasonCode } = scoreCommunity(c, ctx);
      return {
        community: mapCommunityCard(c, locale),
        score,
        matchReason,
        matchReasonCode,
        matchTags,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    section: "for_you",
    profileHints: ctx.profileHints,
    items: scored,
  };
}

/**
 * @param {string} userId
 * @param {object} filters
 * @param {{ limit?: number; offset?: number; locale?: string }} pagination
 */
async function discoverCommunities(userId, filters, pagination = {}) {
  const limit = Math.min(100, Math.max(1, parseInt(String(pagination.limit || 20), 10) || 20));
  const offset = Math.max(0, parseInt(String(pagination.offset || 0), 10) || 0);
  const locale = pagination.locale === "ar" ? "ar" : "en";
  const ctx = await loadUserDiscoveryContext(userId);
  const where = publicDiscoverWhere(ctx, filters);

  const [total, rows] = await Promise.all([
    prisma.community.count({ where }),
    prisma.community.findMany({
      where,
      include: communityInclude,
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    total,
    limit,
    offset,
    items: rows.map((c) => mapCommunityCard(c, locale)),
  };
}

async function getCommunityCategoryTitles(userId, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100);
  const q = opts.q != null ? String(opts.q).trim().toLowerCase() : "";

  const memberIds = userId
    ? (
        await prisma.userCommunity.findMany({
          where: { userId },
          select: { communityId: true },
        })
      ).map((m) => m.communityId)
    : [];

  const visibilityOr = [{ visibility: "public" }];
  if (memberIds.length) visibilityOr.push({ id: { in: memberIds } });

  const rows = await prisma.community.findMany({
    where: {
      OR: visibilityOr,
      NOT: { category: "" },
    },
    select: { category: true },
  });

  const byKey = new Map();
  for (const row of rows) {
    const title = String(row.category || "").trim();
    if (!title) continue;
    const key = title.toLowerCase();
    const cur = byKey.get(key);
    if (!cur) byKey.set(key, { title, communityCount: 1 });
    else cur.communityCount += 1;
  }

  let items = [...byKey.values()];
  if (q) items = items.filter((i) => i.title.toLowerCase().includes(q));
  items.sort((a, b) => b.communityCount - a.communityCount || a.title.localeCompare(b.title));
  return { items: items.slice(0, limit) };
}

async function getDiscoverCategories(locale = "en", userId = null) {
  const isAr = locale === "ar";
  const publicCommunities = await prisma.community.findMany({
    where: { visibility: "public" },
    select: { subjectKeys: true, purpose: true, educationStatus: true },
  });

  const subjectCounts = Object.fromEntries(COMMUNITY_SUBJECTS.map((s) => [s.key, 0]));
  const purposeCounts = Object.fromEntries(COMMUNITY_PURPOSES.map((p) => [p.key, 0]));
  const educationCounts = { school: 0, university: 0, other: 0 };

  for (const c of publicCommunities) {
    for (const k of c.subjectKeys || []) {
      if (subjectCounts[k] != null) subjectCounts[k] += 1;
    }
    if (c.purpose && purposeCounts[c.purpose] != null) purposeCounts[c.purpose] += 1;
    if (c.educationStatus && educationCounts[c.educationStatus] != null) {
      educationCounts[c.educationStatus] += 1;
    }
  }

  const categoryTitles = userId != null ? (await getCommunityCategoryTitles(userId, { limit: 30 })).items : [];

  return {
    subjects: COMMUNITY_SUBJECTS.map((s) => ({
      key: s.key,
      label: isAr ? s.labelAr : s.labelEn,
      labelEn: s.labelEn,
      labelAr: s.labelAr,
      communityCount: subjectCounts[s.key] || 0,
    })),
    purposes: COMMUNITY_PURPOSES.map((p) => ({
      key: p.key,
      label: isAr ? p.labelAr : p.labelEn,
      communityCount: purposeCounts[p.key] || 0,
    })),
    educationLevels: [
      { key: "school", label: isAr ? "مدرسة" : "School", communityCount: educationCounts.school },
      { key: "university", label: isAr ? "جامعة" : "University", communityCount: educationCounts.university },
      { key: "other", label: isAr ? "أخرى" : "Other", communityCount: educationCounts.other },
    ],
    categoryTitles,
  };
}

module.exports = {
  getRecommendedCommunities,
  discoverCommunities,
  getDiscoverCategories,
  getCommunityCategoryTitles,
  mapCommunityCard,
};
