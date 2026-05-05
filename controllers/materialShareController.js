const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { badRequest } = require("../utils/httpError");
const { createMaterialSharesBatch } = require("../services/materialShareService");

/**
 * POST body: channelIds, materialType, materialId, optional note.
 * Creates one share row per channel (idempotent per user/channel/material).
 */
exports.createBatch = asyncHandler(async (req, res) => {
  const { channelIds, materialType, materialId, note } = req.body;
  const result = await createMaterialSharesBatch(req, { channelIds, materialType, materialId, note });
  res.apiSuccess(result, "OK", 200);
});

/**
 * GET — shares posted to channels in communities the current user belongs to (newest first).
 * Optional query: `communityId` (UUID) to restrict to one community.
 */
exports.listFeed = asyncHandler(async (req, res) => {
  const userId = req.auth.sub;
  const channelWhere = {
    groupMembers: { some: { userId } },
    ...(req.query.communityId != null && String(req.query.communityId).trim() !== ""
      ? (() => {
          const parsed = z.string().uuid().safeParse(req.query.communityId);
          if (!parsed.success) {
            throw badRequest("communityId must be a valid UUID", undefined, "VALIDATION_ERROR");
          }
          return { communityId: parsed.data };
        })()
      : {}),
  };

  const shares = await prisma.materialShare.findMany({
    where: {
      channel: channelWhere,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      channel: {
        include: {
          community: { select: { id: true, name: true } },
        },
      },
    },
  });

  const quizIds = [...new Set(shares.filter((s) => s.materialType === "quiz").map((s) => s.materialId))];
  const setIds = [...new Set(shares.filter((s) => s.materialType === "flashcard_set").map((s) => s.materialId))];
  const summaryIds = [...new Set(shares.filter((s) => s.materialType === "summary").map((s) => s.materialId))];
  const mindMapIds = [...new Set(shares.filter((s) => s.materialType === "mind_map").map((s) => s.materialId))];

  const [quizzes, sets, summaries, mindMaps] = await Promise.all([
    quizIds.length
      ? prisma.quiz.findMany({
          where: { id: { in: quizIds } },
          select: { id: true, title: true, userId: true },
        })
      : [],
    setIds.length
      ? prisma.flashcardSet.findMany({
          where: { id: { in: setIds } },
          select: { id: true, title: true, userId: true },
        })
      : [],
    summaryIds.length
      ? prisma.summary.findMany({
          where: { id: { in: summaryIds } },
          select: { id: true, summaryText: true, userId: true },
        })
      : [],
    mindMapIds.length
      ? prisma.mindMap.findMany({
          where: { id: { in: mindMapIds } },
          select: { id: true, title: true, userId: true },
        })
      : [],
  ]);

  const quizMap = Object.fromEntries(quizzes.map((q) => [q.id, q]));
  const setMap = Object.fromEntries(sets.map((s) => [s.id, s]));
  const summaryMap = Object.fromEntries(
    summaries.map((x) => {
      const t = x.summaryText || "";
      const materialTitle = t.length > 100 ? `${t.slice(0, 97)}…` : t || null;
      return [x.id, { userId: x.userId, materialTitle }];
    })
  );
  const mindMapMap = Object.fromEntries(mindMaps.map((m) => [m.id, { userId: m.userId, materialTitle: m.title }]));

  const data = shares.map((s) => {
    let materialTitle = null;
    let ownerUserId = null;
    if (s.materialType === "quiz") {
      const m = quizMap[s.materialId];
      materialTitle = m?.title ?? null;
      ownerUserId = m?.userId ?? null;
    } else if (s.materialType === "flashcard_set") {
      const m = setMap[s.materialId];
      materialTitle = m?.title ?? null;
      ownerUserId = m?.userId ?? null;
    } else if (s.materialType === "summary") {
      const m = summaryMap[s.materialId];
      materialTitle = m?.materialTitle ?? null;
      ownerUserId = m?.userId ?? null;
    } else if (s.materialType === "mind_map") {
      const m = mindMapMap[s.materialId];
      materialTitle = m?.materialTitle ?? null;
      ownerUserId = m?.userId ?? null;
    }
    return {
      ...s,
      materialTitle,
      ownerUserId,
    };
  });

  res.apiSuccess(data, "OK", 200);
});
