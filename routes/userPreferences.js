const express = require("express");
const c = require("../controllers/userPreferenceController");
const { validate } = require("../middleware/validateRequest");
const { userPreferenceReportEmailSchema } = require("../validation/schemas");

const router = express.Router();

router.get("/me", c.getMe);
router.patch("/me", validate(userPreferenceReportEmailSchema), c.patchMe);

router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
