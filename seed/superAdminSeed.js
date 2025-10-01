require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

(async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = process.env.SUPERADMIN_EMAIL;
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Superadmin already exists:", email);
      process.exit(0);
    }
    const hashed = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 10);
    const user = await User.create({
      name: process.env.SUPERADMIN_NAME,
      email,
      phone: process.env.SUPERADMIN_PHONE,
      password: hashed,
      role: process.env.SUPERADMIN_ROLE || "superadmin"
    });
    console.log("Superadmin created:", user.email);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();