const express = require("express");
const c = require("../controllers/flashcardController");
const { validate } = require("../middleware/validateRequest");
const { flashcardCreateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", validate(flashcardCreateSchema), c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
