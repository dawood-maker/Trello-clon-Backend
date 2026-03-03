// models/User.js
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
    //============================
    // OTP fields - UPDATED NAMES (matching controller)
    //============================
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    isVerified: { type: Boolean, default: true },
    boards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Board" }],
  },
  { timestamps: true },
);

//============================
// Middleware for logging saves
//============================
userSchema.pre("save", function (next) {
  console.log(`[User] Saving user: id=${this._id}, email=${this.email}`);
  next();
});

//============================
// Middleware for logging updates
//============================
userSchema.pre("updateOne", function (next) {
  console.log(`[User] updateOne called with filter:`, this.getFilter());
  next();
});

userSchema.pre("findOneAndUpdate", function (next) {
  console.log(`[User] findOneAndUpdate called with filter:`, this.getFilter());
  next();
});

//============================
// Middleware for logging deletions
//============================
userSchema.pre("deleteOne", { document: true, query: false }, function (next) {
  console.log(`[User] deleteOne called for user id=${this._id}`);
  next();
});

userSchema.pre("findOneAndDelete", function (next) {
  console.log(`[User] findOneAndDelete called with filter:`, this.getFilter());
  next();
});

userSchema.pre("deleteMany", function (next) {
  console.log(`[User] deleteMany called with filter:`, this.getFilter());
  next();
});

//============================
// Prevent OverwriteModelError
//============================
const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
