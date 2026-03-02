// controllers/cardController.js
const { createCard }                          = require("./createCard");
const { getCardsByColumn, getCard }           = require("./getCards");
const { updateCard, deleteCard }              = require("./updateDeleteCard");
const { moveCard, updateCardsPosition }       = require("./moveCard");
const { toggleCardCompletion, duplicateCard } = require("./cardActions");

const cardController = {
  createCard,
  getCardsByColumn,
  getCard,
  updateCard,
  deleteCard,
  moveCard,
  updateCardsPosition,
  toggleCardCompletion,
  duplicateCard,
};

module.exports = cardController;