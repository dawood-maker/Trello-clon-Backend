const mongoose = require("mongoose");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const path = require("path");

// Load .env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function fixData() {
  console.log("=======================================");
  console.log("🚀 Starting Data Fix Script...");
  console.log("=======================================\n");

  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    console.log("🔍 Checking MongoDB URI...");
    if (!mongoURI) {
      console.error("❌ MONGODB_URI not found in .env file!");
      process.exit(1);
    }

    console.log("✅ MongoDB URI Found");
    console.log("🔗 Connecting to MongoDB...\n");

    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected Successfully!\n");

    // Fetch all boards
    const boards = await Board.find({});
    console.log(`📋 Total Boards Found: ${boards.length}\n`);

    let totalColumnsFixed = 0;
    let totalCardsFixed = 0;

    for (const board of boards) {
      const ownerId = board.owner;

      console.log("=======================================");
      console.log(`🔧 Processing Board: ${board.name}`);
      console.log(`🆔 Board ID: ${board._id}`);
      console.log(`👤 Owner ID: ${ownerId}`);
      console.log("=======================================\n");

      // ------------------------
      // Fix Columns
      // ------------------------
      const columnsToFix = await Column.find({
        board: board._id,
        $or: [{ owner: { $exists: false } }, { owner: null }],
      });

      console.log(`⚡ Columns Missing Owner: ${columnsToFix.length}`);

      columnsToFix.forEach((column) => {
        console.log(`   ➤ Column: ${column.title} | ID: ${column._id}`);
      });

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

      console.log(`✅ Columns Updated: ${columnsUpdated.modifiedCount}\n`);
      totalColumnsFixed += columnsUpdated.modifiedCount;

      // ------------------------
      // Fix Cards
      // ------------------------
      const cardsToFix = await Card.find({
        board: board._id,
        $or: [{ owner: { $exists: false } }, { owner: null }],
      });

      console.log(`⚡ Cards Missing Owner: ${cardsToFix.length}`);

      cardsToFix.forEach((card) => {
        console.log(`   ➤ Card: ${card.text} | ID: ${card._id}`);
      });

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

      console.log(`✅ Cards Updated: ${cardsUpdated.modifiedCount}\n`);
      totalCardsFixed += cardsUpdated.modifiedCount;
    }

    console.log("=======================================");
    console.log("🎉 DATA FIX COMPLETED SUCCESSFULLY!");
    console.log("=======================================");
    console.log(`🗂 Total Columns Fixed: ${totalColumnsFixed}`);
    console.log(`📝 Total Cards Fixed: ${totalCardsFixed}`);
    console.log("=======================================\n");

    await mongoose.disconnect();
    console.log("🔌 MongoDB Disconnected");
    process.exit(0);
  } catch (error) {
    console.error("=======================================");
    console.error("❌ ERROR OCCURRED DURING FIX:");
    console.error(error);
    console.error("=======================================");
    process.exit(1);
  }
}

fixData();
