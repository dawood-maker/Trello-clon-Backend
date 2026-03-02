// controllers/card/getCards.js
const Card = require("../../models/Card");
const Column = require("../../models/Column");

// ✅ GET CARDS BY COLUMN
const getCardsByColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    console.log(
      "🔥 getCardsByColumn called by user:",
      req.user.id,
      "columnId:",
      columnId,
    );

    const column = await Column.findOne({
      _id: columnId,
      owner: req.user.id,
    });
    if (!column) {
      console.log("⚠ Column not found or unauthorized:", columnId);
      return res
        .status(404)
        .json({
          success: false,
          message: "Column not found or unauthorized",
        });
    }

    const cards = await Card.find({ column: columnId, owner: req.user.id })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort("position");

    console.log(
      "✅ Fetched cards count:",
      cards.length,
      "for column:",
      columnId,
    );
    res.json({ success: true, cards });
  } catch (err) {
    console.error("❌ Get cards error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ GET SINGLE CARD
const getCard = async (req, res) => {
  try {
    console.log(
      "🔥 getCard called by user:",
      req.user.id,
      "cardId:",
      req.params.id,
    );

    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user.id,
    })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("column", "title")
      .populate("board", "name color");

    if (!card) {
      console.log("⚠ Card not found or unauthorized:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Card not found or unauthorized" });
    }

    console.log("✅ Card fetched successfully:", card._id);
    res.json({ success: true, card });
  } catch (err) {
    console.error("❌ Get card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getCardsByColumn, getCard };