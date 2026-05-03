const express = require("express");
const c = require("../controllers/aiToolController");

const router = express.Router();

router.get("/", c.list);
router.get("/:id/activity", c.listActivity);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
