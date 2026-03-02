const Board = require("../models/Board");

async function checkBoardAccess(userId, boardId) {
  console.log("=======================================");
  console.log(`🔍 Checking board access...`);
  console.log(`User ID: ${userId}`);
  console.log(`Board ID: ${boardId}`);
  console.log("=======================================\n");

  try {
    console.log("📌 Fetching board from DB...");
    const board = await Board.findById(boardId)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!board) {
      console.error(`❌ Board not found: ${boardId}`);
      throw { status: 403, message: "Access denied to this board" };
    }

    console.log(`📋 Board found: ${board.name}`);
    console.log(`👤 Owner: ${board.owner?._id} (${board.owner?.name})`);
    console.log(
      `👥 Members: ${board.members.map((m) => `${m.user?._id} (${m.user?.name})`).join(", ") || "None"}`,
    );

    console.log("🔎 Checking if user is a member of the board...");
    if (!board.isMember(userId)) {
      console.error(`❌ User ${userId} is not a member of board ${boardId}`);
      throw { status: 403, message: "Access denied to this board" };
    }

    console.log(
      `✅ Access granted: User ${userId} can access board ${boardId}`,
    );
    console.log("=======================================\n");

    return board;
  } catch (error) {
    console.error("=======================================");
    console.error("❌ Error in checkBoardAccess:", error);
    console.error("=======================================");
    throw error;
  }
}

module.exports = checkBoardAccess;
