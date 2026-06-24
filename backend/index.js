require("dotenv").config();
const cors = require("cors");
const express = require("express");
const connectDB = require("./config/db");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const testRoutes = require("./routes/testRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listingRoutes = require("./routes/listingRoutes");

const app = express();

// Simple request logger for debugging routes
app.use((req, res, next) => {
  // Add request ID for tracking
  req.id = Math.random().toString(36).substr(2, 9);
  console.log(`[${new Date().toISOString()}] [${req.id}] ${req.method} ${req.path}`);
  next();
});

// 🔄 Middleware
// Allow requests from any localhost dev port so Vite can pick a free port.
// In production restrict this to your frontend domain.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔗 Connect Database
connectDB().catch(err => {
  console.error("⚠️  DB connection failed - proceeding anyway:", err.message);
});

// 🏠 Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "✅ Propyx Backend Running", 
    time: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// Health check endpoint for monitoring
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Debug: return mounted route info
app.get("/debug/routes", (req, res) => {
  try {
    const routes = [];
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware) => {
        if (middleware && middleware.route) {
          routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) });
        } else if (middleware && middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((handler) => {
            if (handler && handler.route) {
              routes.push({ path: handler.route.path, methods: Object.keys(handler.route.methods) });
            }
          });
        }
      });
    }
    res.json({ routes: routes.slice(0, 50) }); // Limit to first 50
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 📦 Routes
// Debug: show router stacks before mounting
try {
  console.log('🔗 Mounting routes...');
  console.log('authRoutes.stack', authRoutes && authRoutes.stack && authRoutes.stack.map(s => s.route ? s.route.path : s.name));
  console.log('sellerRoutes.stack', sellerRoutes && sellerRoutes.stack && sellerRoutes.stack.map(s => s.route ? s.route.path : s.name));
} catch (e) { 
  console.log('⚠️  Router stack inspect failed:', e.message); 
}

// Direct test endpoint to ensure correct path handling
app.post('/api/auth/register-test', (req, res) => {
  console.log('✅ Direct /api/auth/register-test hit');
  res.json({ ok: true });
});

// Mount routes
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/listing", listingRoutes);
app.use("/api/escrow", require("./routes/escrowRoutes"));

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Propyx Backend running on http://localhost:${PORT}\n`);
  // Print registered routes for debugging
  try {
    const routes = [];
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware) => {
        if (middleware && middleware.route) {
          const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
          routes.push(`${methods} ${middleware.route.path}`);
        } else if (middleware && middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((handler) => {
            if (handler && handler.route) {
              const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
              routes.push(`${methods} ${handler.route.path}`);
            }
          });
        }
      });
    }
    console.log('Registered routes:\n', routes.join('\n'));
  } catch (e) {
    console.log('Could not list routes', e.message);
  }
});