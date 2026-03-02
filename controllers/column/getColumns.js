// controllers/column/getColumns.js
const Column = require("../../models/Column");
const Board = require("../../models/Board");

// ======================
// GET COLUMNS BY BOARD
// ======================
const getColumnsByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    console.log(
      "🔥 getColumnsByBoard called by user:",
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

    const columns = await Column.find({ board: boardId, owner: req.user.id })
      .sort("position")
      .lean();
    console.log(
      "✅ Fetched columns count:",
      columns.length,
      "for board:",
      boardId,
    );
    res.json({ success: true, columns });
  } catch (err) {
    console.error("❌ Get columns error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================
// GET SINGLE COLUMN
// ======================
const getColumn = async (req, res) => {
  try {
    console.log(
      "🔥 getColumn called by user:",
      req.user.id,
      "columnId:",
      req.params.id,
    );

    const column = await Column.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!column) {
      console.log("⚠ Column not found or unauthorized:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Column not found or unauthorized",
      });
    }

    console.log("✅ Column fetched successfully:", column._id);
    res.json({ success: true, column });
  } catch (err) {
    console.error("❌ Get column error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getColumnsByBoard, getColumn };
