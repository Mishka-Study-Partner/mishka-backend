const express = require("express");
const { validate } = require("../middleware/validateRequest");
const c = require("../controllers/usageController");
const { usageBatchSchema, usageSummaryQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.post("/batch", validate(usageBatchSchema), c.batch);
router.get("/summary", validate(usageSummaryQuerySchema, "query"), c.summary);

module.exports = router;
