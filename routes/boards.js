const express = require("express");
const router = express.Router();
const boardController = require("../controllers/board/boardController");
const auth = require("../middleware/auth");
const Board = require("../models/Board");
const List = require("../models/List");
const Card = require("../models/Card");

// ------------------------
// Enhanced Logging Middleware
// ------------------------
const logRequest = (req, res, next) => {
  console.log("=======================================");
  console.log(`Incoming Board Request: ${req.method} ${req.originalUrl}`);
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("Query:", req.query);

  // Capture response
  const originalJson = res.json;
  res.json = function (data) {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", data);
    console.log("=======================================");
    return originalJson.call(this, data);
  };

  next();
};

// =======================
// Enhanced Board routes
// =======================
router.get("/", logRequest, auth, boardController.getBoards);
router.post("/", logRequest, auth, boardController.createBoard);
router.get("/:id", logRequest, auth, boardController.getBoard);
router.put("/:id", logRequest, auth, boardController.updateBoard);
router.delete("/:id", logRequest, auth, boardController.deleteBoard);

// =======================
// Member management routes
// =======================
router.post("/:id/members", logRequest, auth, boardController.addMember);
router.delete("/:id/members", logRequest, auth, boardController.removeMember);

// ------------------------
// Legacy simple routes (from original basic router)
// ------------------------

// GET all boards (legacy)
router.get("/legacy", async (req, res) => {
  try {
    const boards = await Board.find().sort({ createdAt: -1 });
    res.json({ success: true, data: boards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single board with lists and cards (legacy)
router.get("/legacy/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    const lists = await List.find({ board: req.params.id }).sort({
      position: 1,
    });

    const listsWithCards = await Promise.all(
      lists.map(async (list) => {
        const cards = await Card.find({ list: list._id }).sort({ position: 1 });
        return { ...list.toObject(), cards };
      }),
    );

    res.json({
      success: true,
      data: { ...board.toObject(), lists: listsWithCards },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new board (legacy)
router.post("/legacy", async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Board name is required" });
    }

    const board = await Board.create({ name, color });
    res
      .status(201)
      .json({
        success: true,
        data: board,
        message: "Board created successfully",
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update board (legacy)
router.put("/legacy/:id", async (req, res) => {
  try {
    const board = await Board.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }
    res.json({ success: true, data: board });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE board and its lists/cards (legacy)
router.delete("/legacy/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    const lists = await List.find({ board: req.params.id });
    for (const list of lists) {
      await Card.deleteMany({ list: list._id });
    }
    await List.deleteMany({ board: req.params.id });
    await Board.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Board and all its data deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
