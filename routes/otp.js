const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

// Enhanced Logging Middleware
const logRequest = (req, res, next) => {
  console.log("=======================================");
  console.log(`Incoming OTP Request: ${req.method} ${req.originalUrl}`);
  console.log("Body:", req.body);
  console.log("Query:", req.query);

  // Capture JSON response
  const originalJson = res.json;
  res.json = function (data) {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", data);
    console.log("=======================================");
    return originalJson.call(this, data);
  };

  // Log error responses
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      console.error("Error Response Status:", res.statusCode);
      console.log("=======================================");
    }
  });

  next();
};

// OTP Routes
router.post("/send", logRequest, otpController.sendOTP);
router.post("/verify", logRequest, otpController.verifyOTP);

module.exports = router;
