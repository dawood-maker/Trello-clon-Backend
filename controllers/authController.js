// controllers/authController.js
const User = require("../models/User");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// =================================
// ============= EMAIL TRANSPORTER SETUP =============
// =================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email server ready to send messages");
  }
});

// =================================
// ============= HELPER FUNCTIONS =============
// =================================

const createInitialColumns = async (boardId, defaultColumns) => {
  console.log("Creating initial columns for board:", boardId);
  const columnDocs = defaultColumns.map((col, index) => ({
    title: col.title,
    board: boardId,
    position: index,
  }));
  const columns = await Column.insertMany(columnDocs);
  console.log(
    "Columns created:",
    columns.map((c) => c.title),
  );
  return columns.map((col) => col._id);
};

const getPopulatedBoardsForUser = async (userId) => {
  console.log("Fetching boards for user:", userId);
  const boards = await Board.find({ owner: userId })
    .populate("owner", "name email")
    .sort("-lastActivity")
    .lean();

  const populatedBoards = await Promise.all(
    boards.map(async (board) => {
      console.log("Processing board:", board.name);
      const columns = await Column.find({
        _id: { $in: board.columnOrder },
      }).lean();
      const columnsWithCards = await Promise.all(
        columns.map(async (column) => {
          const cards = await Card.find({ column: column._id })
            .sort("position")
            .lean();
          return { ...column, cards };
        }),
      );
      const sortedColumns = board.columnOrder
        .map((colId) => columnsWithCards.find((col) => col._id.equals(colId)))
        .filter((col) => col);
      return { ...board, columns: sortedColumns };
    }),
  );
  console.log("Boards fetched for user:", populatedBoards.length);
  return populatedBoards;
};

const sendEmail = async (to, subject, html) => {
  console.log(`Sending email to ${to} with subject: ${subject}`);
  try {
    const info = await transporter.sendMail({
      from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};

// =================================
// ============= TEST FUNCTIONS =============
// =================================
const test = (req, res) => {
  console.log("Test API called");
  res.send("API is working!");
};

const createTestUser = async (req, res) => {
  console.log("Creating test user");
  try {
    const user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("123456", 10),
    });
    console.log("Test user created:", user.email);
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error creating test user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= REGISTER =============
// =================================
const register = async (req, res) => {
  console.log("Register API called with body:", req.body);
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log("Validation failed: missing fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already in use:", email);
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    console.log("New user created:", email);

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
      name: "Getting Started",
      color: "#0079BF",
      description: "Your first board with 4 columns!",
      isPublic: false,
      owner: user._id,
    });
    console.log("Default board created:", board.name);

    const columnIds = await createInitialColumns(board._id, defaultColumnsData);
    board.columnOrder = columnIds;
    await board.save();

    await User.findByIdAndUpdate(user._id, { $push: { boards: board._id } });

    const boardsData = await getPopulatedBoardsForUser(user._id);

    console.log("User registration completed:", email);

    res.status(201).json({
      success: true,
      user: userResponse,
      boards: boardsData,
      message: "Registration successful! Your board is ready with 4 columns.",
    });
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
};

// =================================
// ============= LOGIN =============
// =================================
const login = async (req, res) => {
  console.log("Login API called with body:", req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Validation failed: missing email or password");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Invalid credentials for user:", email);
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
      console.log("No boards found for user. Creating default board...");
      const defaultColumnsData = [
        { title: "To Do", position: 0 },
        { title: "In Progress", position: 1 },
        { title: "Done", position: 2 },
        { title: "Another Column", position: 3 },
      ];

      const board = await Board.create({
        name: "Getting Started",
        color: "#0079BF",
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

    console.log("User logged in successfully:", email);

    res.json({
      success: true,
      user: userResponse,
      boards: boardsData,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
};

// =================================
// ============= LOGOUT =============
// =================================
const logout = (req, res) => {
  console.log("Logout API called for user:", req.user?.id);
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
};

// =================================
// ============= FORGOT PASSWORD =============
// =================================
const forgotPassword = async (req, res) => {
  console.log("Forgot password API called with body:", req.body);
  try {
    const { email } = req.body;

    if (!email) {
      console.log("Validation failed: no email provided");
      return res.status(400).json({
        success: false,
        message: "Please provide email",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for forgot password:", email);
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
    await user.save();
    console.log("OTP generated for user:", email, "OTP:", otp);

    const emailSent = await sendEmail(
      email,
      "🔐 Password Reset OTP - Trello Clone",
      `...`, // email HTML omitted for brevity
    );

    if (!emailSent) {
      console.log("Failed to send OTP email to:", email);
      return res.status(500).json({
        success: false,
        message: "Failed to send email. Please try again.",
      });
    }

    console.log("OTP sent to:", email);
    res.json({
      success: true,
      message: "OTP sent to your email. Check your inbox!",
      email: email,
      expiresIn: "2 minutes",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= VERIFY OTP =============
// =================================
const verifyOTP = async (req, res) => {
  console.log("Verify OTP API called with body:", req.body);
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide email and OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No OTP found. Please request a new one.",
        });
    }

    if (Date.now() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res
        .status(400)
        .json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
    }

    if (user.otp !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });
    }

    console.log("OTP verified for user:", email);
    res.json({
      success: true,
      message: "OTP verified successfully! You can now reset your password.",
      email: email,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= RESET PASSWORD =============
// =================================
const resetPassword = async (req, res) => {
  console.log("Reset password API called with body:", req.body);
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required fields",
        });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (!user.otp || !user.otpExpiry)
      return res
        .status(400)
        .json({
          success: false,
          message: "No OTP found. Please request a new one.",
        });
    if (Date.now() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }
    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log("Password reset successful for user:", email);
    res.json({
      success: true,
      message:
        "Password reset successfully! You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= PROFILE FUNCTIONS =============
// =================================
const getProfile = async (req, res) => {
  console.log("Get profile called for user:", req.user?.id);
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry",
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  console.log(
    "Update profile called for user:",
    req.user?.id,
    "with body:",
    req.body,
  );
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true },
    ).select("-password -otp -otpExpiry");
    res.json({ success: true, user, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  console.log("Change password called for user:", req.user?.id);
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log("Current password incorrect for user:", req.user?.id);
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log("Password changed successfully for user:", req.user?.id);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= EXPORTS =============
// =================================
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
