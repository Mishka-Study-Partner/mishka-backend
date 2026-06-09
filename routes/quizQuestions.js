const express = require("express");
const c = require("../controllers/quizQuestionController");
const { validate } = require("../middleware/validateRequest");
const { quizQuestionCreateSchema, quizQuestionUpdateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", validate(quizQuestionCreateSchema), c.create);
router.put("/:id", validate(quizQuestionUpdateSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
