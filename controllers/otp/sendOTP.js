const User = require("../../models/User");
const { sendOTPEmail } = require("../auth/emailService");

// ====================== SEND OTP ======================
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("🔥 sendOTP called for email:", email);

    if (!email) {
      console.log("⚠ Email not provided");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log("⚠ No account found for email:", email);
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.resetOTP = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // ✅ Send OTP email
    const emailSent = await sendOTPEmail(user.email, otp);

    console.log(
      `✅ OTP ${emailSent ? "sent successfully" : "generated but email failed"} for userId: ${user._id}`,
    );

    res.status(200).json({
      success: true,
      message: emailSent
        ? "OTP sent to your email!"
        : "OTP generated (email failed)",
      // debugOtp: otp // Uncomment only for testing
    });
  } catch (error) {
    console.error("❌ Send OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = { sendOTP };