const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require('cors');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = allowedOrigins.some((o) => {
      if (o.includes("*")) {
        const suffix = o.replace("*", "");
        return origin.endsWith(suffix);
      }
      return o === origin;
    });
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-account-id, x-user-id, x-access-token"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB connection error", err));
} else {
  console.log("MONGO_URI not set; database features disabled");
}

// OAuth route
const oauthRoutes = require("./routes/oauth");
app.use("/auth/monday", oauthRoutes);

// Template routes
const templateRoutes = require("./routes/templates");
const { processScheduledTemplates } = require("./controllers/templateController");
app.use("/api/templates", templateRoutes);

// Tracking routes
const trackingRoutes = require("./routes/tracking");
app.use("/api/tracking", trackingRoutes);

// Email account OAuth + list
const emailOAuthRoutes = require("./routes/emailOAuth");
app.use("/auth", emailOAuthRoutes);

const emailAccountsRoutes = require("./routes/emailAccounts");
app.use("/api/email-accounts", emailAccountsRoutes);

// Monday data routes
const mondayRoutes = require("./routes/monday");
app.use("/api/monday", mondayRoutes);
app.use("/api/account-boards", mondayRoutes);

// Debug routes
const debugRoutes = require("./routes/debug");
app.use("/api/debug", debugRoutes);

const mondayApiRoutes = require("./routes/monday");
app.use("/api/account-boards", mondayApiRoutes);

const SCHEDULE_INTERVAL_MS = Number(process.env.SCHEDULE_INTERVAL_MS || 60000);
setInterval(() => {
  processScheduledTemplates().catch((err) => console.log("Scheduled send error", err?.message || err));
}, SCHEDULE_INTERVAL_MS);

const PORT = 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
