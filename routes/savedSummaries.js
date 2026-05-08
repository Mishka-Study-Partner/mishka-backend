const express = require("express");
const c = require("../controllers/savedSummaryController");
const { validate } = require("../middleware/validateRequest");
const {
  savedSummaryAddSchema,
  savedSummaryImportFromSharedSchema,
  savedMaterialShareToChannelsSchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/import-shared", validate(savedSummaryImportFromSharedSchema), c.importFromShared);
router.post("/", validate(savedSummaryAddSchema), c.add);
router.get("/:id", c.get);
router.delete("/:id", c.remove);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.share);

module.exports = router;
