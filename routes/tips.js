const express = require("express");
const c = require("../controllers/tipController");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", requireAdmin, c.create);
router.put("/:id", requireAdmin, c.update);
router.delete("/:id", requireAdmin, c.remove);

module.exports = router;
