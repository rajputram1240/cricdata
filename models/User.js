const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: {type: String, default: "https://storage.googleapis.com/grandleagueguru/f45f0de0c1c7725fbf1cc293fc4bd1d2.png"},
  email: { type: String, required: true, unique: true }, // Added email field
  role: { type: String, enum: ['normal', 'admin'], default: 'normal' }, // Add role field
});

// Hash the password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
UserSchema.methods.isPasswordValid = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;