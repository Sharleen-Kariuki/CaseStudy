const crypto = require('crypto');

/**
 * Generates HMAC signature for Quikk API.
 * @param {Object} params
 * @param {string} params.keyId - Your API key (from Quikk)
 * @param {string} params.secret - Your API secret (from Quikk)
 * @param {Object} params.headersObj - { date: "...", ... }
 */
function generateHmacSignature({ keyId, secret, headersObj }) {
  // Quikk expects ONLY the date header, lowercase!
  const signingString = `date: ${headersObj.date}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signingString);
  const signature = hmac.digest('base64');
  const urlSafeSignature = encodeURIComponent(signature);

  
  console.log("HMAC signing string:", signingString);
  console.log("HMAC signature:", urlSafeSignature);

  // Return the final header string
  return `keyId="${keyId}",algorithm="hmac-sha256",headers="date",signature="${urlSafeSignature}"`;
}

module.exports = generateHmacSignature;