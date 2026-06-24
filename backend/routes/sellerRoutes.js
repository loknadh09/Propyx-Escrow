const express = require("express");
const router = express.Router();

const {
  registerSeller,
  listSellers,
  getMyProfile,
  approveSeller,
  rejectSeller
} = require("../controllers/sellerController");

const { authMiddleware, requireRole } = require("../middleware/auth");

// Seller registers profile
router.post("/register", authMiddleware, requireRole("seller"), registerSeller);

// Seller gets their OWN profile
router.get("/my-profile", authMiddleware, requireRole("seller"), getMyProfile);

// Admin sees all sellers
router.get("/", authMiddleware, requireRole("admin"), listSellers);

// Admin approves seller
router.put("/approve/:id", authMiddleware, requireRole("admin"), approveSeller);

// Admin rejects seller
router.put("/reject/:id", authMiddleware, requireRole("admin"), rejectSeller);

module.exports = router;