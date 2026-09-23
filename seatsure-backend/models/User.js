const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  savedLocations: [{
    address: String,
    city: String,
    zipCode: String
  }],
  savedPaymentPreferences: {
    preferredMethod: { type: String, enum: ['CARD', 'UPI', 'PAYPAL'], default: 'CARD' },
    cardLast4: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);