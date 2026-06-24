const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  role: { type: String, enum: ["admin", "buyer", "seller"], required: true },
  walletAddress: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
