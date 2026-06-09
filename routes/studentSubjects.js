const express = require("express");
const c = require("../controllers/studentSubjectController");
const { validate } = require("../middleware/validateRequest");
const {
  studentSubjectCreateSchema,
  studentSubjectUpdateSchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/", c.list);
router.post("/", validate(studentSubjectCreateSchema), c.create);
router.patch("/:id", validate(studentSubjectUpdateSchema), c.update);
router.delete("/:id", c.remove);

module.exports = router;
