/**
 * Validation Middleware
 * Provides reusable validation functions for common patterns
 */

const { ethers } = require("ethers");

/**
 * Validate Ethereum address
 */
const validateEthereumAddress = (address) => {
  if (!address) return null;
  return ethers.isAddress(address);
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate required fields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(", ")}`,
      code: "MISSING_FIELDS"
    };
  }
  return { valid: true };
};

/**
 * Validate user role
 */
const validateRole = (role) => {
  const validRoles = ["admin", "buyer", "seller"];
  return validRoles.includes(role);
};

/**
 * Middleware to validate request body
 */
const validateBody = (requiredFields) => {
  return (req, res, next) => {
    if (!req.body) {
      return res.status(400).json({
        error: "Request body is required",
        code: "EMPTY_BODY"
      });
    }

    const validation = validateRequiredFields(req.body, requiredFields);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        code: validation.code
      });
    }

    next();
  };
};

/**
 * Middleware to validate Ethereum address in params
 */
const validateAddressParam = (paramName = "address") => {
  return (req, res, next) => {
    const address = req.params[paramName] || req.body[paramName];
    
    if (!address) {
      return res.status(400).json({
        error: `Ethereum address (${paramName}) is required`,
        code: "MISSING_ADDRESS"
      });
    }

    if (!validateEthereumAddress(address)) {
      return res.status(400).json({
        error: `Invalid Ethereum address: ${address}`,
        code: "INVALID_ADDRESS"
      });
    }

    next();
  };
};

module.exports = {
  validateEthereumAddress,
  validateEmail,
  validateRequiredFields,
  validateRole,
  validateBody,
  validateAddressParam
};
