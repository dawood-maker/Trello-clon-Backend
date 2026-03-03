const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const auth = require("../middleware/auth");

//====================
// Board Routes
//====================
router.get("/", auth, (req, res, next) => {
  console.log("[Board Router] GET / called by userId:", req.user?.id);
  boardController.getBoards(req, res, next);
});

router.post("/", auth, (req, res, next) => {
  console.log(
    "[Board Router] POST / called by userId:",
    req.user?.id,
    "with body:",
    req.body,
  );
  boardController.createBoard(req, res, next);
});

router.get("/:id", auth, (req, res, next) => {
  console.log(
    "[Board Router] GET /:id called by userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
  );
  boardController.getBoard(req, res, next);
});

router.put("/:id", auth, (req, res, next) => {
  console.log(
    "[Board Router] PUT /:id called by userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
    "with body:",
    req.body,
  );
  boardController.updateBoard(req, res, next);
});

router.delete("/:id", auth, (req, res, next) => {
  console.log(
    "[Board Router] DELETE /:id called by userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
  );
  boardController.deleteBoard(req, res, next);
});

//====================
// Member management routes
//====================
router.post("/:id/members", auth, (req, res, next) => {
  console.log(
    "[Board Router] POST /:id/members called by userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
    "with body:",
    req.body,
  );
  boardController.addMember(req, res, next);
});

router.delete("/:id/members", auth, (req, res, next) => {
  console.log(
    "[Board Router] DELETE /:id/members called by userId:",
    req.user?.id,
    "boardId:",
    req.params.id,
    "with body:",
    req.body,
  );
  boardController.removeMember(req, res, next);
});

module.exports = router;
