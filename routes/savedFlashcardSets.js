const express = require("express");
const c = require("../controllers/savedFlashcardSetController");
const { validate } = require("../middleware/validateRequest");
const {
  savedFlashcardSetAddSchema,
  savedFlashcardSetImportFromSharedSchema,
  savedMaterialShareToChannelsSchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/import-shared", validate(savedFlashcardSetImportFromSharedSchema), c.importFromShared);
router.post("/", validate(savedFlashcardSetAddSchema), c.add);
router.delete("/:id", c.remove);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.share);

module.exports = router;
