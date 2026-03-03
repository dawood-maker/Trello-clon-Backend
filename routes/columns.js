const express = require("express");
const router = express.Router();
const columnController = require("../controllers/columnController");
const auth = require("../middleware/auth");

// @route   POST /api/columns
router.post("/", auth, (req, res, next) => {
  console.log(
    "[Columns Router] POST / called by userId:",
    req.user?.id,
    "with body:",
    req.body,
  );
  columnController.createColumn(req, res, next);
});

// @route   GET /api/columns/board/:boardId
router.get("/board/:boardId", auth, (req, res, next) => {
  console.log(
    "[Columns Router] GET /board/:boardId called by userId:",
    req.user?.id,
    "boardId:",
    req.params.boardId,
  );
  columnController.getColumnsByBoard(req, res, next);
});

// @route   GET /api/columns/:id
router.get("/:id", auth, (req, res, next) => {
  console.log(
    "[Columns Router] GET /:id called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
  );
  columnController.getColumn(req, res, next);
});

// @route   PUT /api/columns/:id
router.put("/:id", auth, (req, res, next) => {
  console.log(
    "[Columns Router] PUT /:id called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
    "with body:",
    req.body,
  );
  columnController.updateColumn(req, res, next);
});

// @route   DELETE /api/columns/:id
router.delete("/:id", auth, (req, res, next) => {
  console.log(
    "[Columns Router] DELETE /:id called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
  );
  columnController.deleteColumn(req, res, next);
});

// @route   PUT /api/columns/:id/position
router.put("/:id/position", auth, (req, res, next) => {
  console.log(
    "[Columns Router] PUT /:id/position called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
    "with body:",
    req.body,
  );
  columnController.updateColumnPosition(req, res, next);
});

// @route   PUT /api/columns/:id/move
router.put("/:id/move", auth, (req, res, next) => {
  console.log(
    "[Columns Router] PUT /:id/move called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
    "with body:",
    req.body,
  );
  columnController.moveColumn(req, res, next);
});

// @route   GET /api/columns/:id/stats
router.get("/:id/stats", auth, (req, res, next) => {
  console.log(
    "[Columns Router] GET /:id/stats called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
  );
  columnController.getColumnStats(req, res, next);
});

// @route   POST /api/columns/:id/duplicate
router.post("/:id/duplicate", auth, (req, res, next) => {
  console.log(
    "[Columns Router] POST /:id/duplicate called by userId:",
    req.user?.id,
    "columnId:",
    req.params.id,
  );
  columnController.duplicateColumn(req, res, next);
});

module.exports = router;
