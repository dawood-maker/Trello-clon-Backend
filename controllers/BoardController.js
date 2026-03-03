const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const User = require("../models/User");

const boardController = {
  //================================================
  //  Create board with default columns
  //================================================
  createBoard: async (req, res) => {
    console.log(
      "createBoard called with body:",
      req.body,
      "by user:",
      req.user.id,
    );
    try {
      const { name, color, description, isPublic } = req.body;

      const board = await Board.create({
        name: name || "New Board",
        color: color || "#0079BF",
        description: description || "",
        isPublic: isPublic || false,
        owner: req.user.id,
      });
      console.log("Board created:", board._id, board.name);

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
        "Default columns created:",
        columns.map((c) => c.title),
      );

      board.columnOrder = columns.map((col) => col._id);
      await board.save();
      console.log("Board columnOrder updated");

      await User.findByIdAndUpdate(req.user.id, {
        $push: { boards: board._id },
      });
      console.log("Board added to user's boards array");

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
      console.log("Default cards created");

      const populatedBoard = await Board.findById(board._id)
        .populate("owner", "name email")
        .lean();
      console.log("Returning populated board");

      res.status(201).json({
        success: true,
        message: "Board created with default columns",
        board: { ...populatedBoard, columns },
      });
    } catch (error) {
      console.error("Create board error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while creating board" });
    }
  },

  //================================================
  //  Get all boards (ONLY user's boards)
  //================================================
  getBoards: async (req, res) => {
    console.log("getBoards called by user:", req.user.id);
    try {
      const boards = await Board.find({ owner: req.user.id })
        .populate("owner", "name email")
        .sort("-lastActivity")
        .lean();
      console.log(`Found ${boards.length} boards for user`);

      const populatedBoards = await Promise.all(
        boards.map(async (board) => {
          const columns = await Column.find({
            _id: { $in: board.columnOrder },
            owner: req.user.id,
          }).lean();
          console.log(
            `Board ${board._id}: Found ${columns.length} columns for user`,
          );

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
              console.log(
                `Column ${column._id}: Found ${cards.length} cards for user`,
              );
              return { ...column, cards };
            }),
          );

          return { ...board, columns: columnsWithCards };
        }),
      );

      res.json({
        success: true,
        count: populatedBoards.length,
        boards: populatedBoards,
      });
    } catch (error) {
      console.error("Get boards error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error while fetching boards",
        });
    }
  },

  //================================================
  //  Get single board (with user validation)
  //================================================
  getBoard: async (req, res) => {
    console.log(
      "getBoard called for board:",
      req.params.id,
      "by user:",
      req.user.id,
    );
    try {
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      }).lean();

      if (!board) {
        console.log("Board not found or unauthorized");
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
          console.log(
            `Column ${column._id}: Found ${cards.length} cards for user`,
          );
          return { ...column, cards };
        }),
      );

      res.json({
        success: true,
        board: { ...board, columns: columnsWithCards },
      });
    } catch (error) {
      console.error("Get board error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while fetching board" });
    }
  },

  //================================================
  //  Update board (with ownership check)
  //================================================
  updateBoard: async (req, res) => {
    console.log(
      "updateBoard called for board:",
      req.params.id,
      "by user:",
      req.user.id,
      "body:",
      req.body,
    );
    try {
      const { name, color, description, isPublic, settings, columnOrder } =
        req.body;

      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!board) {
        console.log("Board not found or unauthorized");
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
      console.log("Board updated successfully");

      res.json({ success: true, message: "Board updated", board });
    } catch (error) {
      console.error("Update board error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while updating board" });
    }
  },

  //================================================
  //  Delete board (with cascade delete of user's data only)
  //================================================
  deleteBoard: async (req, res) => {
    console.log(
      "deleteBoard called for board:",
      req.params.id,
      "by user:",
      req.user.id,
    );
    try {
      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!board) {
        console.log("Board not found or unauthorized");
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
        console.log(`Deleted column ${column._id} and its cards`);
      }

      await Board.findByIdAndDelete(board._id);
      console.log("Board deleted:", board._id);

      await User.findByIdAndUpdate(req.user.id, {
        $pull: { boards: board._id },
      });
      console.log("Board removed from user's boards array");

      res.json({ success: true, message: "Board deleted successfully" });
    } catch (error) {
      console.error("Delete board error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while deleting board" });
    }
  },

  //================================================
  //  Add member (with ownership check)
  //================================================
  addMember: async (req, res) => {
    console.log(
      "addMember called for board:",
      req.params.id,
      "body:",
      req.body,
      "by user:",
      req.user.id,
    );
    try {
      const { userId, role = "member" } = req.body;

      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!board) {
        console.log("Board not found or unauthorized");
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });
      }

      const userExists = await User.findById(userId);
      if (!userExists)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      if (board.isMember && board.isMember(userId)) {
        console.log("User already a member:", userId);
        return res
          .status(400)
          .json({ success: false, message: "User already a member" });
      }

      if (board.addMember) board.addMember(userId, role);
      await board.save();
      console.log("Member added:", userId);

      const updatedBoard = await Board.findById(board._id)
        .populate("owner", "name email")
        .populate("members.user", "name email");
      res.json({ success: true, message: "Member added", board: updatedBoard });
    } catch (error) {
      console.error("Add member error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error while adding member" });
    }
  },

  //================================================
  //  Remove member (with ownership check)
  //================================================
  removeMember: async (req, res) => {
    console.log(
      "removeMember called for board:",
      req.params.id,
      "body:",
      req.body,
      "by user:",
      req.user.id,
    );
    try {
      const { userId } = req.body;

      const board = await Board.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!board)
        return res
          .status(404)
          .json({ success: false, message: "Board not found or unauthorized" });

      if (board.owner.toString() === userId.toString()) {
        console.log("Cannot remove board owner:", userId);
        return res
          .status(400)
          .json({ success: false, message: "Cannot remove board owner" });
      }

      if (board.removeMember) board.removeMember(userId);
      await board.save();
      console.log("Member removed:", userId);

      const updatedBoard = await Board.findById(board._id)
        .populate("owner", "name email")
        .populate("members.user", "name email");
      res.json({
        success: true,
        message: "Member removed",
        board: updatedBoard,
      });
    } catch (error) {
      console.error("Remove member error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error while removing member",
        });
    }
  },
};

//================================================
//  Alias functions to match routes
//================================================
boardController.getUserBoards = boardController.getBoards;
boardController.saveBoard = boardController.updateBoard;

module.exports = boardController;
