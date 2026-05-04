const express = require("express");
const c = require("../controllers/passwordResetTokenController");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

router.use(requireAdmin);

router.get("/", c.list);
router.get("/by-user/:userId", c.listByUser);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
