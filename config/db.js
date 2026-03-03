const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    console.log("[MongoDB] Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("[MongoDB] Connected successfully");
    console.log(
      `[MongoDB] Status: ${mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"}`,
    );
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    process.exit(1);
  }

  // Optional: Log when connection is disconnected
  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Connection lost!");
  });

  // Optional: Log errors after initial connection
  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error:", err);
  });
};

module.exports = connectDB;
