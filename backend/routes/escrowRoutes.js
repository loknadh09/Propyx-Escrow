const express = require("express");
const router = express.Router();

const {
  listEscrows,
  depositToEscrow,
  verifyBuyer,
  adminApproveDeal,
  refundBuyerAction,
  confirmSellerAction,
  confirmBuyerAction,
  recordTransaction
} = require("../controllers/escrowController");

const { authMiddleware, requireRole } = require("../middleware/auth");

// Get all escrows (role-filtered)
router.get("/", authMiddleware, listEscrows);

// Buyer deposits funds
router.post("/deposit/:id", authMiddleware, requireRole("buyer"), depositToEscrow);

// Admin verifies buyer identity
router.put("/verify-buyer/:escrowId", authMiddleware, requireRole("admin"), verifyBuyer);

// Admin approves final deal
router.put("/approve-deal/:escrowId", authMiddleware, requireRole("admin"), adminApproveDeal);

// Admin force refund
router.put("/refund/:id", authMiddleware, requireRole("admin"), refundBuyerAction);

// Seller confirms
router.put("/sellerConfirm/:id", authMiddleware, requireRole("seller"), confirmSellerAction);

// Buyer confirms
router.put("/buyerConfirm/:id", authMiddleware, requireRole("buyer"), confirmBuyerAction);

// Admin records transaction note
router.post("/record/:escrowId", authMiddleware, requireRole("admin"), recordTransaction);

module.exports = router;
