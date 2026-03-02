const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  console.log("=======================================");
  console.log("🔥 Auth middleware triggered");
  console.log(`Request URL: ${req.method} ${req.originalUrl}`);
  console.log("Cookies:", req.cookies);
  console.log("Authorization header:", req.header("Authorization"));
  console.log("=======================================\n");

  try {
    let token;

    // ✅ Try to get token from cookie FIRST
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log("🔑 Auth: token found in cookie");
    }
    // Fallback: Authorization header
    else if (req.header("Authorization")) {
      token = req.header("Authorization").replace("Bearer ", "");
      console.log("🔑 Auth: token found in Authorization header");
    }

    if (!token) {
      console.warn("⚠ Auth: no token provided");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    console.log("🔐 Auth: token decoded", { decoded });

    if (!userId) {
      console.warn("⚠ Auth: token decoded but userId missing");
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // Find user (excluding sensitive fields)
    const user = await User.findById(userId).select(
      "-password -otp -otpExpiry",
    );

    if (!user) {
      console.warn("⚠ Auth: user not found for userId:", userId);
      return res.status(401).json({
        success: false,
        message: "User not found. Token is invalid.",
      });
    }

    // ✅ Attach safe user info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    console.log("✅ Auth: user authenticated successfully", {
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
    });

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);
    if (error.name === "JsonWebTokenError") {
      console.warn("⚠ Auth: invalid token detected");
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      console.warn("⚠ Auth: token expired");
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
