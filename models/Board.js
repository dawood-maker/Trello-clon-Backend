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

//=========================
// Virtual columns
//=========================
boardSchema.virtual("columns", {
  ref: "Column",
  localField: "_id",
  foreignField: "board",
});

//=========================
// Static: Find boards for a user
//=========================
boardSchema.statics.findByUser = async function (userId) {
  console.log(`🔹 Fetching boards for user ${userId}`);
  return this.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .populate("owner", "name email")
    .populate("members.user", "name email")
    .populate({
      path: "columnOrder",
      populate: {
        path: "cards",
        options: { sort: { position: 1 } },
      },
    })
    .sort("-lastActivity");
};

//=========================
// Instance: Check membership
//=========================
boardSchema.methods.isMember = function (userId) {
  const member =
    this.owner.toString() === userId.toString() ||
    this.members.some((m) => m.user.toString() === userId.toString());
  console.log(`🔹 User ${userId} is member of board ${this._id}? ${member}`);
  return member;
};

//=========================
// Instance: Get role
//=========================
boardSchema.methods.getUserRole = function (userId) {
  if (this.owner.toString() === userId.toString()) {
    console.log(`🔹 User ${userId} is owner of board ${this._id}`);
    return "owner";
  }
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  console.log(
    `🔹 User ${userId} role on board ${this._id}: ${member ? member.role : "none"}`,
  );
  return member ? member.role : null;
};

//=========================
// Instance: Check permission
//=========================
boardSchema.methods.hasPermission = function (userId, action) {
  const role = this.getUserRole(userId);
  let allowed = false;
  if (role === "owner" || role === "admin") allowed = true;
  else if (role === "member" && ["read", "create", "update"].includes(action))
    allowed = true;
  else if (role === "viewer" && action === "read") allowed = true;

  console.log(
    `🔹 User ${userId} action "${action}" on board ${this._id} allowed? ${allowed}`,
  );
  return allowed;
};

//=========================
// Pre-save middleware
//=========================
boardSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  console.log(`🔹 Board ${this._id} lastActivity updated`);
  next();
});

//=========================
// Pre-delete middleware (deleteOne)
//=========================
boardSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      console.log(`⚠️ Deleting board ${this._id} (deleteOne)`);
      const Column = mongoose.model("Column");
      const Card = mongoose.model("Card");

      const cols = await Column.find({ board: this._id });
      const ids = cols.map((c) => c._id);

      await Card.deleteMany({ column: { $in: ids } });
      await Column.deleteMany({ board: this._id });

      console.log(
        `🔹 Deleted ${cols.length} columns and associated cards from board ${this._id}`,
      );
      next();
    } catch (err) {
      console.error("Error deleting board:", err);
      next(err);
    }
  },
);

//=========================
// Pre-delete middleware (findOneAndDelete)
//=========================
boardSchema.pre("findOneAndDelete", async function (next) {
  try {
    const board = await this.model.findOne(this.getFilter());
    if (board) {
      console.log(`⚠️ Deleting board ${board._id} (findOneAndDelete)`);
      const Column = mongoose.model("Column");
      const Card = mongoose.model("Card");

      const cols = await Column.find({ board: board._id });
      const ids = cols.map((c) => c._id);

      await Card.deleteMany({ column: { $in: ids } });
      await Column.deleteMany({ board: board._id });

      console.log(
        `🔹 Deleted ${cols.length} columns and associated cards from board ${board._id}`,
      );
    }
    next();
  } catch (err) {
    console.error("Error deleting board (findOneAndDelete):", err);
    next(err);
  }
});

const Board = mongoose.models.Board || mongoose.model("Board", boardSchema);
module.exports = Board;
