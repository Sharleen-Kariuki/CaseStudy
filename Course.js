const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  university: { type: mongoose.Schema.Types.ObjectId, ref: "University" }
});

module.exports = mongoose.model("Course", courseSchema);
