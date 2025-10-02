const User = require("../models/User");
const FeeRequest = require("../models/FeeRequest");
const Donation = require("../models/Donation");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Basic aggregated counts & total raised
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
 * Fee requests listing with optional status & search
 * Query params:
 *   status=pending|completed|failed (optional)
 *   search=string (matches course/university/description)
 *   page, limit
 */
exports.listFeeRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
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
 * Rich metrics for dashboard visualizations
 *  - donationsByDay (last 14 days)
 *  - topActiveRequests (not completed)
 *  - recentRequests
 *  - completionBuckets
 */
exports.metrics = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000); // 14 day window

    // Donations by day (based on Donation.date)
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

    // Recent 5 fee requests
    const recentRequests = await FeeRequest.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("course university amountNeeded amountRaised status createdAt");

    // Top 5 active (not completed) by remaining amount
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
          status: 1
        }
      }
    ]);

    // Completion buckets
    const allForBuckets = await FeeRequest.find({}, "amountNeeded amountRaised");
    const buckets = {
      "0-25": 0,
      "25-50": 0,
      "50-75": 0,
      "75-99": 0,
      "100": 0
    };
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