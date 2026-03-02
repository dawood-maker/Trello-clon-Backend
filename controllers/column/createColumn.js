// controllers/column/createColumn.js
const Column = require("../../models/Column");
const Board = require("../../models/Board");

// ======================
// CREATE COLUMN
// ======================
const createColumn = async (req, res) => {
  try {
    const { title, boardId } = req.body;
    console.log(
      "🔥 createColumn called by user:",
      req.user.id,
      "boardId:",
      boardId,
    );

    const board = await Board.findOne({ _id: boardId, owner: req.user.id });
    if (!board) {
      console.log("⚠ Board not found or unauthorized:", boardId);
      return res
        .status(404)
        .json({ success: false, message: "Board not found or unauthorized" });
    }

    const column = await Column.create({
      title: title || "New Column",
      board: boardId,
      position: board.columnOrder.length,
      owner: req.user.id,
      createdBy: req.user.id,
    });

    board.columnOrder.push(column._id);
    board.lastActivity = Date.now();
    await board.save();

    console.log(
      "✅ Column created successfully:",
      column._id,
      "position:",
      column.position,
    );
    res.status(201).json({ success: true, column });
  } catch (err) {
    console.error("❌ Create column error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { createColumn };
