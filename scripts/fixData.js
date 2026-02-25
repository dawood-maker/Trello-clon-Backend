const mongoose = require("mongoose");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const path = require("path");

// ✅ Load .env from correct path
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function fixData() {
  try {
    // ✅ Use MONGODB_URI instead of MONGO_URI
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("❌ MONGODB_URI not found in .env file!");
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected");

    // Find all boards
    const boards = await Board.find({});
    console.log(`📋 Found ${boards.length} boards`);

    for (const board of boards) {
      const ownerId = board.owner;
      console.log(`\n🔧 Fixing board: ${board.name} (Owner: ${ownerId})`);

      // Fix columns
      const columns = await Column.find({
        board: board._id,
        $or: [{ owner: { $exists: false } }, { owner: null }],
      });
      console.log(`  ⚡ Columns to fix: ${columns.length}`);

      for (const column of columns) {
        console.log(`    - Fixing column: ${column.title} (${column._id})`);
      }

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
      console.log(`  ✅ Updated ${columnsUpdated.modifiedCount} columns`);

      // Fix cards
      const cards = await Card.find({
        board: board._id,
        $or: [{ owner: { $exists: false } }, { owner: null }],
      });
      console.log(`  ⚡ Cards to fix: ${cards.length}`);

      for (const card of cards) {
        console.log(`    - Fixing card: ${card.text} (${card._id})`);
      }

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
      console.log(`  ✅ Updated ${cardsUpdated.modifiedCount} cards`);
    }

    console.log("\n🎉 All data fixed successfully!");
    console.log(
      "✅ Now each user has separate ownership for boards, columns, and cards!",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixData();
