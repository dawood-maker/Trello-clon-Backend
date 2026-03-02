// controllers/auth/testController.js
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

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

module.exports = { test, createTestUser };
