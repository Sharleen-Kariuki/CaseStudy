const express = require("express");
const router = express.Router();
const mpesaController = require("../controllers/mpesaController");

// Initiate STK Push
router.post("/stkpush", mpesaController.stkPush);

// (Optional) Handle Quikk callback
router.post("/callback", (req, res) => {
  // Save transaction result, update database, etc.
  console.log("Callback received:", req.body);
  res.status(200).json({ message: "Callback received" });
});

module.exports = router;