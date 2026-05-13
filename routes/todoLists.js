const express = require("express");
const c = require("../controllers/todoListController");
const { validate } = require("../middleware/validateRequest");
const { taskListQuerySchema, todoListQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", validate(todoListQuerySchema, "query"), c.list);
router.get("/:id/tasks", validate(taskListQuerySchema, "query"), c.listTasks);
router.post("/:id/tasks", c.createTask);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
