const { Queue, Worker } = require('bullmq');
const Seat = require('../models/Seat');
const { redis, releaseSeatLock } = require('./lockService');

// Create the hold-expiration queue
const holdExpirationQueue = new Queue('seat-hold-expiration', {
  connection: { host: '127.0.0.1', port: 6379 }
});

// Worker to process expired holds
const worker = new Worker('seat-hold-expiration', async (job) => {
  const { seatId, userId } = job.data;
  
  const seat = await Seat.findById(seatId);
  
  // If the seat is still held by the user and hasn't been confirmed/booked
  if (seat && seat.status === 'HELD' && seat.heldBy === userId) {
    seat.status = 'AVAILABLE';
    seat.heldBy = null;
    seat.heldAt = null;
    await seat.save();

    await releaseSeatLock(seatId);

    // Broadcast real-time release event via WebSockets
    if (global.io) {
      global.io.emit('seatReleased', seat);
    }
  }
}, { connection: { host: '127.0.0.1', port: 6379 } });

const scheduleHoldExpiration = async (seatId, userId, delayMs = 300000) => {
  await holdExpirationQueue.add(
    'expireHold',
    { seatId, userId },
    { delay: delayMs, jobId: `hold:${seatId}` } // Prevents duplicate queues for the same seat
  );
};

module.exports = { scheduleHoldExpiration };