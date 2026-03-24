// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

//=================
// Public Routes
//=================
router.post("/register", (req, res, next) => {
  console.log("[Auth Router] POST /register called with body:", req.body);
  authController.register(req, res, next);
});

router.post("/login", (req, res, next) => {
  console.log("[Auth Router] POST /login called with body:", req.body);
  authController.login(req, res, next);
});

router.post("/forgot-password", (req, res, next) => {
  console.log("[Auth Router] POST /forgot-password called with body:", req.body);
  authController.forgotPassword(req, res, next);
});

router.post("/verify-otp", (req, res, next) => {
  console.log("[Auth Router] POST /verify-otp called with body:", req.body);
  authController.verifyOTP(req, res, next);
});

router.post("/reset-password", (req, res, next) => {
  console.log("[Auth Router] POST /reset-password called with body:", req.body);
  authController.resetPassword(req, res, next);
});

router.get("/test", (req, res, next) => {
  console.log("[Auth Router] GET /test called");
  authController.test(req, res, next);
});

//=================
// Protected Routes
//=================
router.get("/profile", auth, (req, res, next) => {
  console.log("[Auth Router] GET /profile called by userId:", req.user?.id);
  authController.getProfile(req, res, next);
});

// . Profile update karne ka route
router.put("/profile", auth, (req, res, next) => {
  console.log("[Auth Router] PUT /profile called by userId:", req.user?.id);
  authController.updateProfile(req, res, next);
});

router.post("/logout", (req, res, next) => {
  console.log("[Auth Router] POST /logout called");
  authController.logout(req, res, next);
});

module.exports = router;