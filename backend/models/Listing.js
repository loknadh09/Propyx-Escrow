const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyerName: { type: String },
  buyerEmail: { type: String },
  buyerWallet: { type: String },
  message: { type: String, default: "Interested in buying this property" },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  requestedAt: { type: Date, default: Date.now }
});

const listingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
  sellerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  propertyDescription: { type: String, required: true },
  propertyAddress: { type: String },
  propertyType: { type: String, enum: ["residential", "commercial", "land", "other"], default: "residential" },
  transactionAmount: { type: Number, required: true },
  deadlineDurationDays: { type: Number, required: true },
  imageUrl: { type: String },
  status: { type: String, enum: ["active", "pending_deal", "closed"], default: "active" },
  purchaseRequests: [purchaseRequestSchema]
}, { timestamps: true });

module.exports = mongoose.model("Listing", listingSchema);
