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

    // ✅ NAYA: Profile picture (Google ya upload ki hui)
    profilePicture: { type: String, default: null },

    // ✅ NAYA: Gender field
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },

    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    isVerified: { type: Boolean, default: true },
    boards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Board" }],
  },
  { timestamps: true },
);

userSchema.pre("save", function (next) {
  console.log(`[User] Saving user: id=${this._id}, email=${this.email}`);
  next();
});

userSchema.pre("updateOne", function (next) {
  console.log(`[User] updateOne called with filter:`, this.getFilter());
  next();
});

userSchema.pre("findOneAndUpdate", function (next) {
  console.log(`[User] findOneAndUpdate called with filter:`, this.getFilter());
  next();
});

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

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;