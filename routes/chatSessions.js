const express = require("express");
const c = require("../controllers/chatSessionController");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/messages", c.listMessages);
router.post("/:id/messages", c.createMessage);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
