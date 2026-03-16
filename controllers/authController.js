const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

// OTP store (simple in-memory, production mein Redis use karo)
const otpStore = {};

//===================================
// ------------------ REGISTER ------------------
//===================================
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender || null,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//===================================
// ------------------ LOGIN ------------------
//===================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender || null,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//===================================
// ------------------ LOGOUT ------------------
//===================================
const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//===================================
// ------------------ UPDATE PROFILE ------------------
//===================================
const updateProfile = async (req, res) => {
  try {
    const { name, gender, profilePicture } = req.body;
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, gender, profilePicture },
      { new: true, runValidators: true }
    );

    if (!updatedUser)
      return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        gender: updatedUser.gender || null,
        profilePicture: updatedUser.profilePicture || null,
      },
    });
  } catch (err) {
    console.error("UpdateProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//===================================
// ------------------ FORGOT PASSWORD ------------------
//===================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No user found with this email" });

    // 6-digit OTP generate karo
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 min expiry

    // TODO: Yahan nodemailer se OTP email karo
    console.log(`OTP for ${email}: ${otp}`);

    return res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("ForgotPassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//===================================
// ------------------ VERIFY OTP ------------------
//===================================
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP are required" });

    const record = otpStore[email];
    if (!record)
      return res.status(400).json({ success: false, message: "OTP not found. Please request again." });

    if (Date.now() > record.expiresAt)
      return res.status(400).json({ success: false, message: "OTP has expired" });

    if (record.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    return res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("VerifyOTP error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//===================================
// ------------------ RESET PASSWORD ------------------
//===================================
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const record = otpStore[email];
    if (!record)
      return res.status(400).json({ success: false, message: "OTP not found. Please request again." });

    if (Date.now() > record.expiresAt)
      return res.status(400).json({ success: false, message: "OTP has expired" });

    if (record.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    // OTP use hone ke baad delete karo
    delete otpStore[email];

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("ResetPassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  logout,
  updateProfile,
  forgotPassword,
  verifyOTP,
  resetPassword,
};