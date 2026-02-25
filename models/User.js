const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },

    // OTP fields
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },

    isVerified: { type: Boolean, default: true },

    boards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Board" }],
  },
  { timestamps: true },
);

// Instance method: Log user info
userSchema.methods.logInfo = function () {
  console.log(
    `User logInfo called: ${this._id}, name: ${this.name}, email: ${this.email}`,
  );
};

// Pre-save middleware
userSchema.pre("save", function (next) {
  console.log(
    `User pre-save triggered for user: ${this._id}, name: ${this.name}`,
  );
  next();
});

// Pre-update middleware (for findOneAndUpdate, updateOne)
userSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  console.log(
    `User update triggered with filter:`,
    this.getFilter(),
    "update:",
    this.getUpdate(),
  );
  next();
});

// Post-save middleware
userSchema.post("save", function (doc) {
  console.log(`User saved: ${doc._id}, name: ${doc.name}`);
});

// Post-remove middleware
userSchema.post("remove", function (doc) {
  console.log(`User removed: ${doc._id}, name: ${doc.name}`);
});

// Prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
