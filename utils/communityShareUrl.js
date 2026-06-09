/**
 * Base URL for community share links in API responses (deep link or web).
 * @param {import("express").Request} [req]
 */
function communityShareBaseUrl(req) {
  if (process.env.COMMUNITY_SHARE_BASE_URL) {
    return process.env.COMMUNITY_SHARE_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.REPORT_EXPORT_BASE_URL) {
    return process.env.REPORT_EXPORT_BASE_URL.replace(/\/$/, "");
  }
  if (req) {
    const host = req.get("host");
    if (host) return `${req.protocol}://${host}`;
  }
  return "http://127.0.0.1:3000";
}

/**
 * @param {import("express").Request} [req]
 * @param {string} communityId
 * @param {"public"|"private"} visibility
 * @param {string | null} inviteCode
 * @param {string | null} inviteToken
 */
function buildCommunityInvitePayload(req, community, visibility, inviteCode, inviteToken) {
  const base = communityShareBaseUrl(req);
  const communityId = community.id;

  if (visibility === "public") {
    return {
      supported: true,
      visibility: "public",
      communityId,
      inviteCode: null,
      inviteToken: null,
      shareUrl: `${base}/communities/join?communityId=${encodeURIComponent(communityId)}`,
      joinPayload: { communityId },
      hint: "Public community: share communityId; recipients use POST /communities/join with { communityId }.",
    };
  }

  const tokenQ = inviteToken ? `inviteToken=${encodeURIComponent(inviteToken)}` : "";
  const codeQ = inviteCode ? `inviteCode=${encodeURIComponent(inviteCode)}` : "";
  const query = tokenQ || codeQ;
  return {
    supported: true,
    visibility: "private",
    communityId,
    inviteCode,
    inviteToken,
    shareUrl: query ? `${base}/communities/join?${query}` : null,
    joinPayload: inviteToken
      ? { inviteToken }
      : inviteCode
        ? { inviteCode }
        : { communityId },
    hint: "Private community: share inviteCode or inviteToken; do not expose in public listings.",
  };
}

module.exports = { communityShareBaseUrl, buildCommunityInvitePayload };
