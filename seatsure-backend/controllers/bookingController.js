const Booking = require('../models/Booking');
const Seat = require('../models/Seat');

// POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const { seatId, userId } = req.body;

    const booking = await Booking.create({
      seat: seatId,
      user: userId,
      status: 'CONFIRMED'
    });

    await Seat.findByIdAndUpdate(seatId, { status: 'BOOKED' });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: 'Booking failed', error: error.message });
  }
};

// GET /api/bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate('seat user');
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};