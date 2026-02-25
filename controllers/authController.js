// controllers/authController.js
const User = require("../models/User");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ============= EMAIL TRANSPORTER SETUP (OPTIMIZED FOR SPEED) =============
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
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email server ready to send messages");
  }
});

// ============= HELPER FUNCTIONS =============
const createInitialColumns = async (boardId, defaultColumns) => {
  console.log("🛠 Creating initial columns for board:", boardId);
  const columnDocs = defaultColumns.map((col, index) => ({
    title: col.title,
    board: boardId,
    position: index,
  }));
  const columns = await Column.insertMany(columnDocs);
  console.log(
    "✅ Columns created:",
    columns.map((c) => c._id),
  );
  return columns.map((col) => col._id);
};

const getPopulatedBoardsForUser = async (userId) => {
  console.log("🛠 Fetching populated boards for user:", userId);
  const boards = await Board.find({ owner: userId })
    .populate("owner", "name email")
    .sort("-lastActivity")
    .lean();

  const populatedBoards = await Promise.all(
    boards.map(async (board) => {
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
  console.log("✅ Boards fetched for user:", userId);
  return populatedBoards;
};

// ============= SEND EMAIL FUNCTION =============
const sendEmail = async (to, subject, html) => {
  console.log("📧 Sending email to:", to, "Subject:", subject);
  try {
    const info = await transporter.sendMail({
      from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
};

// ============= TEST FUNCTIONS =============
const test = (req, res) => {
  console.log("🔹 Test API called");
  res.send("API is working!");
};

const createTestUser = async (req, res) => {
  console.log("🔹 createTestUser called");
  try {
    const user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("123456", 10),
    });
    console.log("✅ Test user created:", user._id);
    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ createTestUser error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============= REGISTER =============
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
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
      name: "Getting Started",
      color: "#0079BF",
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
    const { email, password } = req.body;
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

    // Generate OTP (do NOT log OTP itself)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000;
    await user.save();

    const emailSent = await sendEmail(
      email,
      "🔐 Password Reset OTP - Trello Clone",
      `<p>Your OTP has been sent.</p>`,
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

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ success: false, message: "No OTP found" });

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

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ success: false, message: "No OTP found" });
    if (Date.now() > user.otpExpiry)
      return res.status(400).json({ success: false, message: "OTP expired" });
    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log("✅ Password reset successful for user:", email);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

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
