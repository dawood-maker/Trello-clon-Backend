// controllers/boardController.js
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const User = require("../models/User");
const mongoose = require("mongoose");

// =================================
// ============= HELPER =============
// =================================
const createInitialColumns = async (boardId, userId) => {
  const defaultColumns = [
    { title: "To Do", position: 0 },
    { title: "In Progress", position: 1 },
    { title: "Done", position: 2 },
  ];
  const columnDocs = defaultColumns.map((col) => ({
    title: col.title,
    board: boardId,
    position: col.position,
    owner: userId,
    createdBy: userId,
  }));
  const columns = await Column.insertMany(columnDocs);
  return columns.map((col) => col._id);
};

const getPopulatedBoardsForUser = async (userId) => {
  const boards = await Board.find({ owner: userId })
    .sort({ isPermanent: -1, lastActivity: -1 }) // permanent board pehle
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
        .map((colId) =>
          columnsWithCards.find(
            (col) => col._id.toString() === colId.toString(),
          ),
        )
        .filter(Boolean);

      return { ...board, columns: sortedColumns };
    }),
  );
  return populatedBoards;
};

// =================================
//  SAFE DELETE — koi bhi mongoose middleware trigger nahi hoga
// Board.collection.deleteOne = raw MongoDB, no pre/post hooks
// =================================
const safeBoardDelete = async (boardId, userId) => {
  const boardObjId = new mongoose.Types.ObjectId(boardId);

  console.log("[safeBoardDelete] Deleting board:", boardId);

  // Step 1: Columns find karo
  const columns = await Column.find({ board: boardObjId }).lean();
  const columnIds = columns.map((c) => c._id);

  // Step 2: Cards delete (raw)
  if (columnIds.length > 0) {
    const r = await Card.collection.deleteMany({ column: { $in: columnIds } });
    console.log("[safeBoardDelete] Cards deleted:", r.deletedCount);
  }

  // Step 3: Columns delete (raw)
  const cr = await Column.collection.deleteMany({ board: boardObjId });
  console.log("[safeBoardDelete] Columns deleted:", cr.deletedCount);

  // Step 4: Board delete (raw — NO middleware)
  const br = await Board.collection.deleteOne({ _id: boardObjId });
  console.log("[safeBoardDelete] Board deleted:", br.deletedCount);

  // Step 5: User array update
  await User.findByIdAndUpdate(userId, { $pull: { boards: boardObjId } });
};

// =================================
// ============= CREATE BOARD =============
//  User ka apna name + color MongoDB mein save hoga
// =================================
const createBoard = async (req, res) => {
  console.log("[boardController] createBoard:", req.body);
  try {
    const { name, color, description, isPublic } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Board name required" });
    }
    if (!color || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid hex color required" });
    }

    const board = await Board.create({
      name: name.trim(),
      color: color,
      description: description ? description.trim() : "",
      isPublic: isPublic || false,
      isPermanent: false, // user-created boards permanent nahi hote
      owner: req.user.id,
    });

    const columnIds = await createInitialColumns(board._id, req.user.id);
    board.columnOrder = columnIds;
    await board.save();

    await User.findByIdAndUpdate(req.user.id, { $push: { boards: board._id } });

    const allBoards = await getPopulatedBoardsForUser(req.user.id);

    console.log("[boardController] Board created:", board.name, board.color);
    res.status(201).json({ success: true, board, boards: allBoards });
  } catch (err) {
    console.error("[boardController] createBoard error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= GET ALL BOARDS =============
// =================================
const getBoards = async (req, res) => {
  try {
    const boards = await getPopulatedBoardsForUser(req.user.id);
    res.json({ success: true, boards });
  } catch (err) {
    console.error("[boardController] getBoards error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= GET SINGLE BOARD =============
// =================================
const getBoard = async (req, res) => {
  try {
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    const columns = await Column.find({
      _id: { $in: board.columnOrder },
    }).lean();
    const columnsWithCards = await Promise.all(
      columns.map(async (col) => {
        const cards = await Card.find({ column: col._id })
          .sort("position")
          .lean();
        return { ...col, cards };
      }),
    );
    const sortedColumns = board.columnOrder
      .map((colId) =>
        columnsWithCards.find((col) => col._id.toString() === colId.toString()),
      )
      .filter(Boolean);

    const boardObj = board.toObject();
    boardObj.columns = sortedColumns;
    res.json({ success: true, board: boardObj });
  } catch (err) {
    console.error("[boardController] getBoard error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= UPDATE BOARD =============
// =================================
const updateBoard = async (req, res) => {
  try {
    const { name, color, description, isPublic, columnOrder } = req.body;

    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    if (name !== undefined) board.name = name.trim();
    if (color !== undefined) board.color = color;
    if (description !== undefined) board.description = description.trim();
    if (isPublic !== undefined) board.isPublic = isPublic;
    if (columnOrder !== undefined) board.columnOrder = columnOrder;
    board.lastActivity = Date.now();
    await board.save();

    res.json({ success: true, message: "Board updated", board });
  } catch (err) {
    console.error("[boardController] updateBoard error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= DELETE BOARD =============
//  Permanent board delete nahi hoga
//  safeBoardDelete se koi middleware issue nahi
// =================================
const deleteBoard = async (req, res) => {
  try {
    console.log("[boardController] deleteBoard:", req.params.id);

    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).lean();

    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    //  Permanent board protect karo
    if (board.isPermanent) {
      return res.status(403).json({
        success: false,
        message: "This board is permanent and cannot be deleted",
      });
    }

    await safeBoardDelete(req.params.id, req.user.id);

    const allBoards = await getPopulatedBoardsForUser(req.user.id);
    res.json({ success: true, message: "Board deleted", boards: allBoards });
  } catch (err) {
    console.error(
      "[boardController] deleteBoard error:",
      err.message,
      err.stack,
    );
    res
      .status(500)
      .json({ success: false, message: "Server error while deleting board" });
  }
};

// =================================
// ============= DELETE ALL NON-PERMANENT BOARDS =============
//  Reset All ke liye — permanent board safe rahega
// =================================
const deleteAllBoards = async (req, res) => {
  try {
    console.log("[boardController] deleteAllBoards for user:", req.user.id);

    // Sirf non-permanent boards find karo
    const boards = await Board.find({
      owner: req.user.id,
      isPermanent: { $ne: true }, // permanent boards skip
    }).lean();

    console.log("[boardController] Boards to delete:", boards.length);

    // Sab delete karo
    for (const board of boards) {
      await safeBoardDelete(board._id.toString(), req.user.id);
    }

    // Remaining boards return karo (permanent wala rahega)
    const remainingBoards = await getPopulatedBoardsForUser(req.user.id);
    console.log("[boardController] Remaining boards:", remainingBoards.length);

    res.json({
      success: true,
      message: "All non-permanent boards deleted",
      boards: remainingBoards,
    });
  } catch (err) {
    console.error(
      "[boardController] deleteAllBoards error:",
      err.message,
      err.stack,
    );
    res
      .status(500)
      .json({ success: false, message: "Server error during reset" });
  }
};

// =================================
// ============= ADD MEMBER =============
// =================================
const addMember = async (req, res) => {
  try {
    const { userId, role = "member" } = req.body;
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!board)
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });

    const userExists = await User.findById(userId);
    if (!userExists)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const alreadyMember = board.members.some(
      (m) => m.user.toString() === userId,
    );
    if (alreadyMember)
      return res
        .status(400)
        .json({ success: false, message: "Already a member" });

    board.members.push({ user: userId, role });
    await board.save();
    res.json({ success: true, message: "Member added", board });
  } catch (err) {
    console.error("[boardController] addMember error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= REMOVE MEMBER =============
// =================================
const removeMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!board)
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });

    board.members = board.members.filter((m) => m.user.toString() !== userId);
    await board.save();
    res.json({ success: true, message: "Member removed", board });
  } catch (err) {
    console.error("[boardController] removeMember error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =================================
// ============= EXPORTS =============
// =================================
module.exports = {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  deleteAllBoards, //  Reset All ke liye naya endpoint
  addMember,
  removeMember,
};
