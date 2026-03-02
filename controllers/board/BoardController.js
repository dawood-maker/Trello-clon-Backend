// controllers/boardController.js
const { createBoard }           = require("./createBoard");
const { getBoards, getBoard }   = require("./getBoards");
const { updateBoard, deleteBoard } = require("./updateDeleteBoard");
const { addMember, removeMember }  = require("./memberController");

const boardController = {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
};

// Alias functions
boardController.getUserBoards = boardController.getBoards;
boardController.saveBoard     = boardController.updateBoard;

module.exports = boardController;