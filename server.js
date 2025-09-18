const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// //use EJS as the view engine
// app.set('view engine', 'ejs');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));
console.log("Serving static files from:", path.join(__dirname, "public"));

// Connection to MongoDB
mongoose.connect("mongodb+srv://sharleenwambui28:Sharleen@cluster0.1dsixbb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error(err));

// The Routes we are using
app.use("/api/auth", require("./routes/auth"));
app.use("/api/fee-request", require("./routes/feeRequest"));
app.use("/api/donation", require("./routes/donation"));
app.use("/api/transaction", require("./routes/transaction"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Server running at http://localhost:${PORT}`));
