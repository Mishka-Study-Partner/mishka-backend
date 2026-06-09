const express = require("express");
const c = require("../controllers/communityController");
const discover = require("../controllers/communityDiscoverController");
const msg = require("../controllers/communityChannelMessageController");
const { validate } = require("../middleware/validateRequest");
const {
  communityChannelCreateSchema,
  communityChannelUpdateSchema,
  communityChannelDuplicateSchema,
  communityCreateSchema,
  communityJoinSchema,
  communityLeaveSchema,
  communityUpdateSchema,
  communityRecommendedQuerySchema,
  communityDiscoverQuerySchema,
  communityDiscoverCategoriesQuerySchema,
  communityCategoryTitlesQuerySchema,
  communityInviteMemberSchema,
  communityAddMemberSchema,
  communityMemberRoleSchema,
  communityChannelMessageCreateSchema,
  communityActivityReportQuerySchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/activity/report", validate(communityActivityReportQuerySchema, "query"), c.activityReport);

router.get("/recommended", validate(communityRecommendedQuerySchema, "query"), discover.recommended);
router.get("/discover/categories", validate(communityDiscoverCategoriesQuerySchema, "query"), discover.categories);
router.get("/category-titles", validate(communityCategoryTitlesQuerySchema, "query"), discover.categoryTitles);
router.get("/discover", validate(communityDiscoverQuerySchema, "query"), discover.discover);

router.post("/join", validate(communityJoinSchema), c.join);
router.get("/", c.list);
router.post("/", validate(communityCreateSchema), c.create);

router.post("/:id/leave", validate(communityLeaveSchema), c.leave);
router.post("/:id/pin", c.pin);
router.delete("/:id/pin", c.unpin);
router.get("/:id/invite", c.getInvite);
router.post("/:id/invite", validate(communityInviteMemberSchema), c.inviteMember);
router.post("/:id/invite/regenerate", c.regenerateInvite);

router.get("/:id/members", c.listMembers);
router.post("/:id/members", validate(communityAddMemberSchema), c.addMemberByEmail);
router.patch("/:id/members/:userId", validate(communityMemberRoleSchema), c.patchMemberRole);
router.delete("/:id/members/:userId", c.removeMember);

router.get("/:id/channels", c.listChannels);
router.post("/:id/channels", validate(communityChannelCreateSchema), c.createChannel);
router.put("/:id/channels/:channelId", validate(communityChannelUpdateSchema), c.updateChannel);
router.delete("/:id/channels/:channelId", c.deleteChannel);
router.post("/:id/channels/:channelId/join", c.joinChannel);
router.delete("/:id/channels/:channelId/join", c.leaveChannel);
router.post("/:id/channels/:channelId/duplicate", validate(communityChannelDuplicateSchema), c.duplicateChannel);
router.delete("/:id/channels/:channelId/messages", msg.clearAll);
router.get("/:id/channels/:channelId/messages", msg.list);
router.post("/:id/channels/:channelId/messages", validate(communityChannelMessageCreateSchema), msg.create);

router.get("/:id", c.getById);
router.put("/:id", validate(communityUpdateSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
