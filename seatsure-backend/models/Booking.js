const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['UPCOMING', 'CANCELLED', 'COMPLETED'], default: 'UPCOMING' },
  paymentId: { type: String, required: true },
  bookingDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);