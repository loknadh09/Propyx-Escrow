const express = require("express");
const app = express();

const connectDB = require("./config/db");

const testRoutes = require("./routes/testRoutes");
const sellerRoutes = require("./routes/sellerRoutes");

connectDB();

app.use(express.json());

app.use("/api/test", testRoutes);
app.use("/api/seller", sellerRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});