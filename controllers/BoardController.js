const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const User = require("../models/User");

const boardController = {
  // ✅ Create board with default columns
  createBoard: async (req, res) => {
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
  },

  // ✅ Get all boards (ONLY user's boards)
  getBoards: async (req, res) => {
    try {
      console.log("🔥 getBoards called by user:", req.user.id);
      const boards = await Board.find({ owner: req.user.id })
        .populate("owner", "name email")
        .sort("-lastActivity")
        .lean();

      const populatedBoards = await Promise.all(
        boards.map(async (board) => {
          const columns = await Column.find({
            _id: { $in: board.columnOrder },
            owner: req.user.id,
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
                owner: req.user.id,
              })
                .sort("position")
                .lean();
              return { ...column, cards };
            }),
          );
          return { ...board, columns: columnsWithCards };
        }),
      );

      console.log("✅ Fetched boards count:", populatedBoards.length);
      res.json({
        success: true,
        count: populatedBoards.length,
        boards: populatedBoards,
      });
    } catch (error) {
      console.error("❌ getBoards error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error while fetching boards",
        });
    }
  },

  // ✅ Get single board
  getBoard: async (req, res) => {
    try {
      console.log(
        "🔥 getBoard called for board:",
        req.params.id,
        "by user:",
        req.user.id,
      );
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      }).lean();

      if (!board) {
        console.log("⚠ Board not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      }

      const columns = await Column.find({
        _id: { $in: board.columnOrder },
        owner: req.user.id,
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
            owner: req.user.id,
          })
            .sort("position")
            .lean();
          return { ...column, cards };
        }),
      );

      console.log("✅ Board fetched successfully:", board._id);
      res.json({
        success: true,
        board: { ...board, columns: columnsWithCards },
      });
    } catch (error) {
      console.error("❌ getBoard error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while fetching board" });
    }
  },

  // ✅ Update board
  updateBoard: async (req, res) => {
    try {
      console.log(
        "🔥 updateBoard called for board:",
        req.params.id,
        "by user:",
        req.user.id,
      );
      const { name, color, description, isPublic, settings, columnOrder } =
        req.body;
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!board) {
        console.log("⚠ Board not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      }

      if (name !== undefined) board.name = name;
      if (color !== undefined) board.color = color;
      if (description !== undefined) board.description = description;
      if (isPublic !== undefined) board.isPublic = isPublic;
      if (settings !== undefined)
        board.settings = { ...board.settings, ...settings };
      if (columnOrder !== undefined) board.columnOrder = columnOrder;

      board.lastActivity = Date.now();
      await board.save();

      console.log("✅ Board updated successfully:", board._id);
      res.json({ success: true, message: "Board updated", board });
    } catch (error) {
      console.error("❌ updateBoard error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while updating board" });
    }
  },

  // ✅ Delete board
  deleteBoard: async (req, res) => {
    try {
      console.log(
        "🔥 deleteBoard called for board:",
        req.params.id,
        "by user:",
        req.user.id,
      );
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!board) {
        console.log("⚠ Board not found or unauthorized:", req.params.id);
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      }

      const columns = await Column.find({
        board: board._id,
        owner: req.user.id,
      });
      for (const column of columns) {
        await Card.deleteMany({ column: column._id, owner: req.user.id });
        await Column.findByIdAndDelete(column._id);
      }

      await Board.findByIdAndDelete(board._id);
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { boards: board._id },
      });

      console.log("✅ Board deleted successfully:", board._id);
      res.json({ success: true, message: "Board deleted successfully" });
    } catch (error) {
      console.error("❌ deleteBoard error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while deleting board" });
    }
  },

  // ✅ Add member
  addMember: async (req, res) => {
    try {
      console.log(
        "🔥 addMember called for board:",
        req.params.id,
        "by user:",
        req.user.id,
      );
      const { userId, role = "member" } = req.body;
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!board)
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });

      const userExists = await User.findById(userId);
      if (!userExists)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      if (board.isMember && board.isMember(userId))
        return res
          .status(400)
          .json({ success: false, message: "User already a member" });

      if (board.addMember) board.addMember(userId, role);
      await board.save();

      const updatedBoard = await Board.findById(board._id)
        .populate("owner", "name email")
        .populate("members.user", "name email");

      console.log("✅ Member added to board:", board._id);
      res.json({ success: true, message: "Member added", board: updatedBoard });
    } catch (error) {
      console.error("❌ addMember error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while adding member" });
    }
  },

  // ✅ Remove member
  removeMember: async (req, res) => {
    try {
      console.log(
        "🔥 removeMember called for board:",
        req.params.id,
        "by user:",
        req.user.id,
      );
      const { userId } = req.body;
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!board)
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      if (board.owner.toString() === userId.toString())
        return res
          .status(400)
          .json({ success: false, message: "Cannot remove board owner" });

      if (board.removeMember) board.removeMember(userId);
      await board.save();

      const updatedBoard = await Board.findById(board._id)
        .populate("owner", "name email")
        .populate("members.user", "name email");

      console.log("✅ Member removed from board:", board._id);
      res.json({
        success: true,
        message: "Member removed",
        board: updatedBoard,
      });
    } catch (error) {
      console.error("❌ removeMember error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error while removing member",
        });
    }
  },
};

// Alias functions
boardController.getUserBoards = boardController.getBoards;
boardController.saveBoard = boardController.updateBoard;

module.exports = boardController;
