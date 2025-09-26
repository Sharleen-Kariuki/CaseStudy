const generateHmacSignature = require('../utils/hmac');

exports.stkPush = async (req, res) => {
  console.log("Incoming req.body:", req.body);

  if (!req.body) {
    return res.status(400).json({ error: "No request body received. Did you send JSON and set Content-Type: application/json?" });
  }

  const { phone, amount, reference } = req.body || {};

  if (!phone || !amount || !reference) {
    return res.status(400).json({ error: "Missing required field(s): phone, amount, reference" });
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

  // MATCH THE SANDBOX EXAMPLE
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

  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${QUIKK_BASE_URL}/v1/mpesa/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        date: dateHeader,
        Authorization: authorizationHeader
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("Quikk API response:", result);

    if (result.errors || result.error) {
      return res.status(400).json({ error: result.errors || result.error });
    }

    return res.json(result);
  } catch (err) {
    console.error("STK Push Error:", err);
    return res.status(500).json({ error: err.message || "Unexpected error during STK Push" });
  }
};