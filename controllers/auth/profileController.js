// controllers/auth/profileController.js
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

// ============= PROFILE FUNCTIONS =============
const getProfile = async (req, res) => {
  try {
    console.log("🔥 getProfile called for user:", req.user.id);
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry",
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ getProfile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log("🔥 updateProfile called for user:", req.user.id);
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true },
    ).select("-password -otp -otpExpiry");
    res.json({ success: true, user, message: "Profile updated successfully" });
  } catch (error) {
    console.error("❌ updateProfile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    console.log("🔥 changePassword called for user:", req.user.id);
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log("✅ Password changed successfully for user:", req.user.id);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("❌ changePassword error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getProfile, updateProfile, changePassword };
