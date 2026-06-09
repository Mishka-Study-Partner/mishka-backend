const express = require("express");
const c = require("../controllers/flashcardSetController");
const { validate } = require("../middleware/validateRequest");
const { savedMaterialShareToChannelsSchema, flashcardSetCreateSchema, flashcardNestedCreateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/flashcards", c.listFlashcards);
router.post("/:id/flashcards", validate(flashcardNestedCreateSchema), c.createFlashcard);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.shareToChannels);
router.get("/:id", c.getById);
router.post("/", validate(flashcardSetCreateSchema), c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
