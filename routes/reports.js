const express = require("express");
const c = require("../controllers/yourReportController");
const { validate } = require("../middleware/validateRequest");
const { yourReportExportSchema, yourReportQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.get("/your-report", validate(yourReportQuerySchema, "query"), c.getReport);
router.post("/your-report/export", validate(yourReportExportSchema), c.exportReport);

module.exports = router;
