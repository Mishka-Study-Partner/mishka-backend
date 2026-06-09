const express = require("express");
const c = require("../controllers/summaryController");
const { validate } = require("../middleware/validateRequest");
const { savedMaterialShareToChannelsSchema, summaryCreateSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/", validate(summaryCreateSchema), c.create);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.shareToChannels);
router.get("/:id", c.getById);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
