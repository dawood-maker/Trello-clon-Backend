const express = require("express");
const router = express.Router();
const List = require("../models/List");
const Card = require("../models/Card");

// GET all lists for a board
router.get("/board/:boardId", async (req, res) => {
  try {
    const lists = await List.find({ board: req.params.boardId }).sort({
      position: 1,
    });

    const listsWithCards = await Promise.all(
      lists.map(async (list) => {
        const cards = await Card.find({ list: list._id }).sort({ position: 1 });
        return { ...list.toObject(), cards };
      }),
    );

    res.json({ success: true, data: listsWithCards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new list (Add another list)
router.post("/", async (req, res) => {
  try {
    const { name, board } = req.body;

    if (!name || !board) {
      return res
        .status(400)
        .json({
          success: false,
          message: "List name and board ID are required",
        });
    }

    // Auto position - add at end
    const listsCount = await List.countDocuments({ board });
    const list = await List.create({ name, board, position: listsCount });

    res
      .status(201)
      .json({
        success: true,
        data: list,
        message: `List "${name}" created successfully`,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update list name
router.put("/:id", async (req, res) => {
  try {
    const list = await List.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!list) {
      return res
        .status(404)
        .json({ success: false, message: "List not found" });
    }
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE list (also deletes all its cards)
router.delete("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) {
      return res
        .status(404)
        .json({ success: false, message: "List not found" });
    }

    await Card.deleteMany({ list: req.params.id });
    await List.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "List and all its cards deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
