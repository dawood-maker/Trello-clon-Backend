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
    //🔥 owner is no longer required
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

// Indexes
columnSchema.index({ board: 1, owner: 1, position: 1 });
columnSchema.index({ owner: 1 });

// Virtual populate for cards
columnSchema.virtual("cards", {
  ref: "Card",
  localField: "_id",
  foreignField: "column",
});

//========================================
// Static method: Find columns by board and user
//========================================
columnSchema.statics.findByBoardAndUser = async function (boardId, userId) {
  console.log(
    `[Column] findByBoardAndUser called with boardId=${boardId}, userId=${userId}`,
  );
  return this.find({
    board: boardId,
    owner: userId,
  })
    .populate({
      path: "cards",
      match: { owner: userId },
      options: { sort: { position: 1 } },
    })
    .sort("position");
};

//========================================
// Static method: Count columns by board and user
//========================================
columnSchema.statics.countByBoardAndUser = async function (boardId, userId) {
  console.log(
    `[Column] countByBoardAndUser called with boardId=${boardId}, userId=${userId}`,
  );
  return this.countDocuments({ board: boardId, owner: userId });
};

//========================================
// Instance method: Check ownership
//========================================
columnSchema.methods.isOwnedBy = function (userId) {
  const owned = this.owner?.toString() === userId.toString();
  console.log(`[Column] isOwnedBy check for userId=${userId}: ${owned}`);
  return owned;
};

//================================
// Update lastActivity on save
//================================
columnSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  console.log(
    `[Column] Saving column with id=${this._id}, lastActivity updated`,
  );
  next();
});

//================================
// Delete cards when column is deleted
//================================
columnSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      console.log(`[Column] deleteOne called for column id=${this._id}`);
      const Card = mongoose.model("Card");
      await Card.deleteMany({
        column: this._id,
        owner: this.owner,
      });
      console.log(`[Column] Related cards deleted for column id=${this._id}`);
      next();
    } catch (error) {
      next(error);
    }
  },
);

//================================
// Delete cards when using findOneAndDelete
//================================
columnSchema.pre("findOneAndDelete", async function (next) {
  try {
    const Card = mongoose.model("Card");
    const column = await this.model.findOne(this.getFilter());
    if (column) {
      console.log(
        `[Column] findOneAndDelete: deleting cards for column id=${column._id}`,
      );
      await Card.deleteMany({
        column: column._id,
        owner: column.owner,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

//================================
// Prevent deleteMany without owner
//================================
columnSchema.pre("deleteMany", async function (next) {
  const filter = this.getFilter();
  console.log(`[Column] deleteMany called with filter:`, filter);
  if (!filter.owner) {
    console.log(`[Column] deleteMany blocked: owner not specified`);
    return next(new Error("Owner must be specified when deleting columns"));
  }
  next();
});

const Column = mongoose.models.Column || mongoose.model("Column", columnSchema);
module.exports = Column;
