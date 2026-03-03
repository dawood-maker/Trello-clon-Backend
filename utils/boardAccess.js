const Board = require("../models/Board");

async function checkBoardAccess(userId, boardId) {
  console.log(
    `[CheckBoardAccess] Checking access for userId=${userId} on boardId=${boardId}`,
  );

  const board = await Board.findById(boardId);
  if (!board) {
    console.log(
      `[CheckBoardAccess] Board not found: boardId=${boardId}. Access denied.`,
    );
    throw { status: 403, message: "Access denied to this board" };
  }

  if (!board.isMember(userId)) {
    console.log(
      `[CheckBoardAccess] User is not a member: userId=${userId}, boardId=${boardId}. Access denied.`,
    );
    throw { status: 403, message: "Access denied to this board" };
  }

  console.log(
    `[CheckBoardAccess] Access granted: userId=${userId}, boardId=${boardId}`,
  );
  return board;
}

module.exports = checkBoardAccess;
