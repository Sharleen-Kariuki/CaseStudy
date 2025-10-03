require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const pino = require("pino");

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Try to load pino-http (optional)
let pinoHttp;
try {
  pinoHttp = require("pino-http");
  app.use(pinoHttp({ logger }));
} catch (e) {
  console.warn("[startup] pino-http not installed. Install with `npm i pino-http` for request logging.");
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for admin endpoints (adjust/remove if you like)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});

// Static assets
app.use(express.static(path.join(__dirname, "public")));
logger.info("Serving static files from: " + path.join(__dirname, "public"));

if (!process.env.MONGO_URI) {
  logger.error("ERROR: MONGO_URI not set in .env");
  process.exit(1);
}

// DB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to MongoDB Atlas"))
  .catch(err => {
    logger.error("Mongo connection error: " + err.message);
    process.exit(1);
  });

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/fee-request", require("./routes/feeRequest"));
app.use("/api/donation", require("./routes/donation"));
app.use("/api/transaction", require("./routes/transaction"));
app.use("/api/mpesa", require("./routes/mpesa"));
app.use("/api/admin", adminLimiter, require("./routes/admin"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

// (Choose what you want as the root — this currently points to the admin dashboard.
// If you want the public marketing dashboard instead, change the path.)
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "Dashboard", "Dashboard.html"));
});

// API 404 fallback
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not Found" });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running at http://localhost:${PORT}`));