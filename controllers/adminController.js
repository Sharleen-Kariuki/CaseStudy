const User = require("../models/User");
const FeeRequest = require("../models/FeeRequest");
const Donation = require("../models/Donation");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Overview (unchanged conceptually, returns counts + totalRaised)
 */
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
      counts: { users, feeRequests, donations, transactions: txs },
      totalRaised: totalRaisedAgg[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Paginated + filterable list
 */
exports.listFeeRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, reviewStatus } = req.query;
    const query = {};
    if (status) query.status = status;
    if (reviewStatus) query.reviewStatus = reviewStatus;
    if (search) {
      query.$or = [
        { course: new RegExp(search, "i") },
        { university: new RegExp(search, "i") },
        { description: new RegExp(search, "i") }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      FeeRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("requester", "name email"),
      FeeRequest.countDocuments(query)
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Single fee request detail
 */
exports.getFeeRequest = async (req, res) => {
  try {
    const fr = await FeeRequest.findById(req.params.id)
      .populate("requester", "name email role")
      .populate("reviewedBy", "name email role")
      .populate("donors.donor", "name email");
    if (!fr) return res.status(404).json({ error: "Fee request not found" });
    res.json(fr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin edit (limited fields)
 */
exports.updateFeeRequest = async (req, res) => {
  try {
    const allowed = ["amountNeeded", "course", "university", "semester", "deadline", "description", "status"];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    updates.lastEditedBy = req.user.id;
    const updated = await FeeRequest.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("requester", "name email")
      .populate("reviewedBy", "name email");
    if (!updated) return res.status(404).json({ error: "Fee request not found" });
    res.json({ message: "Updated", request: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Review (approve / reject) with notes
 * Body: { action: "approve"|"reject", notes?: string }
 */
exports.reviewFeeRequest = async (req, res) => {
  try {
    const { action, notes } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    const reviewStatus = action === "approve" ? "approved" : "rejected";
    const fr = await FeeRequest.findByIdAndUpdate(
      req.params.id,
      {
        reviewStatus,
        reviewNotes: notes || null,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      },
      { new: true }
    )
      .populate("requester", "name email")
      .populate("reviewedBy", "name email");
    if (!fr) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Review updated", request: fr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete (hard delete—consider soft delete if needed)
 */
exports.deleteFeeRequest = async (req, res) => {
  try {
    const fr = await FeeRequest.findByIdAndDelete(req.params.id);
    if (!fr) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted", id: fr._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Analytics metrics (previous)
 */
exports.metrics = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

    const donationsByDay = await Donation.aggregate([
      { $match: { date: { $gte: start } } },
      {
        $group: {
          _id: {
            y: { $year: "$date" },
            m: { $month: "$date" },
            d: { $dayOfMonth: "$date" }
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.y",
              month: "$_id.m",
              day: "$_id.d"
            }
          },
          total: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    const recentRequests = await FeeRequest.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("course university amountNeeded amountRaised status createdAt reviewStatus");

    const topActiveRequests = await FeeRequest.aggregate([
      { $match: { status: { $ne: "completed" } } },
      {
        $addFields: {
          remaining: { $subtract: ["$amountNeeded", "$amountRaised"] },
          pct: {
            $cond: [
              { $gt: ["$amountNeeded", 0] },
              { $multiply: [{ $divide: ["$amountRaised", "$amountNeeded"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { remaining: 1 } },
      { $limit: 5 },
      {
        $project: {
          course: 1,
          university: 1,
          amountNeeded: 1,
          amountRaised: 1,
          remaining: 1,
          pct: { $round: ["$pct", 1] },
          status: 1,
          reviewStatus: 1
        }
      }
    ]);

    const allForBuckets = await FeeRequest.find({}, "amountNeeded amountRaised");
    const buckets = { "0-25": 0, "25-50": 0, "50-75": 0, "75-99": 0, "100": 0 };
    allForBuckets.forEach(r => {
      if (r.amountNeeded <= 0) return;
      const pct = (r.amountRaised / r.amountNeeded) * 100;
      if (pct >= 100) buckets["100"]++;
      else if (pct >= 75) buckets["75-99"]++;
      else if (pct >= 50) buckets["50-75"]++;
      else if (pct >= 25) buckets["25-50"]++;
      else buckets["0-25"]++;
    });

    res.json({
      donationsByDay,
      recentRequests,
      topActiveRequests,
      completionBuckets: buckets
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};