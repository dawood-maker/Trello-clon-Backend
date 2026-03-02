const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    color: {
      type: String,
      default: "#808080",
      validate: {
        validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
        message: "Color must be a valid hex code",
      },
    },
    description: { type: String, maxlength: 500, default: "" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["admin", "member", "viewer"],
          default: "member",
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    isPublic: { type: Boolean, default: false },
    columnOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Column" }],
    settings: {
      allowComments: { type: Boolean, default: true },
      allowAttachments: { type: Boolean, default: true },
      allowMembersToInvite: { type: Boolean, default: true },
    },
    lastActivity: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for columns
boardSchema.virtual("columns", {
  ref: "Column",
  localField: "_id",
  foreignField: "board",
});

// ------------------------
// Static Methods
// ------------------------
boardSchema.statics.findByUser = async function (userId) {
  console.log("=======================================");
  console.log(`Board.findByUser called for user: ${userId}`);
  const result = await this.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .populate("owner", "name email")
    .populate("members.user", "name email")
    .populate({
      path: "columnOrder",
      populate: { path: "cards", options: { sort: { position: 1 } } },
    })
    .sort("-lastActivity");
  console.log(`Board.findByUser result count: ${result.length}`);
  console.log("=======================================\n");
  return result;
};

// ------------------------
// Instance Methods
// ------------------------
boardSchema.methods.isMember = function (userId) {
  console.log(`Checking membership: user ${userId} on board ${this._id}`);
  const isOwner = this.owner.toString() === userId.toString();
  const isMember = this.members.some(
    (m) => m.user.toString() === userId.toString(),
  );
  console.log(`Membership check result: owner=${isOwner}, member=${isMember}`);
  return isOwner || isMember;
};

boardSchema.methods.getUserRole = function (userId) {
  console.log(`Getting role for user ${userId} on board ${this._id}`);
  if (this.owner.toString() === userId.toString()) return "owner";
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  const role = member ? member.role : null;
  console.log(`Role for user ${userId}: ${role}`);
  return role;
};

boardSchema.methods.hasPermission = function (userId, action) {
  const role = this.getUserRole(userId);
  console.log(
    `Checking permission for user ${userId} on action "${action}" with role "${role}"`,
  );
  if (role === "owner" || role === "admin") return true;
  if (role === "member" && ["read", "create", "update"].includes(action))
    return true;
  if (role === "viewer" && action === "read") return true;
  return false;
};

// ------------------------
// Hooks
// ------------------------
boardSchema.pre("save", function (next) {
  console.log(`Board pre-save hook triggered for board: ${this._id}`);
  this.lastActivity = Date.now();
  next();
});

boardSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    console.log(`Board pre-deleteOne hook triggered for board: ${this._id}`);
    try {
      const Column = mongoose.model("Column");
      const Card = mongoose.model("Card");
      const cols = await Column.find({ board: this._id });
      const ids = cols.map((c) => c._id);
      console.log("Deleting cards:", ids);
      await Card.deleteMany({ column: { $in: ids } });
      await Column.deleteMany({ board: this._id });
      next();
    } catch (err) {
      console.error("Error in pre-deleteOne hook:", err);
      next(err);
    }
  },
);

boardSchema.pre("findOneAndDelete", async function (next) {
  console.log("Board pre-findOneAndDelete hook triggered");
  try {
    const Column = mongoose.model("Column");
    const Card = mongoose.model("Card");
    const board = await this.model.findOne(this.getFilter());
    if (board) {
      console.log("Board found for deletion:", board._id);
      const cols = await Column.find({ board: board._id });
      const ids = cols.map((c) => c._id);
      console.log("Deleting cards:", ids);
      await Card.deleteMany({ column: { $in: ids } });
      await Column.deleteMany({ board: board._id });
    }
    next();
  } catch (err) {
    console.error("Error in pre-findOneAndDelete hook:", err);
    next(err);
  }
});

const Board = mongoose.models.Board || mongoose.model("Board", boardSchema);

module.exports = Board;
