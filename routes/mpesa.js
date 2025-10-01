const express = require("express");
const router = express.Router();
const mpesaController = require("../controllers/mpesaController");
const { auth } = require("../middleware/auth");

router.post("/stkpush", auth, mpesaController.stkPush);
router.post("/callback", mpesaController.callback);

module.exports = router;