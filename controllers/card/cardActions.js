// controllers/card/cardActions.js
const Card = require("../../models/Card");

// ✅ TOGGLE CARD COMPLETION
const toggleCardCompletion = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found or unauthorized" });

    card.toggleCompletion();
    await card.save();

    console.log("✅ Card completion toggled:", card._id);
    res.json({ success: true, card });
  } catch (err) {
    console.error("❌ Toggle completion error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ DUPLICATE CARD
const duplicateCard = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found or unauthorized" });

    const cardCount = await Card.countDocuments({
      column: card.column,
      owner: req.user.id,
    });
    const newCard = await Card.create({
      ...card.toObject(),
      _id: undefined,
      position: cardCount,
      createdBy: req.user.id,
      owner: req.user.id,
      text: card.text + " (Copy)",
    });

    console.log(
      "✅ Card duplicated successfully:",
      newCard._id,
      "from card:",
      card._id,
    );
    res.json({ success: true, card: newCard });
  } catch (err) {
    console.error("❌ Duplicate card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { toggleCardCompletion, duplicateCard };