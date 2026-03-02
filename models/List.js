const mongoose = require("mongoose");

const ListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "List name is required"],
      trim: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("List", ListSchema);
