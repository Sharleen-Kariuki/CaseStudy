require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));
console.log("Serving static files from:", path.join(__dirname, "public"));


mongoose.connect("mongodb+srv://sharleenwambui28:Sharleen@cluster0.1dsixbb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error(err));


app.use("/api/auth", require("./routes/auth"));
app.use("/api/fee-request", require("./routes/feeRequest"));
app.use("/api/donation", require("./routes/donation"));
app.use("/api/transaction", require("./routes/transaction"));
app.use("/api/mpesa", require("./routes/mpesa"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Server running at http://localhost:${PORT}`));
