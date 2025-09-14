const Transaction = require("../models/Transaction");

// Getting of transactions for a user
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const txs = await Transaction.find({
      $or: [{ fromUser: userId }, { toUser: userId }]
    }).populate("fromUser toUser relatedRequest", "name email amountNeeded");
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
