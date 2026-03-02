// controllers/column/moveColumn.js
const Column = require("../../models/Column");
const Board = require("../../models/Board");

// ======================
// UPDATE COLUMN POSITION
// ======================
const updateColumnPosition = async (req, res) => {
  try {
    const { position } = req.body;
    console.log(
      "🔥 updateColumnPosition called by user:",
      req.user.id,
      "columnId:",
      req.params.id,
      "newPosition:",
      position,
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

    column.position = position;
    await column.save();
    await Board.findByIdAndUpdate(column.board, { lastActivity: Date.now() });

    console.log(
      "✅ Column position updated:",
      column._id,
      "newPosition:",
      column.position,
    );
    res.json({ success: true, column });
  } catch (err) {
    console.error("❌ Update column position error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================
// MOVE COLUMN TO ANOTHER BOARD
// ======================
const moveColumn = async (req, res) => {
  try {
    const { newBoardId, position } = req.body;
    console.log(
      "🔥 moveColumn called by user:",
      req.user.id,
      "columnId:",
      req.params.id,
      "newBoardId:",
      newBoardId,
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

    const newBoard = await Board.findOne({
      _id: newBoardId,
      owner: req.user.id,
    });
    if (!newBoard) {
      console.log("⚠ Target board not found or unauthorized:", newBoardId);
      return res.status(404).json({
        success: false,
        message: "Target board not found or unauthorized",
      });
    }

    await Board.updateOne(
      { _id: column.board },
      { $pull: { columnOrder: column._id } },
    );
    await Board.updateOne(
      { _id: newBoardId },
      { $push: { columnOrder: column._id }, lastActivity: Date.now() },
    );

    column.board = newBoardId;
    column.position = position;
    await column.save();

    console.log(
      "✅ Column moved successfully:",
      column._id,
      "toBoard:",
      newBoardId,
    );
    res.json({ success: true, column });
  } catch (err) {
    console.error("❌ Move column error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { updateColumnPosition, moveColumn };
