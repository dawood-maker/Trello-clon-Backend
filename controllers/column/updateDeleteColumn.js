// controllers/column/updateDeleteColumn.js
const Column = require("../../models/Column");
const Board = require("../../models/Board");
const Card = require("../../models/Card");

// ======================
// UPDATE COLUMN
// ======================
const updateColumn = async (req, res) => {
  try {
    const { title, color, wipLimit, isCollapsed, settings } = req.body;
    console.log(
      "🔥 updateColumn called by user:",
      req.user.id,
      "columnId:",
      req.params.id,
    );

    const column = await Column.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!column) {
      console.log("⚠ Column not found or unauthorized:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Column not found or unauthorized",
      });
    }

    if (title !== undefined) column.title = title;
    if (color !== undefined) column.color = color;
    if (wipLimit !== undefined) column.wipLimit = wipLimit;
    if (isCollapsed !== undefined) column.isCollapsed = isCollapsed;
    if (settings !== undefined)
      column.settings = { ...column.settings, ...settings };

    await column.save();
    await Board.findByIdAndUpdate(column.board, { lastActivity: Date.now() });

    console.log("✅ Column updated successfully:", column._id);
    res.json({ success: true, column });
  } catch (err) {
    console.error("❌ Update column error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================
// DELETE COLUMN
// ======================
const deleteColumn = async (req, res) => {
  try {
    console.log(
      "🔥 deleteColumn called by user:",
      req.user.id,
      "columnId:",
      req.params.id,
    );

    const column = await Column.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!column) {
      console.log("⚠ Column not found or unauthorized:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Column not found or unauthorized",
      });
    }

    await Board.updateOne(
      { _id: column.board },
      { $pull: { columnOrder: column._id }, lastActivity: Date.now() },
    );
    await Card.deleteMany({ column: column._id, owner: req.user.id });
    await Column.findByIdAndDelete(req.params.id);

    console.log("✅ Column deleted successfully:", column._id);
    res.json({ success: true, message: "Column deleted" });
  } catch (err) {
    console.error("❌ Delete column error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { updateColumn, deleteColumn };
