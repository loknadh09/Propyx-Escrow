const Seller = require("../models/Seller");

// Register Seller
const registerSeller = async (req, res) => {
  try {
    const { name, email, walletAddress } = req.body;
    const user = req.user;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if seller profile already exists
    const existing = await Seller.findOne({ userId: user._id });
    if (existing) {
      return res.status(400).json({ error: "You already have a seller profile" });
    }

    const newSeller = new Seller({
      userId: user._id,
      name,
      email,
      walletAddress: walletAddress || ""
    });

    await newSeller.save();
    res.status(201).json({ message: "Seller registration submitted ✅. Awaiting admin approval.", seller: newSeller });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};

// Seller gets their OWN profile
const getMyProfile = async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.user._id });
    if (!seller) return res.status(404).json({ error: "No seller profile found" });
    res.json({ seller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: List all sellers
const listSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().populate("userId", "name email walletAddress").sort({ createdAt: -1 });
    return res.json({ sellers });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Admin: Approve seller
const approveSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    seller.status = "approved";
    await seller.save();
    return res.json({ message: "Seller approved ✅", seller });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

// Admin: Reject seller
const rejectSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    seller.status = "rejected";
    await seller.save();
    return res.json({ message: "Seller rejected ❌", seller });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

module.exports = {
  registerSeller,
  getMyProfile,
  listSellers,
  approveSeller,
  rejectSeller,
};