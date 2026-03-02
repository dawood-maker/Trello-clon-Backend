// controllers/column/columnActions.js
const Column = require("../../models/Column");
const Board = require("../../models/Board");
const Card = require("../../models/Card");

// ======================
// COLUMN STATS
// ======================
const getColumnStats = async (req, res) => {
  try {
    console.log(
      "🔥 getColumnStats called by user:",
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

    const cardsCount = await Card.countDocuments({
      column: req.params.id,
      owner: req.user.id,
    });
    const completedCount = await Card.countDocuments({
      column: req.params.id,
      owner: req.user.id,
      isCompleted: true,
    });

    console.log(
      "✅ Column stats fetched for column:",
      req.params.id,
      "cardsCount:",
      cardsCount,
      "completedCount:",
      completedCount,
    );
    res.json({
      success: true,
      stats: {
        cardsCount,
        completedCount,
        pendingCount: cardsCount - completedCount,
      },
    });
  } catch (err) {
    console.error("❌ Get column stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================
// DUPLICATE COLUMN
// ======================
const duplicateColumn = async (req, res) => {
  try {
    console.log(
      "🔥 duplicateColumn called by user:",
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

    const newColumn = await Column.create({
      title: column.title + " (Copy)",
      board: column.board,
      position: column.position + 1,
      owner: req.user.id,
      createdBy: req.user.id,
      color: column.color,
      wipLimit: column.wipLimit,
      settings: column.settings,
    });

    await Board.updateOne(
      { _id: column.board },
      { $push: { columnOrder: newColumn._id }, lastActivity: Date.now() },
    );

    const cards = await Card.find({ column: column._id, owner: req.user.id });
    if (cards.length > 0) {
      const duplicatedCards = cards.map((card) => ({
        text: card.text,
        description: card.description,
        position: card.position,
        column: newColumn._id,
        board: card.board,
        owner: req.user.id,
        createdBy: req.user.id,
        labels: card.labels,
        dueDate: card.dueDate,
        priority: card.priority,
      }));
      await Card.insertMany(duplicatedCards);
    }

    console.log(
      "✅ Column duplicated successfully:",
      newColumn._id,
      "originalColumn:",
      column._id,
      "cardsDuplicated:",
      cards.length,
    );
    res.json({ success: true, column: newColumn });
  } catch (err) {
    console.error("❌ Duplicate column error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getColumnStats, duplicateColumn };
