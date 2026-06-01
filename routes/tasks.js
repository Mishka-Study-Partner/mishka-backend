const express = require("express");
const c = require("../controllers/taskController");
const { validate } = require("../middleware/validateRequest");
const { taskListQuerySchema, taskCompletionsReportQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", validate(taskListQuerySchema, "query"), c.list);
router.get("/report/completions", validate(taskCompletionsReportQuerySchema, "query"), c.reportCompletions);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
