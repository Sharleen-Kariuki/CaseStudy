const User = require("../models/User");
const FeeRequest = require("../models/FeeRequest");
const Donation = require("../models/Donation");
const Transaction = require("../models/Transaction");

exports.overview = async (req, res) => {
  try {
    const [users, feeRequests, donations, txs] = await Promise.all([
      User.countDocuments(),
      FeeRequest.countDocuments(),
      Donation.countDocuments(),
      Transaction.countDocuments()
    ]);

    const totalRaisedAgg = await FeeRequest.aggregate([
      { $group: { _id: null, total: { $sum: "$amountRaised" } } }
    ]);

    res.json({
      users,
      feeRequests,
      donations,
      transactions: txs,
      totalRaised: totalRaisedAgg[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listFeeRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await FeeRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("requester", "name email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};