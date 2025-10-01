const FeeRequest = require("../models/FeeRequest");
const Donation = require("../models/Donation");
const Transaction = require("../models/Transaction");

exports.makeDonation = async (req, res) => {
  try {
    const { requestId, amount } = req.body;
    const donor = req.user?.id;

    if (!donor || !requestId || !amount) {
      return res.status(400).json({ error: "All fields required." });
    }

    const request = await FeeRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: "Fee request not found." });

    // Update progress
    request.donors.push({ donor, amount });
    request.amountRaised += amount;
    if (request.amountRaised >= request.amountNeeded) request.status = "completed";
    await request.save();

    const donation = new Donation({ donor, request: requestId, amount });
    await donation.save();

    const transaction = new Transaction({
      fromUser: donor,
      toUser: request.requester,
      amount,
      relatedRequest: requestId,
      type: "donation",
      status: "completed"
    });
    await transaction.save();

    res.json({ message: "Donation recorded!", donation, transaction, updatedRequest: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};