const Transaction = require("../models/Transaction");

exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const txs = await Transaction.find({
      $or: [{ fromUser: userId }, { toUser: userId }]
    })
      .sort({ createdAt: -1 })
      .populate("fromUser toUser relatedRequest", "name email amountNeeded");
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};