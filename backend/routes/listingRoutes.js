const express = require("express");
const router = express.Router();

const {
  getListings,
  createListing,
  requestToBuy,
  getMyListingRequests,
  acceptBuyerRequest,
  rejectBuyerRequest,
  addRegistrationDoc
} = require("../controllers/listingController");

const { authMiddleware, requireRole } = require("../middleware/auth");

// Public - browse listings (buyers)
router.get("/", authMiddleware, getListings);

// Seller creates a listing
router.post("/create", authMiddleware, requireRole("seller"), createListing);

// Seller views their own listings + requests
router.get("/my-listings", authMiddleware, requireRole("seller"), getMyListingRequests);

// Buyer requests to buy
router.post("/request/:listingId", authMiddleware, requireRole("buyer"), requestToBuy);

// Seller accepts a buyer's request (creates escrow)
router.put("/accept/:listingId/:requestId", authMiddleware, requireRole("seller"), acceptBuyerRequest);

// Seller rejects a buyer's request
router.put("/reject/:listingId/:requestId", authMiddleware, requireRole("seller"), rejectBuyerRequest);

// Seller adds registration document to escrow
router.put("/registration-doc/:escrowId", authMiddleware, requireRole("seller"), addRegistrationDoc);

module.exports = router;
