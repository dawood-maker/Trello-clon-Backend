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

    // OTP fields (updated)
    resetOTP: { type: String, default: null },
    otpExpiry: { type: Date, default: null },

    isVerified: { type: Boolean, default: true },

    boards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Board" }],
  },
  { timestamps: true },
);

// ------------------------
// Instance Methods
// ------------------------
userSchema.methods.logInfo = function () {
  console.log("=======================================");
  console.log(`User.logInfo called`);
  console.log(`ID: ${this._id}`);
  console.log(`Name: ${this.name}`);
  console.log(`Email: ${this.email}`);
  console.log("=======================================\n");
};

// ------------------------
// Pre-save middleware
// ------------------------
userSchema.pre("save", function (next) {
  console.log("=======================================");
  console.log(`User pre-save triggered`);
  console.log(`ID: ${this._id}, Name: ${this.name}, Email: ${this.email}`);
  console.log("=======================================\n");
  next();
});

// ------------------------
// Pre-update middleware
// ------------------------
userSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  console.log("=======================================");
  console.log(`User update triggered`);
  console.log("Filter:", this.getFilter());
  console.log("Update:", this.getUpdate());
  console.log("=======================================\n");
  next();
});

// ------------------------
// Post-save middleware
// ------------------------
userSchema.post("save", function (doc) {
  console.log("=======================================");
  console.log(`User saved`);
  console.log(`ID: ${doc._id}, Name: ${doc.name}, Email: ${doc.email}`);
  console.log("=======================================\n");
});

// ------------------------
// Post-remove middleware
// ------------------------
userSchema.post("remove", function (doc) {
  console.log("=======================================");
  console.log(`User removed`);
  console.log(`ID: ${doc._id}, Name: ${doc.name}, Email: ${doc.email}`);
  console.log("=======================================\n");
});

// ------------------------
// Prevent OverwriteModelError
// ------------------------
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;