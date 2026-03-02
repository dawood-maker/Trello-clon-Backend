// controllers/card/createCard.js
const Card = require("../../models/Card");
const Column = require("../../models/Column");
const Board = require("../../models/Board");

// ✅ CREATE CARD
const createCard = async (req, res) => {
  try {
    const { text, description, columnId, labels, dueDate, priority } =
      req.body;
    console.log(
      "🔥 createCard called by user:",
      req.user.id,
      "columnId:",
      columnId,
    );

    const column = await Column.findOne({
      _id: columnId,
      owner: req.user.id,
    }).populate("board");
    if (!column) {
      console.log("⚠ Column not found or unauthorized:", columnId);
      return res
        .status(404)
        .json({
          success: false,
          message: "Column not found or unauthorized",
        });
    }

    if (column.board.owner.toString() !== req.user.id.toString()) {
      console.log("⚠ Access denied to board:", column.board._id);
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
    }

    const cardCount = await Card.countDocuments({
      column: columnId,
      owner: req.user.id,
    });
    const card = await Card.create({
      text: text || "Untitled Card",
      description: description || "",
      column: columnId,
      board: column.board._id,
      position: cardCount,
      owner: req.user.id,
      createdBy: req.user.id,
      labels: labels || [],
      dueDate: dueDate || null,
      priority: priority || "medium",
    });

    await Board.findByIdAndUpdate(column.board._id, {
      lastActivity: Date.now(),
    });

    console.log("✅ Card created with ID:", card._id, "in column:", columnId);
    res.status(201).json({ success: true, card });
  } catch (err) {
    console.error("❌ Create card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { createCard };