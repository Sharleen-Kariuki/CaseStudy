const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String }
});

module.exports = mongoose.model("University", universitySchema);