/**
 * Global Error Handler Middleware
 * Catches and formats errors consistently across the application
 */

const errorHandler = (err, req, res, next) => {
  // Log error with context
  const timestamp = new Date().toISOString();
  const requestId = req.id || Math.random().toString(36).substr(2, 9);
  
  console.error(`[${timestamp}] Request ID: ${requestId}`);
  console.error(`Path: ${req.method} ${req.path}`);
  console.error(`Error:`, err.message);
  if (process.env.DEBUG_BLOCKCHAIN === "true" || process.env.DEBUG_AUTH === "true") {
    console.error(`Stack:`, err.stack);
  }

  // Default error response
  let statusCode = 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred";
  let details = undefined;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Validation failed";
    details = Object.values(err.errors).map(e => e.message);
  } else if (err.name === "MongoError" || err.name === "MongoServerError") {
    if (err.code === 11000) {
      statusCode = 409;
      errorCode = "DUPLICATE_ENTRY";
      message = "Duplicate entry error";
    } else {
      statusCode = 500;
      errorCode = "DATABASE_ERROR";
      message = "Database operation failed";
    }
  } else if (err.name === "CastError") {
    statusCode = 400;
    errorCode = "INVALID_ID";
    message = "Invalid ID format";
  } else if (err.message.includes("Contract deployment failed")) {
    statusCode = 500;
    errorCode = "DEPLOYMENT_FAILED";
    message = err.message;
  } else if (err.message.includes("Invalid address")) {
    statusCode = 400;
    errorCode = "INVALID_ADDRESS";
    message = err.message;
  } else if (err.message.includes("timed out")) {
    statusCode = 504;
    errorCode = "OPERATION_TIMEOUT";
    message = "Operation timed out. Please try again.";
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    code: errorCode,
    requestId,
    ...(process.env.DEBUG_BLOCKCHAIN === "true" || process.env.DEBUG_AUTH === "true") && { 
      details,
      timestamp 
    }
  });
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    code: "NOT_FOUND",
    path: `${req.method} ${req.path}`
  });
};

module.exports = { errorHandler, notFoundHandler };
