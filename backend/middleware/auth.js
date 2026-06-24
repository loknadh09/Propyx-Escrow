const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    
    if (!auth) {
      return res.status(401).json({ 
        error: "Authorization header missing",
        code: "NO_AUTH_HEADER" 
      });
    }

    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Invalid authorization format. Expected: Bearer <token>",
        code: "INVALID_AUTH_FORMAT" 
      });
    }

    const token = auth.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: "Token missing",
        code: "NO_TOKEN" 
      });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      
      if (!payload.id) {
        return res.status(401).json({ 
          error: "Invalid token payload",
          code: "INVALID_PAYLOAD" 
        });
      }

      const user = await User.findById(payload.id).select("-passwordHash");
      
      if (!user) {
        return res.status(401).json({ 
          error: "User not found",
          code: "USER_NOT_FOUND" 
        });
      }

      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        return res.status(401).json({ 
          error: "Token expired. Please login again",
          code: "TOKEN_EXPIRED" 
        });
      }
      if (tokenError.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          error: "Invalid token signature",
          code: "INVALID_TOKEN" 
        });
      }
      throw tokenError;
    }
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(500).json({ 
      error: "Authentication failed",
      code: "AUTH_FAILED",
      ...(process.env.DEBUG_AUTH === "true" && { details: err.message })
    });
  }
};

const requireRole = (allowedRoles) => {
  // Support both single role string and array of roles
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }

    next();
  };
};

module.exports = { authMiddleware, requireRole };

