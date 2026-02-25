// ====================== SEND OTP ======================
exports.sendOTP = async (req, res) => {
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log("⚠ No account found for email:", email);
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to user
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send email (your sendEmail function)
    const emailSent = await sendEmail(
      user.email,
      "Your Trello Clone OTP Code",
      `<div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f4f6f9; border-radius: 16px;">
        <h1 style="color: #0079BF; font-size: 28px;">Password Reset Request</h1>
        <div style="background: white; padding: 30px; border-radius: 12px; margin: 20px auto; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h2 style="font-size: 42px; letter-spacing: 12px; color: #0079BF; margin: 0;">
            ${otp}
          </h2>
          <p style="margin: 20px 0; color: #555; font-size: 16px;">
            This OTP is valid for <strong>10 minutes only</strong>
          </p>
        </div>
        <p style="color: #777; font-size: 14px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>`,
    );

    console.log(
      `✅ OTP ${emailSent ? "sent successfully" : "generated but email failed"} for userId: ${user._id}`,
    );

    res.json({
      success: true,
      message: emailSent
        ? "OTP sent to your email!"
        : "OTP generated (email failed)",
      // debugOtp: otp  // Keep commented out in production
    });
  } catch (error) {
    console.error("❌ Send OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ====================== VERIFY OTP ======================
exports.verifyOTP = async (req, res) => {
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
