const mongoose = require("mongoose");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const path = require("path");

//============================
// Load .env from correct path
//============================
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function fixData() {
  try {
    // Use MONGODB_URI instead of MONGO_URI
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("[FixData] MONGODB_URI not found in .env file!");
      process.exit(1);
    }

    console.log("[FixData] Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("[FixData] MongoDB Connected");

    // Find all boards
    const boards = await Board.find({});
    console.log(`[FixData] Found ${boards.length} boards`);

    for (const board of boards) {
      const ownerId = board.owner;
      console.log(
        `\n[FixData] Fixing board: ${board.name} (ID: ${board._id}, Owner: ${ownerId})`,
      );

      // Fix columns
      const columnsUpdated = await Column.updateMany(
        {
          board: board._id,
          $or: [{ owner: { $exists: false } }, { owner: null }],
        },
        {
          $set: {
            owner: ownerId,
            createdBy: ownerId,
          },
        },
      );
      console.log(
        `[FixData]   Columns updated: ${columnsUpdated.modifiedCount}`,
      );

      // Fix cards
      const cardsUpdated = await Card.updateMany(
        {
          board: board._id,
          $or: [{ owner: { $exists: false } }, { owner: null }],
        },
        {
          $set: {
            owner: ownerId,
            createdBy: ownerId,
          },
        },
      );
      console.log(`[FixData]   Cards updated: ${cardsUpdated.modifiedCount}`);
    }

    console.log("\n[FixData] All data fixed successfully!");
    console.log("[FixData] Ab har user ka data separate ho jayega!");
    process.exit(0);
  } catch (error) {
    console.error("[FixData] Error:", error);
    process.exit(1);
  }
}

fixData();
