// controllers/otpController.js
const { sendOTP }   = require("./sendOTP");
const { verifyOTP } = require("./verifyOTP");

exports.sendOTP   = sendOTP;
exports.verifyOTP = verifyOTP;