const express = require("express");
const router = express.Router();
const cardController = require("../controllers/card/cardController");
const auth = require("../middleware/auth");
const Card = require("../models/Card");

// ------------------------
// Enhanced Logging Middleware
// ------------------------
const logRequest = (req, res, next) => {
  console.log("=======================================");
  console.log(`Incoming Card Request: ${req.method} ${req.originalUrl}`);
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("Query:", req.query);

  // Capture JSON response
  const originalJson = res.json;
  res.json = function (data) {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", data);
    console.log("=======================================");
    return originalJson.call(this, data);
  };

  // Capture errors
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      console.error("Error Response Status:", res.statusCode);
    }
  });

  next();
};

// =======================
// Enhanced Card Routes
// =======================

// Create a new card
router.post("/", logRequest, auth, cardController.createCard);

// Get cards by column
router.get(
  "/column/:columnId",
  logRequest,
  auth,
  cardController.getCardsByColumn,
);

// Get single card
router.get("/:id", logRequest, auth, cardController.getCard);

// Update card
router.put("/:id", logRequest, auth, cardController.updateCard);

// Delete card
router.delete("/:id", logRequest, auth, cardController.deleteCard);

// Move card (drag & drop)
router.put("/:id/move", logRequest, auth, cardController.moveCard);

// Update multiple cards positions (bulk drag-drop)
router.put(
  "/bulk/positions",
  logRequest,
  auth,
  cardController.updateCardsPosition,
);

// ------------------------
// Legacy simple routes (from original basic router)
// ------------------------

// GET all cards for a list (legacy)
router.get("/legacy/list/:listId", async (req, res) => {
  try {
    const cards = await Card.find({ list: req.params.listId }).sort({
      position: 1,
    });
    res.json({ success: true, data: cards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new card (legacy)
router.post("/legacy", async (req, res) => {
  try {
    const { title, list } = req.body;

    if (!title || !list) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Card title and list ID are required",
        });
    }

    const cardsCount = await Card.countDocuments({ list });
    const card = await Card.create({ title, list, position: cardsCount });

    res
      .status(201)
      .json({
        success: true,
        data: card,
        message: "Card created successfully",
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update card (legacy)
router.put("/legacy/:id", async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!card) {
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });
    }
    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE card (legacy)
router.delete("/legacy/:id", async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) {
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });
    }
    res.json({ success: true, message: "Card deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
