const FeeRequest = require("../models/FeeRequest");
const User = require("../models/User");

// Create fee request
exports.createFeeRequest = async (req, res) => {
  try {
    const { amountNeeded, course, university, semester, deadline, description } = req.body;
    const requester = req.body.requester || req.user?.id; // Add auth in production

    if (!requester || !amountNeeded || !course || !university || !semester || !deadline || !description) {
      return res.status(400).json({ error: "All fields required." });
    }

    const newRequest = new FeeRequest({
      requester,
      amountNeeded,
      course,
      university,
      semester,
      deadline,
      description
    });

    await newRequest.save();
    res.status(201).json({ message: "Request created!", request: newRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all fee requests
exports.getFeeRequests = async (req, res) => {
  try {
    const requests = await FeeRequest.find().populate("requester donors.donor", "name email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get requests by user
exports.getMyFeeRequests = async (req, res) => {
  try {
    const requester = req.params.userId || req.user?.id;
    const requests = await FeeRequest.find({ requester }).populate("donors.donor", "name email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};