const express = require("express");
const c = require("../controllers/chatMessageController");
const { validate } = require("../middleware/validateRequest");
const { chatMessageUpdateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", validate(chatMessageUpdateSchema), c.update);
router.patch("/:id", validate(chatMessageUpdateSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
