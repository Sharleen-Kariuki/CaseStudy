const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ for HTML forms
app.use(cors());

// MongoDB Atlas connection
mongoose.connect("mongodb+srv://sharleenwambui28:Sharleen@cluster0.1dsixbb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send("❌ Email already registered");

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, phone, password: hashedPassword });
    await newUser.save();

    //   res.send(`✅ Signup successful! Welcome, ${name}`);
      res.redirect("/Dashboard.html");
  } catch (err) {
    res.status(500).send("❌ Error: " + err.message);
  }
});

// Login Route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("❌ User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("❌ Invalid credentials");

    //   res.send(`✅ Login successful! Welcome back, ${user.name}`);
        res.redirect("/Dashboard.html");
  } catch (err) {
    res.status(500).send("❌ Error: " + err.message);
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
