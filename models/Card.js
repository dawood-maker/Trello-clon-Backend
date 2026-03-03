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

// Indexes
cardSchema.index({ column: 1, owner: 1, position: 1 });
cardSchema.index({ board: 1, owner: 1 });
cardSchema.index({ owner: 1, dueDate: 1 });
cardSchema.index({ assignedTo: 1 });

//===========================================
// Static Methods
//===========================================
cardSchema.statics.findByColumnAndUser = async function (columnId, userId) {
  console.log(`🔹 Finding cards for column ${columnId} and user ${userId}`);
  return this.find({ column: columnId, owner: userId })
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .sort("position");
};

cardSchema.statics.findByBoardAndUser = async function (boardId, userId) {
  console.log(`🔹 Finding cards for board ${boardId} and user ${userId}`);
  return this.find({ board: boardId, owner: userId })
    .populate("column", "title")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .sort("position");
};

cardSchema.statics.countByColumnAndUser = async function (columnId, userId) {
  console.log(`🔹 Counting cards for column ${columnId} and user ${userId}`);
  return this.countDocuments({ column: columnId, owner: userId });
};

//===========================================
// Instance Methods
//===========================================
cardSchema.methods.isOwnedBy = function (userId) {
  const isOwner = this.owner.toString() === userId.toString();
  console.log(`🔹 Checking ownership: ${userId} owns card? ${isOwner}`);
  return isOwner;
};

cardSchema.methods.isAssignedTo = function (userId) {
  const assigned = this.assignedTo.some(
    (id) => id.toString() === userId.toString(),
  );
  console.log(`🔹 Checking assignment: ${userId} assigned? ${assigned}`);
  return assigned;
};

cardSchema.methods.toggleCompletion = function () {
  this.isCompleted = !this.isCompleted;
  this.completedAt = this.isCompleted ? Date.now() : null;
  console.log(
    `🔹 Toggled completion: ${this._id}, isCompleted=${this.isCompleted}`,
  );
};

cardSchema.methods.addLabel = function (name, color) {
  if (!this.labels.some((l) => l.name === name)) {
    this.labels.push({ name, color });
    console.log(
      `🔹 Added label "${name}" with color "${color}" to card ${this._id}`,
    );
  } else {
    console.log(`⚠️ Label "${name}" already exists on card ${this._id}`);
  }
};

cardSchema.methods.removeLabel = function (name) {
  this.labels = this.labels.filter((l) => l.name !== name);
  console.log(`🔹 Removed label "${name}" from card ${this._id}`);
};

//===========================================
// Middleware
//===========================================
cardSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  if (!this.owner && this.createdBy) {
    this.owner = this.createdBy;
    console.log(`🔹 Owner synced with createdBy for card ${this._id}`);
  }
  next();
});

cardSchema.pre("save", function (next) {
  if (this.isModified("isCompleted")) {
    this.completedAt = this.isCompleted ? Date.now() : null;
    console.log(`🔹 completedAt updated for card ${this._id}`);
  }
  next();
});

//===========================================
// Virtuals
//===========================================
cardSchema.virtual("isOverdue").get(function () {
  const overdue =
    this.dueDate && !this.isCompleted && new Date() > this.dueDate;
  if (overdue) console.log(`⚠️ Card ${this._id} is overdue`);
  return overdue;
});

cardSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  console.log(`🔹 Card ${this._id} has ${days} days until due`);
  return days;
});

//===========================================
// Prevent OverwriteModelError
//===========================================
const Card = mongoose.models.Card || mongoose.model("Card", cardSchema);
module.exports = Card;
