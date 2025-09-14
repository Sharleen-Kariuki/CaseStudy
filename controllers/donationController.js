const FeeRequest = require("../models/FeeRequest");
const Donation = require("../models/Donation");
const Transaction = require("../models/Transaction");

// Make a donation to a fee request
exports.makeDonation = async (req, res) => {
  try {
    const { donor, requestId, amount } = req.body;

    if (!donor || !requestId || !amount) {
      return res.status(400).json({ error: "All fields required." });
    }

    const request = await FeeRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: "Fee request not found." });

    // Add donor to request
    request.donors.push({ donor, amount });
    request.amountRaised += amount;
    if (request.amountRaised >= request.amountNeeded) request.status = "completed";
    await request.save();

    // Create donation record
    const donation = new Donation({ donor, request: requestId, amount });
    await donation.save();

    // Create transaction
    const transaction = new Transaction({
      fromUser: donor,
      toUser: request.requester,
      amount,
      relatedRequest: requestId,
      type: "donation",
      status: "completed"
    });
    await transaction.save();

    res.json({ message: "Donation successful!", donation, transaction, updatedRequest: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};