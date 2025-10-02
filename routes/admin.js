const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth, requireRole } = require("../middleware/auth");

// All admin endpoints require admin/superadmin
router.get("/overview", auth, requireRole("superadmin", "admin"), adminController.overview);
router.get("/fee-requests", auth, requireRole("superadmin", "admin"), adminController.listFeeRequests);
router.get("/metrics", auth, requireRole("superadmin", "admin"), adminController.metrics);

module.exports = router;