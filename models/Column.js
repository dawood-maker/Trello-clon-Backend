const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 50 },
    position: { type: Number, required: true, min: 0 },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    wipLimit: { type: Number, min: 0, default: 0 },
    color: { type: String, default: null },
    isCollapsed: { type: Boolean, default: false },
    settings: {
      allowCardCreation: { type: Boolean, default: true },
      allowCardMoving: { type: Boolean, default: true },
      showCardCount: { type: Boolean, default: true },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
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
columnSchema.index({ board: 1, owner: 1, position: 1 });
columnSchema.index({ owner: 1 });

// ------------------------
// Virtual populate for cards
// ------------------------
columnSchema.virtual("cards", {
  ref: "Card",
  localField: "_id",
  foreignField: "column",
});

// ------------------------
// Static Methods
// ------------------------
columnSchema.statics.findByBoardAndUser = async function (boardId, userId) {
  console.log("=======================================");
  console.log("Column.findByBoardAndUser called:", { boardId, userId });
  const result = await this.find({ board: boardId, owner: userId })
    .populate({
      path: "cards",
      match: { owner: userId },
      options: { sort: { position: 1 } },
    })
    .sort("position");
  console.log("Result count:", result.length);
  console.log("=======================================\n");
  return result;
};

columnSchema.statics.countByBoardAndUser = async function (boardId, userId) {
  console.log("Column.countByBoardAndUser called:", { boardId, userId });
  const count = await this.countDocuments({ board: boardId, owner: userId });
  console.log("Count:", count);
  return count;
};

// ------------------------
// Instance Methods
// ------------------------
columnSchema.methods.isOwnedBy = function (userId) {
  const result = this.owner?.toString() === userId.toString();
  console.log(`Column.isOwnedBy: user ${userId} => ${result}`);
  return result;
};

// ------------------------
// Hooks
// ------------------------
columnSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  console.log("Column pre-save triggered for column:", this._id);
  next();
});

columnSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    console.log("Column pre-deleteOne triggered for column:", this._id);
    try {
      const Card = mongoose.model("Card");
      const result = await Card.deleteMany({
        column: this._id,
        owner: this.owner,
      });
      console.log(
        `Deleted ${result.deletedCount} cards for column ${this._id}`,
      );
      next();
    } catch (error) {
      console.error("Error in pre-deleteOne hook:", error);
      next(error);
    }
  },
);

columnSchema.pre("findOneAndDelete", async function (next) {
  console.log("Column pre-findOneAndDelete triggered");
  try {
    const Card = mongoose.model("Card");
    const column = await this.model.findOne(this.getFilter());
    if (column) {
      const result = await Card.deleteMany({
        column: column._id,
        owner: column.owner,
      });
      console.log(
        `Deleted ${result.deletedCount} cards for column ${column._id}`,
      );
    }
    next();
  } catch (error) {
    console.error("Error in pre-findOneAndDelete hook:", error);
    next(error);
  }
});

columnSchema.pre("deleteMany", async function (next) {
  const filter = this.getFilter();
  if (!filter.owner) {
    console.error("Column.deleteMany prevented: owner not specified");
    return next(new Error("Owner must be specified when deleting columns"));
  }
  console.log("Column.deleteMany called with owner filter:", filter.owner);
  next();
});

// ------------------------
// Prevent OverwriteModelError
// ------------------------
const Column = mongoose.models.Column || mongoose.model("Column", columnSchema);

module.exports = Column;
