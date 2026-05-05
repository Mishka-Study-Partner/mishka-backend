const express = require("express");
const c = require("../controllers/savedQuizController");
const { validate } = require("../middleware/validateRequest");
const {
  savedQuizAddSchema,
  savedQuizImportFromSharedSchema,
  savedMaterialShareToChannelsSchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/import-shared", validate(savedQuizImportFromSharedSchema), c.importFromShared);
router.post("/", validate(savedQuizAddSchema), c.add);
router.delete("/:id", c.remove);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.share);

module.exports = router;
