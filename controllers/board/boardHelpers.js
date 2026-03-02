// controllers/board/boardHelpers.js
const Column = require("../../models/Column");
const Card = require("../../models/Card");

// ✅ Get sorted columns with cards for a board
const getColumnsWithCards = async (board, userId) => {
  const columns = await Column.find({
    _id: { $in: board.columnOrder },
    owner: userId,
  }).lean();

  const sortedColumns = board.columnOrder
    .map((colId) =>
      columns.find((col) => col._id.toString() === colId.toString()),
    )
    .filter((col) => col);

  const columnsWithCards = await Promise.all(
    sortedColumns.map(async (column) => {
      const cards = await Card.find({
        column: column._id,
        owner: userId,
      })
        .sort("position")
        .lean();
      return { ...column, cards };
    }),
  );

  return columnsWithCards;
};

module.exports = { getColumnsWithCards };