const Card = require("../models/Card");
const Column = require("../models/Column");
const Board = require("../models/Board");

const cardController = {
  // ✅ CREATE CARD
  createCard: async (req, res) => {
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
  },

  // ✅ GET CARDS BY COLUMN
  getCardsByColumn: async (req, res) => {
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
  },

  // ✅ GET SINGLE CARD
  getCard: async (req, res) => {
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
  },

  // ✅ UPDATE CARD
  updateCard: async (req, res) => {
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
  },

  // ✅ DELETE CARD
  deleteCard: async (req, res) => {
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
  },

  // ✅ MOVE CARD (DRAG & DROP)
  moveCard: async (req, res) => {
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
  },

  // ✅ UPDATE MULTIPLE CARDS POSITION
  updateCardsPosition: async (req, res) => {
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
  },

  // ✅ TOGGLE CARD COMPLETION
  toggleCardCompletion: async (req, res) => {
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
  },

  // ✅ DUPLICATE CARD
  duplicateCard: async (req, res) => {
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
  },
};

module.exports = cardController;
