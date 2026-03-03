const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    let token;
    console.log("🔹 Auth middleware called");

    //=======================
    //  Try to get token from cookie FIRST (your frontend uses cookies)
    //=======================
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log(" Token found in cookies");
    }
    //=======================
    // Fallback: Try Authorization header (for API testing)
    //=======================
    else if (req.header("Authorization")) {
      token = req.header("Authorization").replace("Bearer ", "");
      console.log(" Token found in Authorization header");
    }

    if (!token) {
      console.log(" No token provided");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    //=======================
    // Verify token
    //=======================
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(" Token verified successfully");
    } catch (err) {
      console.log(" Token verification failed:", err.message);
      throw err; // Let outer catch handle response
    }

    //=======================
    // Get userId from token
    //=======================
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      console.log(" Invalid token format, missing userId");
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }
    console.log("🔹 Token belongs to userId:", userId);

    //=======================
    // Find user (excluding sensitive fields)
    //=======================
    const user = await User.findById(userId).select(
      "-password -otp -otpExpiry",
    );
    if (!user) {
      console.log(" User not found. Token is invalid");
      return res.status(401).json({
        success: false,
        message: "User not found. Token is invalid.",
      });
    }
    console.log(" User found:", user.email);

    //=======================
    //  Attach user to request
    //=======================
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
    console.log("🔹 req.user attached:", req.user);

    next();
  } catch (error) {
    console.error(" Auth middleware error:", error.message);

    if (error.name === "JsonWebTokenError") {
      console.log(" Invalid JWT token");
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      console.log("⚠️ JWT token expired");
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = auth;
