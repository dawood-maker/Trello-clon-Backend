const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");
const auth = require("../middleware/auth");

// @route   POST /api/cards
router.post("/", auth, (req, res, next) => {
  console.log(
    "[Cards Router] POST / called by userId:",
    req.user?.id,
    "with body:",
    req.body,
  );
  cardController.createCard(req, res, next);
});

// @route   GET /api/cards/column/:columnId
router.get("/column/:columnId", auth, (req, res, next) => {
  console.log(
    "[Cards Router] GET /column/:columnId called by userId:",
    req.user?.id,
    "columnId:",
    req.params.columnId,
  );
  cardController.getCardsByColumn(req, res, next);
});

// @route   GET /api/cards/:id
router.get("/:id", auth, (req, res, next) => {
  console.log(
    "[Cards Router] GET /:id called by userId:",
    req.user?.id,
    "cardId:",
    req.params.id,
  );
  cardController.getCard(req, res, next);
});

// @route   PUT /api/cards/:id
router.put("/:id", auth, (req, res, next) => {
  console.log(
    "[Cards Router] PUT /:id called by userId:",
    req.user?.id,
    "cardId:",
    req.params.id,
    "with body:",
    req.body,
  );
  cardController.updateCard(req, res, next);
});

// @route   DELETE /api/cards/:id
router.delete("/:id", auth, (req, res, next) => {
  console.log(
    "[Cards Router] DELETE /:id called by userId:",
    req.user?.id,
    "cardId:",
    req.params.id,
  );
  cardController.deleteCard(req, res, next);
});

// @route   PUT /api/cards/:id/move
router.put("/:id/move", auth, (req, res, next) => {
  console.log(
    "[Cards Router] PUT /:id/move called by userId:",
    req.user?.id,
    "cardId:",
    req.params.id,
    "with body:",
    req.body,
  );
  cardController.moveCard(req, res, next);
});

// @route   PUT /api/cards/bulk/positions
router.put("/bulk/positions", auth, (req, res, next) => {
  console.log(
    "[Cards Router] PUT /bulk/positions called by userId:",
    req.user?.id,
    "with body:",
    req.body,
  );
  cardController.updateCardsPosition(req, res, next);
});

module.exports = router;
