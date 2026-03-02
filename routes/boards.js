const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const auth = require("../middleware/auth");

// Enhanced Logging Middleware
const logRequest = (req, res, next) => {
  console.log("=======================================");
  console.log(`Incoming Board Request: ${req.method} ${req.originalUrl}`);
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("Query:", req.query);

  // Capture response
  const originalJson = res.json;
  res.json = function (data) {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", data);
    console.log("=======================================");
    return originalJson.call(this, data);
  };

  next();
};

// =======================
// Board routes
// =======================
router.get("/", logRequest, auth, boardController.getBoards);
router.post("/", logRequest, auth, boardController.createBoard);
router.get("/:id", logRequest, auth, boardController.getBoard);
router.put("/:id", logRequest, auth, boardController.updateBoard);
router.delete("/:id", logRequest, auth, boardController.deleteBoard);

// =======================
// Member management routes
// =======================
router.post("/:id/members", logRequest, auth, boardController.addMember);
router.delete("/:id/members", logRequest, auth, boardController.removeMember);

module.exports = router;
