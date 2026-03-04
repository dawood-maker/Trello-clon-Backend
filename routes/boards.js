// routes/boards.js
const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const auth = require("../middleware/auth");

//====================
// Board Routes
//====================

// GET  /api/boards       → Saare boards fetch karo
// POST /api/boards       → Naya board banao
router.get("/", auth, (req, res, next) => {
  console.log("[Board Router] GET / userId:", req.user?.id);
  boardController.getBoards(req, res, next);
});

router.post("/", auth, (req, res, next) => {
  console.log("[Board Router] POST / userId:", req.user?.id, "body:", req.body);
  boardController.createBoard(req, res, next);
});

//  DELETE /api/boards/all → Reset All (permanent boards safe rahenge)
// NOTE: Yeh /:id se PEHLE hona chahiye warna "all" ek id ban jayega
router.delete("/all", auth, (req, res, next) => {
  console.log("[Board Router] DELETE /all userId:", req.user?.id);
  boardController.deleteAllBoards(req, res, next);
});

// GET    /api/boards/:id  → Ek board
// PUT    /api/boards/:id  → Update board
// DELETE /api/boards/:id  → Delete ek board
router.get("/:id", auth, (req, res, next) => {
  console.log(
    "[Board Router] GET /:id userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
  );
  boardController.getBoard(req, res, next);
});

router.put("/:id", auth, (req, res, next) => {
  console.log(
    "[Board Router] PUT /:id userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
    "body:",
    req.body,
  );
  boardController.updateBoard(req, res, next);
});

router.delete("/:id", auth, (req, res, next) => {
  console.log(
    "[Board Router] DELETE /:id userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
  );
  boardController.deleteBoard(req, res, next);
});

//====================
// Member management
//====================
router.post("/:id/members", auth, (req, res, next) => {
  boardController.addMember(req, res, next);
});

router.delete("/:id/members", auth, (req, res, next) => {
  boardController.removeMember(req, res, next);
});

module.exports = router;
