const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  console.log("Connecting to Mongo:", uri); 
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ MongoDB connected");
}

module.exports = connectDB;
