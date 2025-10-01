const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields required." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ error: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, phone, password: hashedPassword });
    await newUser.save();

    const token = generateToken(newUser);
    res.status(201).json({
      message: "Signup successful!",
      token,
      user: { id: newUser._id, name, email, phone, role: newUser.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });

    const token = generateToken(user);
    res.json({
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};