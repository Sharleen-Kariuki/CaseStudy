const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth, requireRole } = require("../middleware/auth");

router.get("/overview", auth, requireRole("superadmin", "admin"), adminController.overview);
router.get("/fee-requests", auth, requireRole("superadmin", "admin"), adminController.listFeeRequests);

module.exports = router;