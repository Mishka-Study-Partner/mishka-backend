const express = require("express");
const c = require("../controllers/userController");
const { validate } = require("../middleware/validateRequest");
const { updateUserSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/", c.create);

router.get("/:id/todo-lists", c.listTodoLists);
router.get("/:id/tasks", c.listTasks);
router.get("/:id/chat-sessions", c.listChatSessions);
router.get("/:id/flashcard-sets", c.listFlashcardSets);
router.get("/:id/quizzes", c.listQuizzes);
router.get("/:id/summaries", c.listSummaries);
router.get("/:id/history-items", c.listHistoryItems);
router.get("/:id/streaks", c.listUserStreaks);
router.get("/:id/study-sessions", c.listStudySessions);
router.get("/:id/communities", c.listUserCommunities);
router.get("/:id/saved-categories", c.listSavedCategories);
router.get("/:id/ai-requests", c.listAiRequests);
router.get("/:id/ai-activity", c.listUserAiActivity);
router.get("/:id/preferences", c.getPreference);
router.put("/:id/preferences", c.upsertPreference);

router.post("/:id/communities", c.attachCommunity);
router.delete("/:id/communities/:communityId", c.detachCommunity);

router.post("/:id/saved-categories", c.saveCategory);
router.delete("/:id/saved-categories/:categoryId", c.unsaveCategory);

router.get("/:id", c.getById);
router.put("/:id", validate(updateUserSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
