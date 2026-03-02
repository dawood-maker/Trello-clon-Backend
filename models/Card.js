const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    description: { type: String, maxlength: 5000, default: "" },
    position: { type: Number, required: true, min: 0 },
    column: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    labels: [
      {
        name: { type: String, maxlength: 50 },
        color: {
          type: String,
          validate: {
            validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
            message: "Color must be a valid hex code",
          },
        },
      },
    ],
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    lastActivity: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ------------------------
// Indexes
// ------------------------
cardSchema.index({ column: 1, owner: 1, position: 1 });
cardSchema.index({ board: 1, owner: 1 });
cardSchema.index({ owner: 1, dueDate: 1 });
cardSchema.index({ assignedTo: 1 });

// ------------------------
// Static Methods
// ------------------------
cardSchema.statics.findByColumnAndUser = async function (columnId, userId) {
  console.log("=======================================");
  console.log("Card.findByColumnAndUser called:", { columnId, userId });
  const result = await this.find({ column: columnId, owner: userId })
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .sort("position");
  console.log("Result count:", result.length);
  console.log("=======================================\n");
  return result;
};

cardSchema.statics.findByBoardAndUser = async function (boardId, userId) {
  console.log("=======================================");
  console.log("Card.findByBoardAndUser called:", { boardId, userId });
  const result = await this.find({ board: boardId, owner: userId })
    .populate("column", "title")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .sort("position");
  console.log("Result count:", result.length);
  console.log("=======================================\n");
  return result;
};

cardSchema.statics.countByColumnAndUser = async function (columnId, userId) {
  console.log("Card.countByColumnAndUser called:", { columnId, userId });
  const count = await this.countDocuments({ column: columnId, owner: userId });
  console.log("Count:", count);
  return count;
};

// ------------------------
// Instance Methods
// ------------------------
cardSchema.methods.isOwnedBy = function (userId) {
  const result = this.owner.toString() === userId.toString();
  console.log(`Card.isOwnedBy: user ${userId} => ${result}`);
  return result;
};

cardSchema.methods.isAssignedTo = function (userId) {
  const result = this.assignedTo.some(
    (id) => id.toString() === userId.toString(),
  );
  console.log(`Card.isAssignedTo: user ${userId} => ${result}`);
  return result;
};

cardSchema.methods.toggleCompletion = function () {
  this.isCompleted = !this.isCompleted;
  this.completedAt = this.isCompleted ? Date.now() : null;
  console.log(
    `Card.toggleCompletion: isCompleted=${this.isCompleted}, completedAt=${this.completedAt}`,
  );
};

cardSchema.methods.addLabel = function (name, color) {
  if (!this.labels.some((l) => l.name === name)) {
    this.labels.push({ name, color });
    console.log(`Card.addLabel: added ${name} ${color}`);
  } else {
    console.log(`Card.addLabel: skipped (exists) ${name}`);
  }
};

cardSchema.methods.removeLabel = function (name) {
  this.labels = this.labels.filter((l) => l.name !== name);
  console.log(`Card.removeLabel: removed ${name}`);
};

// ------------------------
// Pre-save middleware
// ------------------------
cardSchema.pre("save", function (next) {
  console.log("Card pre-save triggered for card:", this._id);
  this.lastActivity = Date.now();
  if (!this.owner && this.createdBy) {
    this.owner = this.createdBy;
    console.log("Card owner synced with createdBy:", this.owner);
  }
  if (this.isModified("isCompleted")) {
    this.completedAt = this.isCompleted ? Date.now() : null;
    console.log("Card pre-save updated completedAt:", this.completedAt);
  }
  next();
});

// ------------------------
// Virtuals
// ------------------------
cardSchema.virtual("isOverdue").get(function () {
  const overdue =
    this.dueDate && !this.isCompleted && new Date() > this.dueDate;
  console.log(`Card.virtual.isOverdue accessed: ${overdue}`);
  return overdue;
});

cardSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  console.log(`Card.virtual.daysUntilDue accessed: ${days}`);
  return days;
});

// ------------------------
// Prevent OverwriteModelError
// ------------------------
const Card = mongoose.models.Card || mongoose.model("Card", cardSchema);

module.exports = Card;
