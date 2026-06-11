/** Same secret as `middleware/auth.js` — used for API JWTs and report download tokens. */
function jwtSecret() {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

module.exports = { jwtSecret };
