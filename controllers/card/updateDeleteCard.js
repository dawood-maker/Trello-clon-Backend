// controllers/card/updateDeleteCard.js
const Card = require("../../models/Card");
const Board = require("../../models/Board");

// ✅ UPDATE CARD
const updateCard = async (req, res) => {
  try {
    console.log(
      "🔥 updateCard called by user:",
      req.user.id,
      "cardId:",
      req.params.id,
    );

    const {
      text,
      description,
      assignedTo,
      labels,
      dueDate,
      priority,
      isCompleted,
    } = req.body;

    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).populate({ path: "board", select: "owner" });
    if (!card) {
      console.log("⚠ Card not found or unauthorized:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Card not found or unauthorized" });
    }

    if (text !== undefined) card.text = text;
    if (description !== undefined) card.description = description;
    if (assignedTo !== undefined) card.assignedTo = assignedTo;
    if (labels !== undefined) card.labels = labels;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (priority !== undefined) card.priority = priority;
    if (isCompleted !== undefined) card.isCompleted = isCompleted;

    await card.save();
    await Board.findByIdAndUpdate(card.board._id, {
      lastActivity: Date.now(),
    });

    console.log("✅ Card updated successfully:", card._id);
    res.json({ success: true, card });
  } catch (err) {
    console.error("❌ Update card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ DELETE CARD
const deleteCard = async (req, res) => {
  try {
    console.log(
      "🔥 deleteCard called by user:",
      req.user.id,
      "cardId:",
      req.params.id,
    );

    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).populate({ path: "board", select: "owner" });
    if (!card) {
      console.log("⚠ Card not found or unauthorized:", req.params.id);
      return res
        .status(404)
        .json({ success: false, message: "Card not found or unauthorized" });
    }

    await Card.findByIdAndDelete(req.params.id);
    await Board.findByIdAndUpdate(card.board._id, {
      lastActivity: Date.now(),
    });

    console.log("✅ Card deleted successfully:", card._id);
    res.json({ success: true, message: "Card deleted" });
  } catch (err) {
    console.error("❌ Delete card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { updateCard, deleteCard };