// controllers/auth/helpers.js
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Card = require("../../models/Card");

// ============= HELPER FUNCTIONS =============
const createInitialColumns = async (boardId, defaultColumns) => {
  console.log("🛠 Creating initial columns for board:", boardId);
  const columnDocs = defaultColumns.map((col, index) => ({
    title: col.title,
    board: boardId,
    position: index,
  }));
  const columns = await Column.insertMany(columnDocs);
  console.log(
    "✅ Columns created:",
    columns.map((c) => c._id),
  );
  return columns.map((col) => col._id);
};

const getPopulatedBoardsForUser = async (userId) => {
  console.log("🛠 Fetching populated boards for user:", userId);
  const boards = await Board.find({ owner: userId })
    .populate("owner", "name email")
    .sort("-lastActivity")
    .lean();

  const populatedBoards = await Promise.all(
    boards.map(async (board) => {
      const columns = await Column.find({
        _id: { $in: board.columnOrder },
      }).lean();
      const columnsWithCards = await Promise.all(
        columns.map(async (column) => {
          const cards = await Card.find({ column: column._id })
            .sort("position")
            .lean();
          return { ...column, cards };
        }),
      );
      const sortedColumns = board.columnOrder
        .map((colId) => columnsWithCards.find((col) => col._id.equals(colId)))
        .filter((col) => col);
      return { ...board, columns: sortedColumns };
    }),
  );
  console.log("✅ Boards fetched for user:", userId);
  return populatedBoards;
};

module.exports = { createInitialColumns, getPopulatedBoardsForUser };
