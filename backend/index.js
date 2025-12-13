/**
 * QuickFix Backend Server
 * =======================
 *
 * HOW TO RUN:
 *   node backend/index.js
 *
 * ENV:
 *   DATABASE_URL        (required)
 *   OPENAI_API_KEY
 *   SESSION_SECRET
 *   PORT or BACKEND_PORT
 */

const express = require("express");
const path = require("path");
const http = require("http");

const { initializeDatabase } = require("./db");
const { WebhookHandlers } = require("./webhookHandlers");

// Routes
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

// ✅ Railway / local compatible PORT
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;

const app = express();

/* --------------------------------------------------
   STRIPE WEBHOOK (MUST BE FIRST – RAW BODY)
-------------------------------------------------- */
app.post(
  "/api/stripe/webhook/:uuid",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      const { uuid } = req.params;

      if (!Buffer.isBuffer(req.body)) {
        throw new Error("Webhook body is not a buffer");
      }

      await WebhookHandlers.processWebhook(req.body, sig, uuid);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Error:", err.message);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  }
);

/* --------------------------------------------------
   BODY PARSERS (AFTER WEBHOOK)
-------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* --------------------------------------------------
   REQUEST LOGGING
-------------------------------------------------- */
app.use((req, res, next) => {
  console.log("[BACKEND]", req.method, req.url);
  next();
});

/* --------------------------------------------------
   CORS
-------------------------------------------------- */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept"
  );

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* --------------------------------------------------
   SECURITY – BLOCK DEMO TOKENS
-------------------------------------------------- */
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (token && token.startsWith("demo_")) {
    return res.status(403).json({
      error: "Demo tokens are not allowed. Please log in."
    });
  }
  next();
});

/* --------------------------------------------------
   STATIC FILES
-------------------------------------------------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* --------------------------------------------------
   HEALTH CHECK
-------------------------------------------------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* --------------------------------------------------
   API ROUTES
-------------------------------------------------- */
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
    { key: "other", label: "Other" }
  ]);
});

/* --------------------------------------------------
   ERROR HANDLER
-------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* --------------------------------------------------
   STRIPE INIT (OPTIONAL – SAFE ON RAILWAY)
-------------------------------------------------- */
async function initStripe() {
  if (!process.env.DATABASE_URL) {
    console.log("[Stripe] DATABASE_URL missing, skipping Stripe init");
    return;
  }

  try {
    const baseUrl =
      process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : null;

    if (!baseUrl) {
      console.warn("[Stripe] No public domain found, skipping webhook setup");
      return;
    }

    const { runMigrations } = await import("stripe-replit-sync");
    await runMigrations({
      databaseUrl: process.env.DATABASE_URL,
      schema: "stripe"
    });

    const { getStripeSync } = require("./stripeClient");
    const stripeSync = await getStripeSync();

    await stripeSync.findOrCreateManagedWebhook(
      `${baseUrl}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "QuickFix managed webhook"
      }
    );

    stripeSync.syncBackfill().catch(console.error);
    console.log("[Stripe] Ready");
  } catch (err) {
    console.error("[Stripe] Init error:", err.message);
  }
}

/* --------------------------------------------------
   START SERVER
-------------------------------------------------- */
async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database initialized");

    await initStripe();

    const server = http.createServer(app);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

startServer();
