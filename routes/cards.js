const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");
const auth = require("../middleware/auth");

// Enhanced Logging Middleware
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
// Card Routes
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

module.exports = router;
