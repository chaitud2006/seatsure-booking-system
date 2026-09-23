const express = require('express');
const router = express.Router();
const { getSeats, holdSeat } = require('../controllers/seatController');

router.get('/', getSeats);
router.post('/:seatId/hold', holdSeat);

module.exports = router;