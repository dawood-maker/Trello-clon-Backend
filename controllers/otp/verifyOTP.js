// controllers/otp/verifyOTP.js
const User = require("../../models/User");

// ====================== VERIFY OTP ======================
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("🔥 verifyOTP called for email:", email);

    if (!email || !otp) {
      console.log("⚠ Email or OTP missing");
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log("⚠ User not found for email:", email);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check OTP
    if (user.otp !== otp) {
      console.log("⚠ Invalid OTP attempt for userId:", user._id);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (Date.now() > user.otpExpiry) {
      console.log("⚠ OTP expired for userId:", user._id);
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    console.log("✅ OTP verified successfully for userId:", user._id);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Verify OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = { verifyOTP };
