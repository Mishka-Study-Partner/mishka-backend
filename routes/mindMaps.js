const express = require("express");
const c = require("../controllers/mindMapController");
const { validate } = require("../middleware/validateRequest");
const { savedMaterialShareToChannelsSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/", c.create);
router.post("/:id/share", validate(savedMaterialShareToChannelsSchema), c.shareToChannels);
router.get("/:id", c.getById);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
