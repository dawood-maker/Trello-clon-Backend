const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

// Helper middleware to log requests
const logRequest = (req, res, next) => {
  console.log("====================================");
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  console.log("Body:", req.body);
  console.log("Query:", req.query);
  console.log("Params:", req.params);

  // Log response status
  const originalSend = res.send;
  res.send = function (body) {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", body);
    console.log("====================================");
    return originalSend.call(this, body);
  };

  next();
};

// =======================
// Public Routes
// =======================
router.post("/register", logRequest, authController.register);
router.post("/login", logRequest, authController.login);
router.post("/forgot-password", logRequest, authController.forgotPassword);
router.post("/verify-otp", logRequest, authController.verifyOTP);
router.post("/reset-password", logRequest, authController.resetPassword);
router.get("/test", logRequest, authController.test);

// =======================
// Protected Routes
// =======================
router.get("/profile", logRequest, auth, authController.getProfile);
router.post("/logout", logRequest, auth, authController.logout);

module.exports = router;
