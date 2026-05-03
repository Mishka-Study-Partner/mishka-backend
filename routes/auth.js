const express = require("express");
const c = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validateRequest");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validation/schemas");

const router = express.Router();

router.post("/register", validate(registerSchema), c.register);
router.post("/login", validate(loginSchema), c.login);
router.get("/me", requireAuth, c.me);
router.post("/forgot-password", validate(forgotPasswordSchema), c.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), c.resetPassword);

module.exports = router;
