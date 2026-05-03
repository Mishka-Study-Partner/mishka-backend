const express = require("express");
const c = require("../controllers/quizController");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/questions", c.listQuestions);
router.post("/:id/questions", c.createQuestion);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
