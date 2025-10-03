const generateHmacSignature = require('../utils/hmac');
const Transaction = require("../models/Transaction");
const FeeRequest = require("../models/FeeRequest");
const Donation = require("../models/Donation");

/**
 * Initiates an STK Push (Quikk). Creates a pending Transaction.
 * Body: { phone, amount, reference, requestId }
 */
exports.stkPush = async (req, res) => {
  try {
    const { phone, amount, reference, requestId } = req.body;
    if (!phone || !amount || !reference || !requestId) {
      return res.status(400).json({ error: "phone, amount, reference, requestId required" });
    }
    const QUIKK_API_KEY = process.env.QUIKK_API_KEY;
    const QUIKK_API_SECRET = process.env.QUIKK_API_SECRET;
    const QUIKK_SHORTCODE = process.env.QUIKK_SHORTCODE;
    const QUIKK_BASE_URL = process.env.QUIKK_BASE_URL || 'https://tryapi.quikk.dev';

    const dateHeader = new Date().toUTCString();
    const headersObj = { date: dateHeader };
    const authorizationHeader = generateHmacSignature({
      keyId: QUIKK_API_KEY,
      secret: QUIKK_API_SECRET,
      headersObj
    });

    const payload = {
      data: {
        type: "charge",
        attributes: {
          amount,
            posted_at: new Date().toISOString(),
          reference,
          short_code: QUIKK_SHORTCODE,
          customer_no: phone,
          customer_type: "msisdn"
        }
      }
    };

    const fetchRes = await fetch(`${QUIKK_BASE_URL}/v1/mpesa/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        date: dateHeader,
        Authorization: authorizationHeader
      },
      body: JSON.stringify(payload)
    });

    const result = await fetchRes.json();

    if (result.errors) {
      return res.status(400).json({ error: result.errors });
    }

    // Store pending transaction
    const transaction = await Transaction.create({
      fromUser: req.user.id,
      toUser: req.user.id, // will replace with requester after success
      amount,
      relatedRequest: requestId,
      type: "donation",
      status: "pending",
      transactionId: result?.data?.id || reference
    });

    // For DEMO (if sandbox doesn't callback), schedule auto-success
    setTimeout(async () => {
      try {
        // Simulate callback success if still pending
        const tx = await Transaction.findById(transaction._id);
        if (tx.status === "pending") {
          await simulateSuccess(tx, amount, requestId, req.user.id);
        }
      } catch (e) {
        console.error("Simulation error:", e.message);
      }
    }, 12000);

    res.json({
      message: "STK Push initiated",
      gatewayResponse: result,
      transaction
    });
  } catch (err) {
    console.error("STK Push Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Quikk / M-Pesa callback endpoint.
 * Should receive status + metadata.
 * Update Transaction, FeeRequest, Donation.
 */
exports.callback = async (req, res) => {
  try {
    console.log("Callback received:", JSON.stringify(req.body, null, 2));
    // Adjust to actual callback format
    const { transactionId, status, amount, requestId, fromUser } = req.body;

    const tx = await Transaction.findOne({ transactionId });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    if (status === "success") {
      await simulateSuccess(tx, amount || tx.amount, requestId || tx.relatedRequest, fromUser || tx.fromUser);
    } else {
      tx.status = "failed";
      await tx.save();
    }

    res.json({ message: "Callback processed" });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Helper to finalize success
async function simulateSuccess(tx, amount, requestId, donorId) {
  const feeReq = await FeeRequest.findById(requestId);
  if (!feeReq) return;

  feeReq.donors.push({ donor: donorId, amount });
  feeReq.amountRaised += amount;
  if (feeReq.amountRaised >= feeReq.amountNeeded) feeReq.status = "completed";
  await feeReq.save();

  await Donation.create({
    donor: donorId,
    request: requestId,
    amount
  });

  tx.status = "completed";
  tx.toUser = feeReq.requester;
  await tx.save();

  console.log("Donation success processed for tx:", tx._id);
}
/**
 * Admin-initiated STK push (simulate donating as admin or specified donorUserId)
 * Body: { phone, amount, reference, requestId, donorUserId? }
 */
exports.adminStkPush = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { phone, amount, reference, requestId, donorUserId } = req.body;
    if (!phone || !amount || !reference || !requestId) {
      return res.status(400).json({ error: "phone, amount, reference, requestId required" });
    }
    // Reuse existing logic - we impersonate donor as either donorUserId or the admin themselves
    req.user.id = donorUserId || req.user.id;
    return exports.stkPush(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};