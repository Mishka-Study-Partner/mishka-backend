const express = require("express");
const c = require("../controllers/userController");
const { validate } = require("../middleware/validateRequest");
const { updateUserSchema, todoListQuerySchema, taskListQuerySchema } = require("../validation/schemas");
const { requireAdmin, requireSelfOrAdmin } = require("../middleware/authorize");

const router = express.Router();

const selfOrAdmin = requireSelfOrAdmin("id");

router.get("/", requireAdmin, c.list);
router.post("/", requireAdmin, c.create);

router.get("/:id/todo-lists", selfOrAdmin, validate(todoListQuerySchema, "query"), c.listTodoLists);
router.get("/:id/tasks", selfOrAdmin, validate(taskListQuerySchema, "query"), c.listTasks);
router.get("/:id/chat-sessions", selfOrAdmin, c.listChatSessions);
router.get("/:id/flashcard-sets", selfOrAdmin, c.listFlashcardSets);
router.get("/:id/quizzes", selfOrAdmin, c.listQuizzes);
router.get("/:id/summaries", selfOrAdmin, c.listSummaries);
router.get("/:id/history-items", selfOrAdmin, c.listHistoryItems);
router.get("/:id/streaks", selfOrAdmin, c.listUserStreaks);
router.get("/:id/communities", selfOrAdmin, c.listUserCommunities);
router.get("/:id/saved-categories", selfOrAdmin, c.listSavedCategories);
router.get("/:id/ai-requests", selfOrAdmin, c.listAiRequests);
router.get("/:id/ai-activity", selfOrAdmin, c.listUserAiActivity);
router.get("/:id/preferences", selfOrAdmin, c.getPreference);
router.put("/:id/preferences", selfOrAdmin, c.upsertPreference);

router.post("/:id/communities", selfOrAdmin, c.attachCommunity);
router.delete("/:id/communities/:communityId", selfOrAdmin, c.detachCommunity);

router.post("/:id/saved-categories", selfOrAdmin, c.saveCategory);
router.delete("/:id/saved-categories/:categoryId", selfOrAdmin, c.unsaveCategory);

router.get("/:id", selfOrAdmin, c.getById);
router.put("/:id", selfOrAdmin, validate(updateUserSchema), c.update);
router.delete("/:id", selfOrAdmin, c.remove);

module.exports = router;
