const express = require("express");
const c = require("../controllers/quizController");
const { validate } = require("../middleware/validateRequest");
const { savedMaterialShareToChannelsSchema, quizSubmitSchema, quizCreateSchema, quizUpdateSchema, quizQuestionNestedCreateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/questions", c.listQuestions);
router.post("/:id/questions", validate(quizQuestionNestedCreateSchema), c.createQuestion);
router.post("/:id/submit", validate(quizSubmitSchema), c.submit);
router.get("/:id/attempts", c.listMyAttempts);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.shareToChannels);
router.get("/:id", c.getById);
router.post("/", validate(quizCreateSchema), c.create);
router.put("/:id", validate(quizUpdateSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
