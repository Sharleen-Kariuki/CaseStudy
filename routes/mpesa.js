const express = require("express");
const router = express.Router();
const mpesaController = require("../controllers/mpesaController");


router.post("/stkpush", mpesaController.stkPush);

router.post("/callback", (req, res) => {
  // Save transaction result, update database, etc.
  console.log("Callback received:", req.body);
  res.status(200).json({ message: "Callback received" });
});

module.exports = router;
