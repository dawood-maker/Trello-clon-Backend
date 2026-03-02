// controllers/authController.js
const { test, createTestUser }                              = require("./testController");
const { register, login, logout,
        forgotPassword, verifyOTP, resetPassword }          = require("./authHandlers");
const { getProfile, updateProfile, changePassword }         = require("./profileController");

// ============= EXPORTS =============
module.exports = {
  test,
  createTestUser,
  register,
  login,
  logout,
  verifyOTP,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
};