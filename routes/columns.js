const express = require("express");
const router = express.Router();
const columnController = require("../controllers/columnController");
const auth = require("../middleware/auth");

// Enhanced Logging Middleware
const logRequest = (req, res, next) => {
  console.log("=======================================");
  console.log(`Incoming Column Request: ${req.method} ${req.originalUrl}`);
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("Query:", req.query);

  // Capture JSON response
  const originalJson = res.json;
  res.json = function (data) {
    console.log("Response Status:", res.statusCode);
    console.log("Response Body:", data);
    console.log("=======================================");
    return originalJson.call(this, data);
  };

  // Log error status codes
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      console.error("Error Response Status:", res.statusCode);
      console.log("=======================================");
    }
  });

  next();
};

// =======================
// Column Routes
// =======================

// Create a new column
router.post("/", logRequest, auth, columnController.createColumn);

// Get columns by board
router.get(
  "/board/:boardId",
  logRequest,
  auth,
  columnController.getColumnsByBoard,
);

// Get single column by ID
router.get("/:id", logRequest, auth, columnController.getColumn);

// Update column
router.put("/:id", logRequest, auth, columnController.updateColumn);

// Delete column
router.delete("/:id", logRequest, auth, columnController.deleteColumn);

// Update column position
router.put(
  "/:id/position",
  logRequest,
  auth,
  columnController.updateColumnPosition,
);

// Move column to different board
router.put("/:id/move", logRequest, auth, columnController.moveColumn);

// Get column statistics
router.get("/:id/stats", logRequest, auth, columnController.getColumnStats);

// Duplicate column
router.post(
  "/:id/duplicate",
  logRequest,
  auth,
  columnController.duplicateColumn,
);

module.exports = router;
