const express = require("express");
const c = require("../controllers/gamificationController");
const { validate } = require("../middleware/validateRequest");
const {
  gamificationDashboardQuerySchema,
  gamificationCollectSchema,
  gamificationMonthlyQuerySchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/dashboard", validate(gamificationDashboardQuerySchema, "query"), c.getDashboard);
router.post("/badges/collect", validate(gamificationCollectSchema), c.collectBadge);
router.get(
  "/sections/:section/monthly",
  validate(gamificationMonthlyQuerySchema, "query"),
  c.getSectionMonthly
);

module.exports = router;
