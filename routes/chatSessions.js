const express = require("express");
const c = require("../controllers/chatSessionController");
const { validate } = require("../middleware/validateRequest");
const { chatSessionTitleUpdateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/timeline", c.timeline);
router.get("/:id/messages", c.listMessages);
router.post("/:id/messages", c.createMessage);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", validate(chatSessionTitleUpdateSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
