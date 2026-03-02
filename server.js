// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// require("dotenv").config();

// const app = express();

// // ============= MIDDLEWARE =============
// app.use(
//   cors({
//     origin: "http://localhost:3005",
//     credentials: true,
//   }),
// );

// app.use(cookieParser());
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true }));

// // ============= ROUTES =============
// const authRoutes = require("./routes/auth");
// const boardRoutes = require("./routes/boards");
// const columnRoutes = require("./routes/columns");
// const cardRoutes = require("./routes/cards");
// const otpRoutes = require("./routes/otp");

// app.use("/api/auth", authRoutes);
// app.use("/api/boards", boardRoutes);
// app.use("/api/columns", columnRoutes);
// app.use("/api/cards", cardRoutes);
// app.use("/api/otp", otpRoutes);

// // ============= HEALTH CHECK ============
// app.get("/api/health", (req, res) => {
//   res.json({
//     success: true,
//     message: "Trello Clone Backend is LIVE!",
//     timestamp: new Date().toISOString(),
//     mongodb:
//       mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
//   });
// });

// // ============= ROOT ROUTE ============
// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Welcome to Trello Clone API",
//     docs: "http://localhost:5002/api/health",
//     author: "Abdullah Adil - Fullstack King",
//   });
// });

// // ============= 404 HANDLER ============
// app.use("*", (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//     tip: "Check your URL or visit /api/health",
//   });
// });

// // ============= GLOBAL ERROR HANDLER ============
// app.use((error, req, res, next) => {
//   res.status(error.status || 500).json({
//     success: false,
//     message: "Internal Server Error",
//     error:
//       process.env.NODE_ENV === "development"
//         ? error.message
//         : "Something went wrong",
//   });
// });

// // ============= DATABASE CONNECTION ============
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//   } catch (err) {
//     process.exit(1);
//   }
// };

// // ============= START SERVER ============
// const PORT = process.env.PORT || 5002;

// const startServer = async () => {
//   try {
//     await connectDB();

//     const server = app.listen(PORT);

//     // Graceful shutdown
//     process.on("SIGINT", () => {
//       server.close(() => {
//         mongoose.connection.close(false, () => {
//           process.exit(0);
//         });
//       });
//     });
//   } catch (err) {
//     process.exit(1);
//   }
// };

// // ============= LET'S GO! ============
// startServer();






const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("./config/db"); // MongoDB connection import

const app = express();

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "http://localhost:3005",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================
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

// ================= HEALTH CHECK =================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Trello Clone Backend is LIVE!",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// ================= ROOT ROUTE =================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Trello Clone API",
    docs: "http://localhost:5002/api/health",
    author: "Abdullah Adil - Fullstack King",
  });
});

// ================= LEGACY SIMPLE ROOT =================
app.get("/", (req, res) => {
  res.json({ message: "🚀 Trello Clone API is running!" });
});

// ================= 404 HANDLER =================
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    tip: "Check your URL or visit /api/health",
  });
});

// ================= GLOBAL ERROR HANDLER =================
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    await connectDB(); // MongoDB connection call

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      server.close(() => {
        mongoose.connection.close(false, () => {
          process.exit(0);
        });
      });
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();