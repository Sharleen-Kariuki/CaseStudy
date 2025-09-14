const express = require("express");
const router = express.Router();
const feeRequestController = require("../controllers/feeRequestController");

router.post("/", feeRequestController.createFeeRequest);
router.get("/", feeRequestController.getFeeRequests);
router.get("/user/:userId", feeRequestController.getMyFeeRequests);

module.exports = router;