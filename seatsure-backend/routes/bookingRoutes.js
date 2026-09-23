const express = require('express');
const router = express.Router();
const { createBooking, getBookings } = require('../controllers/bookingController');

// Ensure both createBooking and getBookings are defined functions
router.post('/', createBooking);
router.get('/', getBookings);

module.exports = router;