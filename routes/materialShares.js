const express = require("express");
const c = require("../controllers/materialShareController");
const { validate } = require("../middleware/validateRequest");
const { materialShareBatchSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.listFeed);
router.post("/", validate(materialShareBatchSchema), c.createBatch);

module.exports = router;
