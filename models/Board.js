// models/Board.js
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

    //  Yeh board kabhi delete nahi hoga (Reset All bhi nahi karega)
    isPermanent: { type: Boolean, default: false },

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
  return this.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .populate("owner", "name email")
    .populate("members.user", "name email")
    .sort("-lastActivity");
};

//=========================
// Instance: Check membership
//=========================
boardSchema.methods.isMember = function (userId) {
  return (
    this.owner.toString() === userId.toString() ||
    this.members.some((m) => m.user.toString() === userId.toString())
  );
};

//=========================
// Instance: Get role
//=========================
boardSchema.methods.getUserRole = function (userId) {
  if (this.owner.toString() === userId.toString()) return "owner";
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  return member ? member.role : null;
};

//=========================
// Pre-save middleware
//=========================
boardSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  next();
});

const Board = mongoose.models.Board || mongoose.model("Board", boardSchema);
module.exports = Board;