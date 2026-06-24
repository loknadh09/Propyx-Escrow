const Escrow = require("../models/Escrow");
const Seller = require("../models/Seller");
const User = require("../models/User");
const Listing = require("../models/Listing");
const { deposit, confirmBuyer, confirmSeller, refundBuyer, provider } = require("../services/blockchainService");

// List all escrows (admin sees all, seller sees own, buyer sees own)
const listEscrows = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === "seller") {
      const seller = await Seller.findOne({ userId: user._id });
      if (seller) query.sellerId = seller._id;
    } else if (user.role === "buyer") {
      query.buyerId = user._id;
    }
    // admin sees all

    const escrows = await Escrow.find(query)
      .populate("sellerId")
      .populate("buyerId", "name email walletAddress")
      .populate("listingId")
      .sort({ createdAt: -1 });

    res.json({ message: "Escrows retrieved", count: escrows.length, escrows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buyer deposits funds into escrow
const depositToEscrow = async (req, res) => {
  try {
    const user = req.user;
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });

    // Allow the buyer (matched by DB userId) to deposit
    if (escrow.buyerId && escrow.buyerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "You are not the buyer in this escrow" });
    }
    if (escrow.isDeposited) return res.status(400).json({ error: "Already deposited" });
    if (escrow.status !== "AWAITING_DEPOSIT") {
      return res.status(400).json({ error: `Cannot deposit in current status: ${escrow.status}` });
    }

    let txHash;
    try {
      txHash = await deposit(escrow.contractAddress, escrow.transactionAmount, escrow.buyerAddress);
    } catch (err) {
      return res.status(500).json({ error: `Deposit failed: ${err.message}` });
    }

    escrow.isDeposited = true;
    escrow.status = "AWAITING_BUYER_VERIFY";
    escrow.transactionLog.push({
      action: "FUNDS_DEPOSITED",
      performedBy: user.name || user.email,
      performedByRole: "buyer",
      notes: `Buyer deposited ${escrow.transactionAmount} ETH into escrow. TX: ${txHash}`
    });
    await escrow.save();

    res.json({ message: "Funds deposited ✅. Admin will now verify your identity.", txHash, escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin verifies buyer identity
const verifyBuyer = async (req, res) => {
  try {
    const user = req.user;
    const { escrowId } = req.params;
    const { notes } = req.body;

    const escrow = await Escrow.findById(escrowId);
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });
    if (escrow.status !== "AWAITING_BUYER_VERIFY") {
      return res.status(400).json({ error: `Cannot verify buyer in current status: ${escrow.status}` });
    }

    escrow.buyerVerified = true;
    escrow.buyerVerificationNotes = notes || "Buyer identity verified by admin";
    escrow.status = "AWAITING_REGISTRATION";
    escrow.transactionLog.push({
      action: "BUYER_VERIFIED",
      performedBy: user.name || user.email,
      performedByRole: "admin",
      notes: notes || "Buyer identity verified"
    });
    await escrow.save();

    res.json({ message: "Buyer verified ✅. Seller must now add registration documents.", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin approves the final deal after registration docs
const adminApproveDeal = async (req, res) => {
  try {
    const user = req.user;
    const { escrowId } = req.params;
    const { notes } = req.body;

    const escrow = await Escrow.findById(escrowId);
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });
    if (escrow.status !== "AWAITING_ADMIN_APPROVAL") {
      return res.status(400).json({ error: `Cannot approve in current status: ${escrow.status}` });
    }
    if (!escrow.registrationDocAdded) {
      return res.status(400).json({ error: "Seller has not added registration documents yet" });
    }

    escrow.adminApproved = true;
    escrow.adminApprovedBy = user.name || user.email;
    escrow.adminApprovalNotes = notes || "Deal approved by admin";
    escrow.status = "AWAITING_CONFIRMATION";
    escrow.transactionLog.push({
      action: "ADMIN_APPROVED_DEAL",
      performedBy: user.name || user.email,
      performedByRole: "admin",
      notes: notes || "Admin approved the deal after reviewing registration documents"
    });
    await escrow.save();

    res.json({ message: "Deal approved ✅. Both parties must now confirm to complete transaction.", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin force refunds buyer
const refundBuyerAction = async (req, res) => {
  try {
    const user = req.user;
    const escrow = await Escrow.findById(req.params.id || req.params.escrowId);
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });
    if (!escrow.isDeposited) return res.status(400).json({ error: "No deposit to refund" });
    if (escrow.status === "REFUNDED") return res.status(400).json({ error: "Already refunded" });
    if (escrow.status === "COMPLETED") return res.status(400).json({ error: "Cannot refund completed transaction" });

    let accounts;
    try {
      accounts = await provider.listAccounts();
    } catch (err) {
      return res.status(500).json({ error: "Failed to get blockchain accounts" });
    }

    const adminAddress = accounts[0];
    let txHash;
    try {
      txHash = await refundBuyer(escrow.contractAddress, adminAddress);
    } catch (err) {
      return res.status(500).json({ error: `Refund failed: ${err.message}` });
    }

    escrow.status = "REFUNDED";
    escrow.transactionLog.push({
      action: "ADMIN_FORCE_REFUND",
      performedBy: user.name || user.email,
      performedByRole: "admin",
      notes: `Admin force-refunded buyer. TX: ${txHash}`
    });
    await escrow.save();

    res.json({ message: "Refund processed ✅", txHash, escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Seller confirms fulfillment
const confirmSellerAction = async (req, res) => {
  try {
    const user = req.user;
    const seller = await Seller.findOne({ userId: user._id });
    if (!seller) return res.status(404).json({ error: "Seller profile not found" });

    const escrow = await Escrow.findOne({ _id: req.params.id, sellerId: seller._id });
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });
    if (escrow.status !== "AWAITING_CONFIRMATION") {
      return res.status(400).json({ error: `Cannot confirm in current status: ${escrow.status}` });
    }
    if (escrow.sellerConfirmed) return res.status(400).json({ error: "Already confirmed" });

    let txHash;
    try {
      txHash = await confirmSeller(escrow.contractAddress, escrow.sellerAddress);
    } catch (err) {
      return res.status(500).json({ error: `Seller confirmation failed: ${err.message}` });
    }

    escrow.sellerConfirmed = true;
    if (escrow.buyerConfirmed) escrow.status = "COMPLETED";
    escrow.transactionLog.push({
      action: "SELLER_CONFIRMED",
      performedBy: user.name || user.email,
      performedByRole: "seller",
      notes: `Seller confirmed fulfillment. TX: ${txHash}`
    });
    await escrow.save();

    // Close listing if completed
    if (escrow.status === "COMPLETED" && escrow.listingId) {
      await Listing.findByIdAndUpdate(escrow.listingId, { status: "closed" });
    }

    res.json({ message: "Seller confirmed ✅", txHash, escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buyer confirms receipt
const confirmBuyerAction = async (req, res) => {
  try {
    const user = req.user;
    const escrow = await Escrow.findOne({ _id: req.params.id, buyerId: user._id });
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });
    if (escrow.status !== "AWAITING_CONFIRMATION") {
      return res.status(400).json({ error: `Cannot confirm in current status: ${escrow.status}` });
    }
    if (escrow.buyerConfirmed) return res.status(400).json({ error: "Already confirmed" });

    let txHash;
    try {
      txHash = await confirmBuyer(escrow.contractAddress, escrow.buyerAddress);
    } catch (err) {
      return res.status(500).json({ error: `Buyer confirmation failed: ${err.message}` });
    }

    escrow.buyerConfirmed = true;
    if (escrow.sellerConfirmed) escrow.status = "COMPLETED";
    escrow.transactionLog.push({
      action: "BUYER_CONFIRMED",
      performedBy: user.name || user.email,
      performedByRole: "buyer",
      notes: `Buyer confirmed receipt of property. TX: ${txHash}`
    });
    await escrow.save();

    if (escrow.status === "COMPLETED" && escrow.listingId) {
      await Listing.findByIdAndUpdate(escrow.listingId, { status: "closed" });
    }

    res.json({ message: "Buyer confirmed ✅. Funds will be released to seller!", txHash, escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin records a transaction note / logs event
const recordTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { escrowId } = req.params;
    const { action, notes } = req.body;

    if (!action || !notes) return res.status(400).json({ error: "Action and notes are required" });

    const escrow = await Escrow.findById(escrowId)
      .populate("sellerId")
      .populate("buyerId", "name email");

    if (!escrow) return res.status(404).json({ error: "Escrow not found" });

    escrow.transactionLog.push({
      action: action.toUpperCase().replace(/ /g, "_"),
      performedBy: user.name || user.email,
      performedByRole: "admin",
      notes
    });

    await escrow.save();
    res.json({ message: "Transaction recorded ✅", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listEscrows,
  depositToEscrow,
  verifyBuyer,
  adminApproveDeal,
  refundBuyerAction,
  confirmSellerAction,
  confirmBuyerAction,
  recordTransaction
};
