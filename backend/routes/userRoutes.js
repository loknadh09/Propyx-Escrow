const express = require("express");
const router = express.Router();
const { getMe, updateProfile } = require("../controllers/userController");
const { authMiddleware } = require("../middleware/auth");

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateProfile);

module.exports = router;
