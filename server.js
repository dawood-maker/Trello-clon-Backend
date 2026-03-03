const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/db"); // ← Import MongoDB connection

const app = express();

//==================================
// ============= MIDDLEWARE =============
//==================================
app.use(
  cors({
    origin: "http://localhost:3005",
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

//==================================
// ============= ROUTES =============
//==================================
const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/boards");
const columnRoutes = require("./routes/columns");
const cardRoutes = require("./routes/cards");
const otpRoutes = require("./routes/otp");

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/otp", otpRoutes);

//==================================
// ============= HEALTH CHECK =============
//==================================
app.get("/api/health", (req, res) => {
  console.log("[Server] Health check requested");
  res.json({
    success: true,
    message: "Trello Clone Backend is LIVE!",
    timestamp: new Date().toISOString(),
  });
});

//==================================
// ============= ROOT ROUTE =============
//==================================
app.get("/", (req, res) => {
  console.log("[Server] Root route accessed");
  res.json({
    success: true,
    message: "Welcome to Trello Clone API",
    docs: "http://localhost:5002/api/health",
    author: "Abdullah Adil - Fullstack King",
  });
});

//==================================
// ============= 404 HANDLER =============
//==================================
app.use("*", (req, res) => {
  console.warn("[Server] 404 Route not found:", req.originalUrl);
  res.status(404).json({
    success: false,
    message: "Route not found",
    tip: "Check your URL or visit /api/health",
  });
});

//==================================
// ============= GLOBAL ERROR HANDLER =============
//==================================
app.use((error, req, res, next) => {
  console.error("[Server] ERROR:", error.message);
  res.status(error.status || 500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

//==================================
// ============= START SERVER =============
//==================================
const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log("====================================================");
      console.log(`[Server] Running on PORT ${PORT}`);
      console.log(`[Server] Local URL: http://localhost:${PORT}`);
      console.log(`[Server] Health Check: http://localhost:${PORT}/api/health`);
      console.log("====================================================");
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n[Server] Shutting down server...");
      server.close(() => {
        console.log("[Server] Express server closed");
        process.exit(0);
      });
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
};

startServer();
