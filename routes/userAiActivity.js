const express = require("express");
const c = require("../controllers/userAiActivityController");
const { validate } = require("../middleware/validateRequest");
const { aiUsageReportQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.get("/report", validate(aiUsageReportQuerySchema, "query"), c.report);
router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
