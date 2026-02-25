const Board = require("../models/Board");

async function checkBoardAccess(userId, boardId) {
  console.log(`🔍 Checking access for user ${userId} to board ${boardId}`);

  const board = await Board.findById(boardId)
    .populate("owner", "name email")
    .populate("members.user", "name email");

  if (!board) {
    console.error(`❌ Board not found: ${boardId}`);
    throw { status: 403, message: "Access denied to this board" };
  }

  console.log(`📋 Board found: ${board.name} (Owner: ${board.owner?._id})`);

  if (!board.isMember(userId)) {
    console.error(`❌ User ${userId} is not a member of board ${boardId}`);
    throw { status: 403, message: "Access denied to this board" };
  }

  console.log(`✅ User ${userId} has access to board ${boardId}`);
  return board;
}

module.exports = checkBoardAccess;
