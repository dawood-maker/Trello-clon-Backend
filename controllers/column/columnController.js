// controllers/columnController.js
const { createColumn } = require("./createColumn");
const { getColumnsByBoard, getColumn } = require("./getColumns");
const { updateColumn, deleteColumn } = require("./updateDeleteColumn");
const { updateColumnPosition, moveColumn } = require("./moveColumn");
const { getColumnStats, duplicateColumn } = require("./columnActions");

const columnController = {
  createColumn,
  getColumnsByBoard,
  getColumn,
  updateColumn,
  deleteColumn,
  updateColumnPosition,
  moveColumn,
  getColumnStats,
  duplicateColumn,
};

module.exports = columnController;
