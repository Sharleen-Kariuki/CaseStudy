const express = require("express");
const router = express.Router();
const feeRequestController = require("../controllers/feeRequestController");
const { auth, requireRole } = require("../middleware/auth");

router.post("/", auth, feeRequestController.createFeeRequest);
router.get("/", feeRequestController.getFeeRequests);
router.get("/user/:userId", auth, feeRequestController.getMyFeeRequests);
router.patch("/:id/status", auth, requireRole("admin", "superadmin"), feeRequestController.updateStatus);

module.exports = router;