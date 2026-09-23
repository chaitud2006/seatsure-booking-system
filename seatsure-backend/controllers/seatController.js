// In-memory seat storage (bypasses MongoDB completely for immediate UI testing)
let mockSeats = Array.from({ length: 30 }, (_, i) => {
  const index = i + 1;
  const tiers = ['VIP', 'PREM', 'STD'];
  return {
    _id: `seat_${index}`,
    seatNumber: `A${index}`,
    tier: tiers[index % 3],
    price: index % 3 === 0 ? 150 : index % 3 === 1 ? 100 : 50,
    status: 'AVAILABLE',
    heldBy: null,
    holdExpiresAt: null
  };
});

// Map to manage active hold timers
const activeHolds = new Map();

// GET /api/seats
exports.getSeats = async (req, res) => {
  try {
    return res.status(200).json(mockSeats);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching seating grid.', error: error.message });
  }
};

// POST /api/seats/:seatId/hold
exports.holdSeat = async (req, res) => {
  const { seatId } = req.params;
  const { userId } = req.body;
  const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  try {
    const seatIndex = mockSeats.findIndex(s => s._id === seatId || s.seatNumber === seatId);
    if (seatIndex === -1) {
      return res.status(404).json({ message: 'Seat not found.' });
    }

    if (activeHolds.has(seatId) || mockSeats[seatIndex].status === 'HELD') {
      return res.status(409).json({ message: 'Seat is currently held by another user.' });
    }

    // Set auto-release timer
    const timer = setTimeout(() => {
      activeHolds.delete(seatId);

      mockSeats[seatIndex].status = 'AVAILABLE';
      mockSeats[seatIndex].heldBy = null;
      mockSeats[seatIndex].holdExpiresAt = null;

      if (req.io) {
        req.io.emit('seatReleased', mockSeats[seatIndex]);
      }
    }, HOLD_DURATION_MS);

    activeHolds.set(seatId, { userId, timer });

    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);
    mockSeats[seatIndex].status = 'HELD';
    mockSeats[seatIndex].heldBy = userId;
    mockSeats[seatIndex].holdExpiresAt = expiresAt;

    if (req.io) {
      req.io.emit('seatHeld', mockSeats[seatIndex]);
    }

    return res.status(200).json({ success: true, seat: mockSeats[seatIndex], expiresAt });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to hold seat.', error: error.message });
  }
};