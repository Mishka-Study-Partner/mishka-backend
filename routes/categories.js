const express = require("express");
const c = require("../controllers/categoryController");
const { requireAdmin } = require("../middleware/authorize");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/saved-by-users", c.listSavedByUsers);
router.get("/:id", c.getById);
router.post("/", requireAdmin, c.create);
router.put("/:id", requireAdmin, c.update);
router.delete("/:id", requireAdmin, c.remove);

module.exports = router;
