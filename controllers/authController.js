// controllers/authController.js
const User = require("../models/User");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// =================================
// ============= EMAIL TRANSPORTER =============
// =================================
console.log("📧 Initializing Email Transporter...");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

transporter.verify((error) => {
  if (error) console.error(" Email transporter error:", error);
  else console.log(" Email server ready");
});

// =================================
// ============= HELPERS =============
// =================================
const createInitialColumns = async (boardId, userId) => {
  console.log("📊 Creating initial columns for board:", boardId);

  const defaultColumns = [
    { title: "To Do", position: 0 },
    { title: "In Progress", position: 1 },
    { title: "Done", position: 2 },
    { title: "Another Column", position: 3 },
  ];

  const columnDocs = defaultColumns.map((col) => ({
    title: col.title,
    board: boardId,
    position: col.position,
    owner: userId,
    createdBy: userId,
  }));

  const columns = await Column.insertMany(columnDocs);
  console.log(" Columns created:", columns.length);

  return columns.map((col) => col._id);
};

const getPopulatedBoardsForUser = async (userId) => {
  console.log("📦 Fetching boards for user:", userId);

  const boards = await Board.find({ owner: userId })
    .sort({ isPermanent: -1, lastActivity: -1 })
    .lean();

  console.log("🗂 Boards found:", boards.length);

  return await Promise.all(
    boards.map(async (board) => {
      console.log("➡️ Processing board:", board._id);

      const columns = await Column.find({
        _id: { $in: board.columnOrder },
      }).lean();

      const columnsWithCards = await Promise.all(
        columns.map(async (column) => {
          const cards = await Card.find({ column: column._id })
            .sort("position")
            .lean();
          console.log(`📝 Column ${column.title} has ${cards.length} cards`);
          return { ...column, cards };
        }),
      );

      const sortedColumns = board.columnOrder
        .map((colId) =>
          columnsWithCards.find(
            (col) => col._id.toString() === colId.toString(),
          ),
        )
        .filter(Boolean);

      return { ...board, columns: sortedColumns };
    }),
  );
};

const sendEmail = async (to, subject, html) => {
  console.log("📨 Sending email to:", to);
  try {
    await transporter.sendMail({
      from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(" Email sent successfully");
    return true;
  } catch (error) {
    console.error(" Email error:", error);
    return false;
  }
};

// =================================
// ============= TEST =============
// =================================
const test = (req, res) => {
  console.log("🧪 Test API hit");
  res.send("API is working!");
};

const createTestUser = async (req, res) => {
  console.log("🧪 Creating test user");
  try {
    const user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("123456", 10),
    });
    console.log(" Test user created");
    res.json({ success: true, user });
  } catch (error) {
    console.error(" Test user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= REGISTER =============
// =================================
const register = async (req, res) => {
  console.log("🔥 Register called:", req.body);

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log(" Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    console.log("🔎 Checking if user exists...");
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("⚠️ Email already in use:", email);
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("👤 Creating user...");
    const user = await User.create({ name, email, password: hashedPassword });

    console.log("🎟 Generating JWT token...");
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

    console.log("📌 Creating permanent board...");
    const board = await Board.create({
      name: "Getting Started",
      color: "#0079BF",
      description: "Your permanent board — always stays here!",
      isPublic: false,
      isPermanent: true,
      owner: user._id,
    });

    const columnIds = await createInitialColumns(board._id, user._id);
    board.columnOrder = columnIds;
    await board.save();

    console.log("🔗 Linking board to user...");
    await User.findByIdAndUpdate(user._id, { $push: { boards: board._id } });

    const boardsData = await getPopulatedBoardsForUser(user._id);

    console.log(" Registration complete:", email);

    res.status(201).json({
      success: true,
      user: userResponse,
      boards: boardsData,
      message: "Registration successful! Your permanent board is ready.",
    });
  } catch (error) {
    console.error(" Register error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
};

// =================================
// ============= LOGIN =============
// =================================
const login = async (req, res) => {
  console.log("🔥 Login called:", req.body);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log(" Missing email or password");
      return res
        .status(400)
        .json({ success: false, message: "Provide email and password" });
    }

    console.log("🔎 Finding user...");
    const user = await User.findOne({ email });

    if (!user) {
      console.log(" User not found:", email);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log("🔐 Comparing password...");
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log(" Invalid credentials for:", email);
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    console.log("🎟 Generating token...");
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

    console.log("📦 Fetching boards...");
    let boardsData = await getPopulatedBoardsForUser(user._id);

    if (boardsData.length === 0) {
      console.log("📌 No boards found. Creating permanent board...");
      const board = await Board.create({
        name: "Getting Started",
        color: "#0079BF",
        description: "Your permanent board!",
        isPublic: false,
        isPermanent: true,
        owner: user._id,
      });
      const columnIds = await createInitialColumns(board._id, user._id);
      board.columnOrder = columnIds;
      await board.save();
      await User.findByIdAndUpdate(user._id, { $push: { boards: board._id } });
      boardsData = await getPopulatedBoardsForUser(user._id);
    }

    console.log(" Login successful:", email);

    res.json({
      success: true,
      user: userResponse,
      boards: boardsData,
      message: "Logged in!",
    });
  } catch (error) {
    console.error(" Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
};

// =================================
// ============= LOGOUT =============
// =================================
const logout = (req, res) => {
  console.log("👋 Logout called");
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
};

// =================================
// ============= FORGOT PASSWORD =============
// =================================
const forgotPassword = async (req, res) => {
  console.log("🔐 Forgot password called:", req.body);

  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: "Provide email" });

    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    console.log("🔢 Generating OTP...");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000;
    await user.save();

    const emailSent = await sendEmail(
      email,
      "🔐 Password Reset OTP",
      `<p>Your OTP: <strong>${otp}</strong></p><p>Expires in 2 minutes.</p>`,
    );

    if (!emailSent)
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email" });

    console.log(" OTP sent to:", email);

    res.json({
      success: true,
      message: "OTP sent!",
      email,
      expiresIn: "2 minutes",
    });
  } catch (error) {
    console.error(" Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= VERIFY OTP =============
// =================================
const verifyOTP = async (req, res) => {
  console.log("🔎 Verify OTP called:", req.body);

  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Provide email and OTP" });

    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ success: false, message: "No OTP found" });

    if (Date.now() > user.otpExpiry) {
      console.log("⏰ OTP expired");
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    console.log(" OTP verified for:", email);

    res.json({ success: true, message: "OTP verified!", email });
  } catch (error) {
    console.error(" Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= RESET PASSWORD =============
// =================================
const resetPassword = async (req, res) => {
  console.log(" Reset password called:", req.body);

  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Min 6 chars" });

    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ success: false, message: "No OTP" });

    if (Date.now() > user.otpExpiry) {
      console.log("⏰ OTP expired during reset");
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    console.log("🔐 Updating password...");
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log(" Password reset successful for:", email);

    res.json({ success: true, message: "Password reset!" });
  } catch (error) {
    console.error(" Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= PROFILE =============
// =================================
const getProfile = async (req, res) => {
  console.log(" Get profile called:", req.user?.id);

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
    console.error(" Get profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  console.log("✏️ Update profile called:", req.body);

  try {
    const { name, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true },
    ).select("-password -otp -otpExpiry");

    console.log(" Profile updated");

    res.json({ success: true, user, message: "Profile updated" });
  } catch (error) {
    console.error(" Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  console.log("🔑 Change password called");

  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Current password incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(" Password changed successfully");

    res.json({ success: true, message: "Password changed" });
  } catch (error) {
    console.error(" Change password error:", error);
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
