// controllers/auth/authHandlers.js
const User = require("../../models/User");
const Board = require("../../models/Board");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  createInitialColumns,
  getPopulatedBoardsForUser,
} = require("./helpers");
const { sendEmail } = require("./emailService");

// ============= REGISTER =============
const register = async (req, res) => {
  try {
    const { name, email, password, boardName, boardColor } = req.body;
    console.log("🔥 Register API called for email:", email);

    if (!name || !email || !password) {
      console.log("⚠ Missing fields for registration");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("⚠ Email already in use:", email);
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    console.log("✅ User created with ID:", user._id);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const userResponse = user.toObject({ getters: true, virtuals: true });
    delete userResponse.password;

    const defaultColumnsData = [
      { title: "To Do", position: 0 },
      { title: "In Progress", position: 1 },
      { title: "Done", position: 2 },
      { title: "Another Column", position: 3 },
    ];

    const board = await Board.create({
      name: boardName || "Getting Started",
      color: boardColor || "#0079BF",
      description: "Your first board with 4 columns!",
      isPublic: false,
      owner: user._id,
    });

    const columnIds = await createInitialColumns(board._id, defaultColumnsData);
    board.columnOrder = columnIds;
    await board.save();

    await User.findByIdAndUpdate(user._id, { $push: { boards: board._id } });

    const boardsData = await getPopulatedBoardsForUser(user._id);

    console.log("✅ Registration completed for:", email);

    res.status(201).json({
      success: true,
      user: userResponse,
      boards: boardsData,
      message: "Registration successful! Your board is ready with 4 columns.",
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
};

// ============= LOGIN =============
const login = async (req, res) => {
  try {
    const { email, password, boardName, boardColor } = req.body;
    console.log("🔥 Login API called for email:", email);

    if (!email || !password) {
      console.log("⚠ Missing email or password for login");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("⚠ User not found:", email);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("⚠ Invalid credentials for user:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const userResponse = await User.findById(user._id).select(
      "-password -otp -otpExpiry",
    );

    let boardsData = await getPopulatedBoardsForUser(user._id);

    if (boardsData.length === 0) {
      console.log(
        "⚠ No boards found, creating default board for user:",
        user._id,
      );
      const defaultColumnsData = [
        { title: "To Do", position: 0 },
        { title: "In Progress", position: 1 },
        { title: "Done", position: 2 },
        { title: "Another Column", position: 3 },
      ];

      const board = await Board.create({
        name: boardName || "Getting Started",
        color: boardColor || "#0079BF",
        description: "Your first board with 4 columns!",
        isPublic: false,
        owner: user._id,
      });

      const columnIds = await createInitialColumns(
        board._id,
        defaultColumnsData,
      );
      board.columnOrder = columnIds;
      await board.save();
      await User.findByIdAndUpdate(user._id, { $push: { boards: board._id } });

      boardsData = await getPopulatedBoardsForUser(user._id);
    }

    console.log("✅ User logged in:", email);

    res.json({
      success: true,
      user: userResponse,
      boards: boardsData,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
};

// ============= LOGOUT =============
const logout = (req, res) => {
  console.log("🔹 Logout called for user:", req.user?.id);
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
};

// ============= FORGOT PASSWORD =============
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("🔥 forgotPassword called for email:", email);

    if (!email) {
      console.log("⚠ Missing email for forgotPassword");
      return res
        .status(400)
        .json({ success: false, message: "Please provide email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("⚠ User not found for forgotPassword:", email);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🔑 OTP generated for user:", email);

    // ✅ FIX: Use resetOTP field to match User model
    user.resetOTP = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
    await user.save();

    // ✅ FIX: Include actual OTP in the email HTML
    const emailSent = await sendEmail(
      email,
      "🔐 Password Reset OTP - Trello Clone",
      `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 2px solid #0052CC; border-radius: 10px;">
        <h2 style="color: #0052CC;">🔒 Password Reset OTP</h2>
        <p>Aapka OTP code yeh hai:</p>
        <div style="background: #f0f4ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #0052CC; font-size: 40px; letter-spacing: 10px; margin: 0;">${otp}</h1>
        </div>
        <p>⏰ Yeh OTP sirf <strong>2 minutes</strong> ke liye valid hai.</p>
        <p style="color: #999; font-size: 12px;">Agar aapne request nahi ki toh ignore karein.</p>
      </div>
      `,
    );

    if (!emailSent) {
      console.log("❌ Email sending failed for forgotPassword:", email);
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email." });
    }

    console.log("✅ OTP email sent successfully to:", email);
    res.json({
      success: true,
      message: "OTP sent to your email.",
      expiresIn: "2 minutes",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============= VERIFY OTP =============
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("🔥 verifyOTP called for email:", email);

    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Please provide email and OTP" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // ✅ FIX: Check resetOTP field to match User model
    if (!user.resetOTP || !user.otpExpiry)
      return res.status(400).json({ success: false, message: "No OTP found" });

    if (Date.now() > user.otpExpiry) {
      user.resetOTP = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    // ✅ FIX: Compare resetOTP field
    if (user.resetOTP !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    console.log("✅ OTP verified for user:", email);
    res.json({ success: true, message: "OTP verified successfully!" });
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============= RESET PASSWORD =============
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    console.log("🔥 resetPassword called for email:", email);

    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ success: false, message: "Password too short" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // ✅ FIX: Use resetOTP field to match User model
    if (!user.resetOTP || !user.otpExpiry)
      return res.status(400).json({ success: false, message: "No OTP found" });
    if (Date.now() > user.otpExpiry)
      return res.status(400).json({ success: false, message: "OTP expired" });
    if (user.resetOTP !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log("✅ Password reset successful for user:", email);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
};