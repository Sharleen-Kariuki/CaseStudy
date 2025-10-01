const FeeRequest = require("../models/FeeRequest");

exports.createFeeRequest = async (req, res) => {
  try {
    const { amountNeeded, course, university, semester, deadline, description } = req.body;
    const requester = req.user?.id;
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

exports.getFeeRequests = async (req, res) => {
  try {
    const requests = await FeeRequest.find().sort({ createdAt: -1 })
      .populate("requester donors.donor", "name email role");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyFeeRequests = async (req, res) => {
  try {
    const requester = req.params.userId || req.user?.id;
    const requests = await FeeRequest.find({ requester }).populate("donors.donor", "name email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "completed", "failed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const request = await FeeRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Status updated", request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};