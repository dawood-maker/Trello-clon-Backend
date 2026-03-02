// controllers/board/getBoards.js
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Card = require("../../models/Card");
const { getColumnsWithCards } = require("./boardHelpers");

// ✅ Get all boards (ONLY user's boards)
const getBoards = async (req, res) => {
  try {
    console.log("🔥 getBoards called by user:", req.user.id);
    const boards = await Board.find({ owner: req.user.id })
      .populate("owner", "name email")
      .sort("-lastActivity")
      .lean();

    const populatedBoards = await Promise.all(
      boards.map(async (board) => {
        const columnsWithCards = await getColumnsWithCards(board, req.user.id);
        return { ...board, columns: columnsWithCards };
      }),
    );

    console.log("✅ Fetched boards count:", populatedBoards.length);
    res.json({
      success: true,
      count: populatedBoards.length,
      boards: populatedBoards,
    });
  } catch (error) {
    console.error("❌ getBoards error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching boards",
      });
  }
};

// ✅ Get single board
const getBoard = async (req, res) => {
  try {
    console.log(
      "🔥 getBoard called for board:",
      req.params.id,
      "by user:",
      req.user.id,
    );
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).lean();

    if (!board) {
      console.log("⚠ Board not found or unauthorized:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Board not found or unauthorized" });
    }

    const columnsWithCards = await getColumnsWithCards(board, req.user.id);

    console.log("✅ Board fetched successfully:", board._id);
    res.json({
      success: true,
      board: { ...board, columns: columnsWithCards },
    });
  } catch (error) {
    console.error("❌ getBoard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while fetching board" });
  }
};

module.exports = { getBoards, getBoard };