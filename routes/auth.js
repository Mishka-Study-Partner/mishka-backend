const express = require("express");
const c = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validateRequest");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendSignupOtpSchema,
  oauthGoogleSchema,
  oauthAppleSchema,
  oauthFacebookSchema,
} = require("../validation/schemas");

const router = express.Router();

router.post("/send-signup-otp", validate(sendSignupOtpSchema), c.sendSignupOtp);
router.post("/register", validate(registerSchema), c.register);
router.post("/login", validate(loginSchema), c.login);
router.get("/me", requireAuth, c.me);
router.post("/logout", requireAuth, c.logout);
router.post("/forgot-password", validate(forgotPasswordSchema), c.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), c.resetPassword);
router.post("/oauth/google", validate(oauthGoogleSchema), c.oauthGoogle);
router.post("/oauth/apple", validate(oauthAppleSchema), c.oauthApple);
router.post("/oauth/facebook", validate(oauthFacebookSchema), c.oauthFacebook);

module.exports = router;
