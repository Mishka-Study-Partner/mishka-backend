const express = require("express");
const c = require("../controllers/savedMindMapController");
const { validate } = require("../middleware/validateRequest");
const {
  savedMindMapAddSchema,
  savedMindMapImportFromSharedSchema,
  savedMaterialShareToChannelsSchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/import-shared", validate(savedMindMapImportFromSharedSchema), c.importFromShared);
router.post("/", validate(savedMindMapAddSchema), c.add);
router.get("/:id", c.get);
router.delete("/:id", c.remove);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.share);

module.exports = router;
