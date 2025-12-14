/**
 * QuickFix Backend Server (Railway-safe)
 */

const express = require("express");
const path = require("path");
const http = require("http");

const { initializeDatabase } = require("./db");
const { WebhookHandlers } = require("./webhookHandlers");

// Routes (FIXED PATHS)
const authRoutes = require("./routes/auth");
const videoRoutes = require("./routes/videos");
const userRoutes = require("./routes/users");
const toolboxRoutes = require("./routes/toolbox");
const notificationRoutes = require("./routes/notifications");
const aiRoutes = require("./routes/ai");
const communityRoutes = require("./routes/community");
const reportsRoutes = require("./routes/reports");
const { router: blockRoutes } = require("./routes/block");
const subscriptionRoutes = require("./subscriptions");

// ✅ Railway PORT FIRST
const PORT = process.env.PORT || 8080;

const app = express();

/* ---------------- STRIPE WEBHOOK (RAW BODY FIRST) ---------------- */
app.post(
  "/api/stripe/webhook/:uuid",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature" });
      }

      await WebhookHandlers.processWebhook(
        req.body,
        Array.isArray(signature) ? signature[0] : signature,
        req.params.uuid
      );

      res.json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Error:", err);
      res.status(400).json({ error: "Webhook failed" });
    }
  }
);

/* ---------------- BODY PARSERS ---------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ---------------- LOGGING ---------------- */
app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.url);
  next();
});

/* ---------------- CORS ---------------- */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ---------------- STATIC ---------------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------------- HEALTH ---------------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* ---------------- ROUTES ---------------- */
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

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ---------------- START SERVER ---------------- */
async function start() {
  try {
    await initializeDatabase();
    console.log("✅ Database ready");
  } catch (err) {
    console.error("⚠️ DB init failed (continuing):", err.message);
  }

  const server = http.createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Backend running on port ${PORT}`);
  });
}

start();
