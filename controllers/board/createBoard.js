// controllers/board/createBoard.js
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Card = require("../../models/Card");
const User = require("../../models/User");

// ✅ Create board with default columns
const createBoard = async (req, res) => {
  try {
    console.log("🔥 createBoard called by user:", req.user.id);
    const { name, color, description, isPublic } = req.body;

    const board = await Board.create({
      name: name || "New Board",
      color: color || "#0079BF",
      description: description || "",
      isPublic: isPublic || false,
      owner: req.user.id,
    });
    console.log("✅ Board created with ID:", board._id);

    const defaultColumns = [
      {
        title: "To Do",
        position: 0,
        board: board._id,
        owner: req.user.id,
        createdBy: req.user.id,
      },
      {
        title: "In Progress",
        position: 1,
        board: board._id,
        owner: req.user.id,
        createdBy: req.user.id,
      },
      {
        title: "Done",
        position: 2,
        board: board._id,
        owner: req.user.id,
        createdBy: req.user.id,
      },
    ];

    const columns = await Column.insertMany(defaultColumns);
    console.log(
      "✅ Default columns created:",
      columns.map((c) => c._id),
    );

    board.columnOrder = columns.map((col) => col._id);
    await board.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: { boards: board._id },
    });
    console.log("✅ Board added to user's boards array:", req.user.id);

    const defaultCards = [
      {
        text: "First task for the day",
        position: 0,
        column: columns[0]._id,
        board: board._id,
        owner: req.user.id,
        createdBy: req.user.id,
      },
      {
        text: "Currently working on this item",
        position: 0,
        column: columns[1]._id,
        board: board._id,
        owner: req.user.id,
        createdBy: req.user.id,
      },
      {
        text: "Item completed and ready for review",
        position: 0,
        column: columns[2]._id,
        board: board._id,
        owner: req.user.id,
        createdBy: req.user.id,
      },
    ];

    await Card.insertMany(defaultCards);
    console.log("✅ Default cards created for columns");

    const populatedBoard = await Board.findById(board._id)
      .populate("owner", "name email")
      .lean();

    res.status(201).json({
      success: true,
      message: "Board created with default columns",
      board: { ...populatedBoard, columns },
    });
  } catch (error) {
    console.error("❌ createBoard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while creating board" });
  }
};

module.exports = { createBoard };