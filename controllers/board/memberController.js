// controllers/board/memberController.js
const Board = require("../../models/Board");
const User = require("../../models/User");

// ✅ Add member
const addMember = async (req, res) => {
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
};

// ✅ Remove member
const removeMember = async (req, res) => {
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
};

module.exports = { addMember, removeMember };