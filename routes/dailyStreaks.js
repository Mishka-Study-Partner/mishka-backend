const express = require("express");
const { validate } = require("../middleware/validateRequest");
const c = require("../controllers/dailyStreakController");
const { dailyStreakFreezeSchema, dailyStreakPingSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", c.getSummary);
router.post("/ping", validate(dailyStreakPingSchema), c.ping);
router.post("/freeze", validate(dailyStreakFreezeSchema), c.freeze);

module.exports = router;
