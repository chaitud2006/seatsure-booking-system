const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

const Seat = require('./models/Seat');
const { acquireSeatLock, releaseSeatLock } = require('./services/lockService');
const { scheduleHoldExpiration } = require('./services/queueService');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// --- RATE LIMITING (Bot & Scalper Protection) ---
const holdRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 hold requests per minute
  message: { message: 'Too many hold attempts from this IP. Please try again after 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket.io Setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
global.io = io;

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/seatsure';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// --- API ENDPOINTS ---

app.get('/api/seats', async (req, res) => {
  try {
    const seats = await Seat.find().sort({ seatNumber: 1 });
    res.json(seats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching seats' });
  }
});

// Atomic Hold Endpoint with MongoDB Transaction & Rate Limiter
app.post('/api/seats/:id/hold', holdRateLimiter, async (req, res) => {
  const { id } = req.params;
  const userId = req.body?.userId || 'guest@seatsure.com';

  // Start MongoDB Session for ACID Transaction
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    const seat = await Seat.findById(id).session(session);
    if (!seat) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Seat not found' });
    }

    if (seat.status === 'BOOKED') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Seat is already booked' });
    }

    // Step 1: Redis Atomic Lock Check
    const lockAcquired = await acquireSeatLock(id, userId, 300);
    if (!lockAcquired && seat.heldBy !== userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Seat availability conflict! Locked by another user.' });
    }

    // Step 2: Database State Update inside Transaction
    seat.status = 'HELD';
    seat.heldBy = userId;
    seat.heldAt = new Date();
    await seat.save({ session });

    // Commit MongoDB Transaction
    await session.commitTransaction();
    session.endSession();

    // Step 3: Schedule Asynchronous Hold Expiration Job
    await scheduleHoldExpiration(seat._id.toString(), userId, 300000);

    // Step 4: Emit WebSocket Event
    io.emit('seatHeld', seat);

    return res.json({ success: true, seat });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: 'Internal server error during seat hold.' });
  }
});

// Booking Confirmation Endpoint
app.post('/api/seats/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const seat = await Seat.findById(id).session(session);
    if (!seat) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Seat not found' });
    }

    seat.status = 'BOOKED';
    seat.heldBy = null;
    seat.heldAt = null;
    await seat.save({ session });

    await session.commitTransaction();
    session.endSession();

    await releaseSeatLock(id);
    io.emit('seatBooked', seat);

    return res.json({ success: true, seat });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ message: 'Failed to confirm booking' });
  }
});

// Seed Database Route
app.post('/api/seats/seed', async (req, res) => {
  try {
    await Seat.deleteMany({});
    const initialSeats = Array.from({ length: 20 }, (_, i) => ({
      seatNumber: `A${i + 1}`,
      status: 'AVAILABLE',
      tier: i < 5 ? 'VIP' : i < 12 ? 'PREM' : 'STD',
      price: i < 5 ? 150 : i < 12 ? 120 : 100,
    }));

    const insertedSeats = await Seat.insertMany(initialSeats);
    io.emit('gridReset', insertedSeats);
    return res.json({ success: true, seats: insertedSeats });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to seed database' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`SeatSure Production Backend running on port ${PORT}`));