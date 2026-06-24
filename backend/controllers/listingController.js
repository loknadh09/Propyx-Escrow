const Listing = require("../models/Listing");
const Seller = require("../models/Seller");
const User = require("../models/User");

// GET all active listings (public for buyers)
const getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ status: { $in: ["active", "pending_deal"] } })
      .populate("sellerId")
      .sort({ createdAt: -1 });
    return res.json({ listings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Seller creates a property listing
const createListing = async (req, res) => {
  try {
    const user = req.user;
    const { propertyDescription, propertyAddress, propertyType, transactionAmount, deadlineDurationDays } = req.body;

    if (!propertyDescription || !transactionAmount || !deadlineDurationDays) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const seller = await Seller.findOne({ userId: user._id });
    if (!seller) return res.status(404).json({ error: "Seller profile not found. Please register first." });
    if (seller.status !== "approved") return res.status(403).json({ error: "Your seller account must be approved by admin before listing properties." });

    const listing = new Listing({
      sellerId: seller._id,
      sellerUserId: user._id,
      propertyDescription,
      propertyAddress: propertyAddress || "",
      propertyType: propertyType || "residential",
      transactionAmount: Number(transactionAmount),
      deadlineDurationDays: Number(deadlineDurationDays)
    });

    await listing.save();
    res.status(201).json({ message: "Property listed successfully ✅", listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buyer requests to purchase a listing
const requestToBuy = async (req, res) => {
  try {
    const user = req.user; // authenticated buyer
    const { listingId } = req.params;
    const { message } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.status !== "active") return res.status(400).json({ error: "This property is no longer available" });

    // Check if buyer already requested
    const alreadyRequested = listing.purchaseRequests.some(
      r => r.buyerId.toString() === user._id.toString() && r.status === "pending"
    );
    if (alreadyRequested) return res.status(400).json({ error: "You already have a pending request for this property" });

    listing.purchaseRequests.push({
      buyerId: user._id,
      buyerName: user.name || "Unknown Buyer",
      buyerEmail: user.email,
      buyerWallet: user.walletAddress || "",
      message: message || "Interested in buying this property",
      status: "pending"
    });

    await listing.save();
    res.json({ message: "Purchase request submitted! Waiting for seller to accept.", listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Seller views all requests on their listings
const getMyListingRequests = async (req, res) => {
  try {
    const user = req.user;
    const seller = await Seller.findOne({ userId: user._id });
    if (!seller) return res.status(404).json({ error: "Seller profile not found" });

    const listings = await Listing.find({ sellerId: seller._id })
      .sort({ createdAt: -1 });

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Seller accepts a buyer's request → triggers escrow
const acceptBuyerRequest = async (req, res) => {
  try {
    const user = req.user;
    const { listingId, requestId } = req.params;

    const seller = await Seller.findOne({ userId: user._id });
    if (!seller) return res.status(404).json({ error: "Seller profile not found" });

    const listing = await Listing.findOne({ _id: listingId, sellerId: seller._id });
    if (!listing) return res.status(404).json({ error: "Listing not found or not yours" });

    const request = listing.purchaseRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Purchase request not found" });
    if (request.status !== "pending") return res.status(400).json({ error: "Request already processed" });

    if (!seller.walletAddress) return res.status(400).json({ error: "You must set your wallet address in your profile before accepting deals" });
    if (!request.buyerWallet) return res.status(400).json({ error: "Buyer does not have a wallet address set. Cannot create escrow." });

    // Accept this request, reject others
    listing.purchaseRequests.forEach(r => {
      if (r._id.toString() === requestId) {
        r.status = "accepted";
      } else if (r.status === "pending") {
        r.status = "rejected";
      }
    });
    listing.status = "pending_deal";
    await listing.save();

    // Deploy escrow contract
    const { deployContract } = require("../services/blockchainService");
    const durationSeconds = listing.deadlineDurationDays * 24 * 60 * 60;

    let contractAddress;
    try {
      const deployResult = await deployContract(
        request.buyerWallet,
        seller.walletAddress,
        listing.propertyDescription,
        listing.transactionAmount,
        durationSeconds
      );
      contractAddress = deployResult.contractAddress;
    } catch (deployErr) {
      // Rollback listing status
      listing.purchaseRequests.forEach(r => {
        if (r._id.toString() === requestId) r.status = "pending";
      });
      listing.status = "active";
      await listing.save();
      return res.status(500).json({ error: `Escrow contract deployment failed: ${deployErr.message}` });
    }

    const Escrow = require("../models/Escrow");
    const buyerUser = await User.findById(request.buyerId);

    const escrow = new Escrow({
      listingId: listing._id,
      sellerId: seller._id,
      buyerId: request.buyerId,
      buyerAddress: request.buyerWallet,
      sellerAddress: seller.walletAddress,
      propertyDescription: listing.propertyDescription,
      propertyAddress: listing.propertyAddress || "",
      transactionAmount: listing.transactionAmount,
      deadlineDuration: durationSeconds,
      contractAddress,
      transactionLog: [{
        action: "ESCROW_CREATED",
        performedBy: user.name || user.email,
        performedByRole: "seller",
        notes: `Seller accepted buyer ${request.buyerName}'s request. Escrow contract deployed at ${contractAddress}`
      }]
    });

    await escrow.save();

    res.json({
      message: "Buyer request accepted! Escrow contract deployed. Buyer must now deposit funds. ✅",
      escrow,
      contractAddress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Seller rejects a buyer's request
const rejectBuyerRequest = async (req, res) => {
  try {
    const user = req.user;
    const { listingId, requestId } = req.params;

    const seller = await Seller.findOne({ userId: user._id });
    if (!seller) return res.status(404).json({ error: "Seller profile not found" });

    const listing = await Listing.findOne({ _id: listingId, sellerId: seller._id });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const request = listing.purchaseRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = "rejected";
    await listing.save();

    res.json({ message: "Request rejected.", listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Seller adds registration document to escrow
const addRegistrationDoc = async (req, res) => {
  try {
    const user = req.user;
    const { escrowId } = req.params;
    const { documentHash, documentNotes } = req.body;

    if (!documentHash) return res.status(400).json({ error: "Document hash/link is required" });

    const seller = await Seller.findOne({ userId: user._id });
    if (!seller) return res.status(404).json({ error: "Seller profile not found" });

    const Escrow = require("../models/Escrow");
    const escrow = await Escrow.findOne({ _id: escrowId, sellerId: seller._id });
    if (!escrow) return res.status(404).json({ error: "Escrow not found" });

    if (escrow.status !== "AWAITING_REGISTRATION") {
      return res.status(400).json({ error: `Cannot add registration docs in current status: ${escrow.status}` });
    }

    escrow.registrationDocAdded = true;
    escrow.registrationDocHash = documentHash;
    escrow.status = "AWAITING_ADMIN_APPROVAL";
    escrow.transactionLog.push({
      action: "REGISTRATION_DOC_ADDED",
      performedBy: user.name || user.email,
      performedByRole: "seller",
      notes: documentNotes || `Registration document added: ${documentHash}`
    });

    await escrow.save();
    res.json({ message: "Registration document added ✅. Admin will now review and approve.", escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getListings,
  createListing,
  requestToBuy,
  getMyListingRequests,
  acceptBuyerRequest,
  rejectBuyerRequest,
  addRegistrationDoc
};
