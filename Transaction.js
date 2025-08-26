const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: "FeeRequest" },
  type: { type: String, enum: ["donation", "receive"], required: true },
  status: { type: String, enum: ["completed", "pending", "failed"], default: "pending" },
  date: { type: Date, default: Date.now },
  transactionId: { type: String }
});

module.exports = mongoose.model("Transaction", transactionSchema);
