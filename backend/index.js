/**
 * QuickFix Backend Server
 * =======================
 *
 * HOW TO RUN:
 *   node backend/index.js
 *
 * The server runs on port 3001 by default (configurable via BACKEND_PORT env var).
 * It connects to the PostgreSQL database using DATABASE_URL environment variable.
 *
 * MAIN ENDPOINTS:
 *
 *   GET /api/health
 *     - Returns { status: "ok", timestamp: "..." } if server is running
 *     - Use this to check if the backend is available
 *
 *   POST /api/ai/chat
 *     - Main AI chat endpoint
 *     - Body: { messages: [{role, content}...], language?, imageBase64?, videoFileName? }
 *     - Uses GPT-4o for image analysis, GPT-4o-mini for text-only
 *     - Returns: { answer: "..." }
 *
 *   Other endpoints: /api/auth/*, /api/videos/*, /api/users/*, /api/toolbox/*,
 *                    /api/notifications/*, /api/community/*
 *
 * ENVIRONMENT VARIABLES:
 *   - DATABASE_URL: PostgreSQL connection string (required)
 *   - OPENAI_API_KEY: OpenAI API key for AI features (optional but required for AI)
 *   - SESSION_SECRET: JWT secret for authentication
 *   - BACKEND_PORT: Server port (default: 3001)
 */

const express = require("express");
const path = require("path");
const http = require("http");
const { initializeDatabase } = require("./db");
const { wsManager } = require("./services/websocket");

const authRoutes = require("./routes/auth");
const videoRoutes = require("./routes/videos");
const userRoutes = require("./routes/users");
const toolboxRoutes = require("./routes/toolbox");
const notificationRoutes = require("./routes/notifications");
const aiRoutes = require("./routes/ai");
const communityRoutes = require("./routes/community");
const reportsRoutes = require("./routes/reports");
const { router: blockRoutes } = require("./routes/block");
const subscriptionRoutes = require("./routes/subscriptions");
const { WebhookHandlers } = require("./webhookHandlers");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;

// 🔍 Logga alla requests som kommer in till backend
app.use((req, res, next) => {
  console.log("[BACKEND]", req.method, req.url);
  next();
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Stripe webhook route MUST be registered BEFORE express.json()
// Stripe requires raw Buffer for signature verification
app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('[Stripe Webhook] req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[Stripe Webhook] Error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Block demo tokens - security middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (token && token.startsWith("demo_")) {
    console.warn("[SECURITY] Blocked request with demo token");
    return res.status(403).json({ error: "Demo tokens are not allowed. Please log in with a real account." });
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/toolbox", toolboxRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api", blockRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.get("/api/categories", (req, res) => {
  res.json([
    { key: "all", label: "All" },
    { key: "home", label: "Home" },
    { key: "car", label: "Car" },
    { key: "electronics", label: "Electronics" },
    { key: "tools", label: "Tools" },
    { key: "cleaning", label: "Cleaning" },
    { key: "garden", label: "Garden" },
    { key: "plumbing", label: "Plumbing" },
    { key: "electrical", label: "Electrical" },
    { key: "appliances", label: "Appliances" },
    { key: "other", label: "Other" },
  ]);
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('[Stripe] DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('[Stripe] Initializing Stripe schema...');
    const { runMigrations } = await import('stripe-replit-sync');
    await runMigrations({ 
      databaseUrl,
      schema: 'stripe'
    });
    console.log('[Stripe] Schema ready');

    const { getStripeSync } = require('./stripeClient');
    const stripeSync = await getStripeSync();

    console.log('[Stripe] Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'QuickFix managed webhook for subscription sync',
      }
    );
    console.log(`[Stripe] Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    console.log('[Stripe] Syncing existing data...');
    stripeSync.syncBackfill()
      .then(() => console.log('[Stripe] Data sync complete'))
      .catch((err) => console.error('[Stripe] Sync error:', err));
  } catch (error) {
    console.error('[Stripe] Initialization error:', error.message);
  }
}

async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database initialized");

    await initStripe();

    // Initialize WebSocket on HTTP server
    wsManager.initialize(server);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
