// controllers/card/moveCard.js
const Card = require("../../models/Card");
const Column = require("../../models/Column");
const Board = require("../../models/Board");

// ✅ MOVE CARD (DRAG & DROP)
const moveCard = async (req, res) => {
  try {
    const {
      sourceColumnId,
      destinationColumnId,
      sourceIndex,
      destinationIndex,
    } = req.body;
    console.log(
      "🔄 Move card request by user:",
      req.user.id,
      "cardId:",
      req.params.id,
    );

    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).populate({ path: "board", select: "owner" });
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found or unauthorized" });

    const sourceColumn = await Column.findOne({
      _id: sourceColumnId,
      owner: req.user.id,
    });
    const destinationColumn = await Column.findOne({
      _id: destinationColumnId,
      owner: req.user.id,
    });
    if (!sourceColumn || !destinationColumn)
      return res
        .status(404)
        .json({
          success: false,
          message: "Column not found or unauthorized",
        });

    // Moving logic
    if (sourceColumnId !== destinationColumnId) {
      await Card.updateMany(
        {
          column: sourceColumnId,
          owner: req.user.id,
          position: { $gt: sourceIndex },
        },
        { $inc: { position: -1 } },
      );
      await Card.updateMany(
        {
          column: destinationColumnId,
          owner: req.user.id,
          position: { $gte: destinationIndex },
        },
        { $inc: { position: 1 } },
      );
      card.column = destinationColumnId;
      card.position = destinationIndex;
    } else {
      if (sourceIndex < destinationIndex) {
        await Card.updateMany(
          {
            column: sourceColumnId,
            owner: req.user.id,
            position: { $gt: sourceIndex, $lte: destinationIndex },
          },
          { $inc: { position: -1 } },
        );
      } else {
        await Card.updateMany(
          {
            column: sourceColumnId,
            owner: req.user.id,
            position: { $gte: destinationIndex, $lt: sourceIndex },
          },
          { $inc: { position: 1 } },
        );
      }
      card.position = destinationIndex;
    }

    await card.save();
    await Board.findByIdAndUpdate(card.board._id, {
      lastActivity: Date.now(),
    });

    console.log("✅ Card moved successfully:", card._id);
    res.json({ success: true, card });
  } catch (err) {
    console.error("❌ Move card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ UPDATE MULTIPLE CARDS POSITION
const updateCardsPosition = async (req, res) => {
  try {
    const { cards } = req.body;
    console.log(
      "🔄 updateCardsPosition called by user:",
      req.user.id,
      "cards count:",
      cards?.length || 0,
    );

    if (!cards || !Array.isArray(cards))
      return res
        .status(400)
        .json({ success: false, message: "Invalid cards data" });

    const cardIds = cards.map((c) => c.id);
    const userCards = await Card.find({
      _id: { $in: cardIds },
      owner: req.user.id,
    });
    if (userCards.length !== cards.length)
      return res
        .status(403)
        .json({ success: false, message: "Access denied to some cards" });

    const bulkOps = cards.map((card) => ({
      updateOne: {
        filter: { _id: card.id, owner: req.user.id },
        update: { column: card.columnId, position: card.position },
      },
    }));
    await Card.bulkWrite(bulkOps);

    console.log("✅ Cards positions updated for user:", req.user.id);
    res.json({ success: true, message: "Cards positions updated" });
  } catch (err) {
    console.error("❌ Update cards position error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { moveCard, updateCardsPosition };