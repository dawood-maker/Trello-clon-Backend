const Column = require("../models/Column");
const Board = require("../models/Board");
const Card = require("../models/Card");

const columnController = {
  // ======================
  // CREATE COLUMN
  // ======================
  createColumn: async (req, res) => {
    try {
      const { title, boardId } = req.body;
      console.log("🔹 Create Column Request:", { title, boardId });

      const board = await Board.findOne({ _id: boardId, owner: req.user.id });
      if (!board) {
        console.log("⚠️ Board not found or unauthorized:", boardId);
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      }

      const column = await Column.create({
        title: title || "New Column",
        board: boardId,
        position: board.columnOrder.length,
        owner: req.user.id,
        createdBy: req.user.id,
      });

      board.columnOrder.push(column._id);
      board.lastActivity = Date.now();
      await board.save();

      console.log(". Column created successfully:", column._id);
      res.status(201).json({ success: true, column });
    } catch (err) {
      console.error("Create column error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // GET COLUMNS BY BOARD
  // ======================
  getColumnsByBoard: async (req, res) => {
    try {
      const { boardId } = req.params;
      console.log("🔹 Get Columns By Board Request:", boardId);

      const board = await Board.findOne({ _id: boardId, owner: req.user.id });
      if (!board) {
        console.log("⚠️ Board not found or unauthorized:", boardId);
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      }

      const columns = await Column.find({ board: boardId, owner: req.user.id })
        .sort("position")
        .lean();

      console.log(". Columns fetched:", columns.length);
      res.json({ success: true, columns });
    } catch (err) {
      console.error("Get columns error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // GET SINGLE COLUMN
  // ======================
  getColumn: async (req, res) => {
    try {
      console.log("🔹 Get Single Column Request:", req.params.id);

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      console.log(". Column found:", column._id);
      res.json({ success: true, column });
    } catch (err) {
      console.error("Get column error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // UPDATE COLUMN
  // ======================
  updateColumn: async (req, res) => {
    try {
      const { title, color, wipLimit, isCollapsed, settings } = req.body;
      console.log("🔹 Update Column Request:", req.params.id, {
        title,
        color,
        wipLimit,
        isCollapsed,
        settings,
      });

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      if (title !== undefined) column.title = title;
      if (color !== undefined) column.color = color;
      if (wipLimit !== undefined) column.wipLimit = wipLimit;
      if (isCollapsed !== undefined) column.isCollapsed = isCollapsed;
      if (settings !== undefined)
        column.settings = { ...column.settings, ...settings };

      await column.save();
      await Board.findByIdAndUpdate(column.board, { lastActivity: Date.now() });

      console.log(". Column updated:", column._id);
      res.json({ success: true, column });
    } catch (err) {
      console.error("Update column error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // DELETE COLUMN
  // ======================
  deleteColumn: async (req, res) => {
    try {
      console.log("🔹 Delete Column Request:", req.params.id);

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      await Board.updateOne(
        { _id: column.board },
        { $pull: { columnOrder: column._id }, lastActivity: Date.now() },
      );
      await Card.deleteMany({ column: column._id, owner: req.user.id });
      await Column.findByIdAndDelete(req.params.id);

      console.log(". Column deleted:", column._id);
      res.json({ success: true, message: "Column deleted" });
    } catch (err) {
      console.error("Delete column error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // UPDATE COLUMN POSITION
  // ======================
  updateColumnPosition: async (req, res) => {
    try {
      const { position } = req.body;
      console.log("🔹 Update Column Position Request:", req.params.id, {
        position,
      });

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      column.position = position;
      await column.save();
      await Board.findByIdAndUpdate(column.board, { lastActivity: Date.now() });

      console.log(
        ". Column position updated:",
        column._id,
        "New position:",
        position,
      );
      res.json({ success: true, column });
    } catch (err) {
      console.error("Update column position error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // MOVE COLUMN TO ANOTHER BOARD
  // ======================
  moveColumn: async (req, res) => {
    try {
      const { newBoardId, position } = req.body;
      console.log("🔹 Move Column Request:", req.params.id, {
        newBoardId,
        position,
      });

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      const newBoard = await Board.findOne({
        _id: newBoardId,
        owner: req.user.id,
      });
      if (!newBoard) {
        console.log("⚠️ Target board not found or unauthorized:", newBoardId);
        return res
          .status(404)
          .json({
            success: false,
            message: "Target board not found or unauthorized",
          });
      }

      await Board.updateOne(
        { _id: column.board },
        { $pull: { columnOrder: column._id } },
      );
      await Board.updateOne(
        { _id: newBoardId },
        { $push: { columnOrder: column._id }, lastActivity: Date.now() },
      );

      column.board = newBoardId;
      column.position = position;
      await column.save();

      console.log(". Column moved successfully:", column._id);
      res.json({ success: true, column });
    } catch (err) {
      console.error("Move column error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // COLUMN STATS
  // ======================
  getColumnStats: async (req, res) => {
    try {
      console.log("🔹 Get Column Stats Request:", req.params.id);

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      const cardsCount = await Card.countDocuments({
        column: req.params.id,
        owner: req.user.id,
      });
      const completedCount = await Card.countDocuments({
        column: req.params.id,
        owner: req.user.id,
        isCompleted: true,
      });

      console.log(". Column stats:", {
        cardsCount,
        completedCount,
        pendingCount: cardsCount - completedCount,
      });
      res.json({
        success: true,
        stats: {
          cardsCount,
          completedCount,
          pendingCount: cardsCount - completedCount,
        },
      });
    } catch (err) {
      console.error("Get column stats error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ======================
  // DUPLICATE COLUMN
  // ======================
  duplicateColumn: async (req, res) => {
    try {
      console.log("🔹 Duplicate Column Request:", req.params.id);

      const column = await Column.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!column) {
        console.log("⚠️ Column not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({
            success: false,
            message: "Column not found or unauthorized",
          });
      }

      const newColumn = await Column.create({
        title: column.title + " (Copy)",
        board: column.board,
        position: column.position + 1,
        owner: req.user.id,
        createdBy: req.user.id,
        color: column.color,
        wipLimit: column.wipLimit,
        settings: column.settings,
      });

      await Board.updateOne(
        { _id: column.board },
        { $push: { columnOrder: newColumn._id }, lastActivity: Date.now() },
      );

      const cards = await Card.find({ column: column._id, owner: req.user.id });
      if (cards.length > 0) {
        const duplicatedCards = cards.map((card) => ({
          text: card.text,
          description: card.description,
          position: card.position,
          column: newColumn._id,
          board: card.board,
          owner: req.user.id,
          createdBy: req.user.id,
          labels: card.labels,
          dueDate: card.dueDate,
          priority: card.priority,
        }));
        await Card.insertMany(duplicatedCards);
        console.log(". Cards duplicated:", duplicatedCards.length);
      }

      console.log(". Column duplicated successfully:", newColumn._id);
      res.json({ success: true, column: newColumn });
    } catch (err) {
      console.error("Duplicate column error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};

module.exports = columnController;
