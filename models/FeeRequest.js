const mongoose = require("mongoose");

const feeRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amountNeeded: { type: Number, required: true },
  amountRaised: { type: Number, default: 0 },
  course: { type: String, required: true },
  university: { type: String, required: true },
  semester: { type: String, required: true },
  deadline: { type: Date, required: true },
  description: { type: String, required: true },
  donors: [{
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },

  
  reviewStatus: { type: String, enum: ["unreviewed", "approved", "rejected"], default: "unreviewed", index: true },
  reviewNotes: { type: String },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
  timestamps: true
});

module.exports = mongoose.model("FeeRequest", feeRequestSchema);