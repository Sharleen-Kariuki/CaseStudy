require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use(express.static(path.join(__dirname, "public")));
console.log("Serving static files from:", path.join(__dirname, "public"));


if (!process.env.MONGO_URI) {
  console.error("ERROR: MONGO_URI not set in .env");
  process.exit(1);
}


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => {
    console.error("Mongo connection error:", err.message);
    process.exit(1);
  });


app.use("/api/auth", require("./routes/auth"));
app.use("/api/fee-request", require("./routes/feeRequest"));
app.use("/api/donation", require("./routes/donation"));
app.use("/api/transaction", require("./routes/transaction"));
app.use("/api/mpesa", require("./routes/mpesa"));


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

app.get("/", (_, res) => {
  
  res.sendFile(path.join(__dirname, "public", "Dashboard", "Dashboard.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));