// controllers/board/updateDeleteBoard.js
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Card = require("../../models/Card");
const User = require("../../models/User");

// ✅ Update board
const updateBoard = async (req, res) => {
  try {
    console.log(
      "🔥 updateBoard called for board:",
      req.params.id,
      "by user:",
      req.user.id,
    );
    const { name, color, description, isPublic, settings, columnOrder } =
      req.body;
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!board) {
      console.log("⚠ Board not found or unauthorized:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Board not found or unauthorized" });
    }

    if (name !== undefined) board.name = name;
    if (color !== undefined) board.color = color;
    if (description !== undefined) board.description = description;
    if (isPublic !== undefined) board.isPublic = isPublic;
    if (settings !== undefined)
      board.settings = { ...board.settings, ...settings };
    if (columnOrder !== undefined) board.columnOrder = columnOrder;

    board.lastActivity = Date.now();
    await board.save();

    console.log("✅ Board updated successfully:", board._id);
    res.json({ success: true, message: "Board updated", board });
  } catch (error) {
    console.error("❌ updateBoard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating board" });
  }
};

// ✅ Delete board
const deleteBoard = async (req, res) => {
  try {
    console.log(
      "🔥 deleteBoard called for board:",
      req.params.id,
      "by user:",
      req.user.id,
    );
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!board) {
      console.log("⚠ Board not found or unauthorized:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Board not found or unauthorized" });
    }

    const columns = await Column.find({
      board: board._id,
      owner: req.user.id,
    });
    for (const column of columns) {
      await Card.deleteMany({ column: column._id, owner: req.user.id });
      await Column.findByIdAndDelete(column._id);
    }

    await Board.findByIdAndDelete(board._id);
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { boards: board._id },
    });

    console.log("✅ Board deleted successfully:", board._id);
    res.json({ success: true, message: "Board deleted successfully" });
  } catch (error) {
    console.error("❌ deleteBoard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while deleting board" });
  }
};

module.exports = { updateBoard, deleteBoard };