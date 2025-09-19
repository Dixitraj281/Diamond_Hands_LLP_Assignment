const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, index: true }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
