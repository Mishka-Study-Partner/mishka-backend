const express = require("express");
const c = require("../controllers/todoListController");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/tasks", c.listTasks);
router.post("/:id/tasks", c.createTask);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
