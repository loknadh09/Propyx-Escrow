const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/propyx";
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB Connected");
    return mongoose.connection;
  } catch (error) {
    console.error("⚠️  MongoDB connection failed:", error.message);
    console.error("Continuing without persistent DB - data will be lost on restart");
    return null;
  }
};

module.exports = connectDB;