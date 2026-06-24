const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const register = async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;

    // Validation
    if (!email || !role) {
      return res.status(400).json({ 
        error: "Email and role are required",
        code: "MISSING_FIELDS"
      });
    }

    const validRoles = ["admin", "buyer", "seller"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        code: "INVALID_ROLE"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL"
      });
    }

    // Validate wallet address if provided (for non-admin users)
    if (walletAddress) {
      if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({ 
          error: "Invalid Ethereum wallet address",
          code: "INVALID_WALLET"
        });
      }
    } else if (role !== "admin") {
      return res.status(400).json({ 
        error: "Wallet address is required for non-admin users",
        code: "WALLET_REQUIRED"
      });
    }

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ 
        error: "Email already registered",
        code: "DUPLICATE_EMAIL"
      });
    }

    // Hash password if provided
    let passwordHash;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          error: "Password must be at least 6 characters long",
          code: "WEAK_PASSWORD"
        });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create user
    const user = new User({
      name: name || "",
      email: email.toLowerCase(),
      passwordHash,
      role,
      walletAddress: walletAddress ? walletAddress.toLowerCase() : null
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      },
      token
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ 
      error: "Registration failed",
      code: "REGISTRATION_ERROR",
      ...(process.env.DEBUG_AUTH === "true" && { details: err.message })
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ 
        error: "Email is required",
        code: "MISSING_EMAIL"
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Verify password if it exists
    if (user.passwordHash) {
      if (!password) {
        return res.status(401).json({ 
          error: "Password is required",
          code: "MISSING_PASSWORD"
        });
      }

      try {
        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          return res.status(401).json({ 
            error: "Invalid email or password",
            code: "INVALID_CREDENTIALS"
          });
        }
      } catch (bcryptErr) {
        console.error("Password comparison error:", bcryptErr.message);
        return res.status(500).json({ 
          error: "Authentication failed",
          code: "AUTH_ERROR"
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress
      },
      token
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ 
      error: "Login failed",
      code: "LOGIN_ERROR",
      ...(process.env.DEBUG_AUTH === "true" && { details: err.message })
    });
  }
};

module.exports = { register, login };
