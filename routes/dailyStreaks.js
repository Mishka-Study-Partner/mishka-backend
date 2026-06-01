const express = require("express");
const { validate } = require("../middleware/validateRequest");
const c = require("../controllers/dailyStreakController");
const {
  dailyStreakFreezeSchema,
  dailyStreakPingSchema,
  dailyStreakHistoryQuerySchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/history", validate(dailyStreakHistoryQuerySchema, "query"), c.getHistory);
router.get("/", c.getSummary);
router.post("/ping", validate(dailyStreakPingSchema), c.ping);
router.post("/freeze", validate(dailyStreakFreezeSchema), c.freeze);

module.exports = router;
