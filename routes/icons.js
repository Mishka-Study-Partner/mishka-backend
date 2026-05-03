const express = require("express");
const c = require("../controllers/iconController");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/todo-lists", c.listTodoLists);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
