const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth, requireRole } = require("../middleware/auth");

// All admin endpoints restricted
router.get("/overview", auth, requireRole("superadmin", "admin"), adminController.overview);
router.get("/fee-requests", auth, requireRole("superadmin", "admin"), adminController.listFeeRequests);
router.get("/fee-requests/:id", auth, requireRole("superadmin", "admin"), adminController.getFeeRequest);
router.patch("/fee-requests/:id", auth, requireRole("superadmin", "admin"), adminController.updateFeeRequest);
router.post("/fee-requests/:id/review", auth, requireRole("superadmin", "admin"), adminController.reviewFeeRequest);
router.delete("/fee-requests/:id", auth, requireRole("superadmin", "admin"), adminController.deleteFeeRequest);
router.get("/metrics", auth, requireRole("superadmin", "admin"), adminController.metrics);

module.exports = router;