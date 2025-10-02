const express = require("express");
const router = express.Router();
const mpesaController = require("../controllers/mpesaController");
const { auth, requireRole } = require("../middleware/auth");

router.post("/stkpush", auth, mpesaController.stkPush);
router.post("/admin/stkpush", auth, requireRole("admin","superadmin"), mpesaController.adminStkPush);
router.post("/callback", mpesaController.callback);

module.exports = router;