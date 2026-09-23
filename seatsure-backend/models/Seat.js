const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['AVAILABLE', 'HELD', 'BOOKED'], 
    default: 'AVAILABLE' 
  },
  tier: { type: String, enum: ['VIP', 'PREM', 'STD'], default: 'STD' },
  price: { type: Number, required: true },
  heldBy: { type: String, default: null }, // User ID or Email
  heldAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Seat', seatSchema);