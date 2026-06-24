const mongoose = require("mongoose");

const transactionLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: String },
  performedByRole: { type: String },
  notes: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const escrowSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  buyerAddress: { type: String, required: true },
  sellerAddress: { type: String, required: true },
  propertyDescription: { type: String, required: true },
  propertyAddress: { type: String },
  transactionAmount: { type: Number, required: true },
  deadlineDuration: { type: Number, required: true },
  contractAddress: { type: String, required: true },

  // Stage flags
  isDeposited: { type: Boolean, default: false },
  buyerConfirmed: { type: Boolean, default: false },
  sellerConfirmed: { type: Boolean, default: false },

  // NEW: Escrow process gates
  registrationDocAdded: { type: Boolean, default: false },   // Seller adds property registration docs
  registrationDocHash: { type: String },                     // hash/link to registration document
  buyerVerified: { type: Boolean, default: false },          // Admin verifies buyer identity
  buyerVerificationNotes: { type: String },
  adminApproved: { type: Boolean, default: false },          // Admin approves final deal
  adminApprovedBy: { type: String },
  adminApprovalNotes: { type: String },

  status: {
    type: String,
    enum: [
      "AWAITING_DEPOSIT",         // Escrow created, waiting for buyer to deposit
      "AWAITING_BUYER_VERIFY",    // Funds deposited, admin must verify buyer
      "AWAITING_REGISTRATION",    // Buyer verified, seller must add registration docs
      "AWAITING_ADMIN_APPROVAL",  // Registration added, admin must approve final deal
      "AWAITING_CONFIRMATION",    // All steps done, both parties confirm
      "COMPLETED",
      "REFUNDED"
    ],
    default: "AWAITING_DEPOSIT"
  },

  // Admin transaction log
  transactionLog: [transactionLogSchema]
}, { timestamps: true });

module.exports = mongoose.model("Escrow", escrowSchema);
