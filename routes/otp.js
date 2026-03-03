const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

// @route   POST /send
router.post("/send", (req, res, next) => {
  console.log("[OTP Router] POST /send called with body:", req.body);
  otpController.sendOTP(req, res, next);
});

// @route   POST /verify
router.post("/verify", (req, res, next) => {
  console.log("[OTP Router] POST /verify called with body:", req.body);
  otpController.verifyOTP(req, res, next);
});

module.exports = router;
