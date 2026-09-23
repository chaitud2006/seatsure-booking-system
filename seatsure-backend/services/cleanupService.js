const Seat = require('../models/Seat');

const cleanupExpiredHolds = async () => {
  try {
    const now = new Date();
    
    // Find and update all seats where hold duration has passed
    const result = await Seat.updateMany(
      { status: 'HELD', heldUntil: { $lt: now } },
      { 
        $set: { status: 'AVAILABLE' }, 
        $unset: { heldBy: 1, heldUntil: 1 } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Cleanup Service] Auto-released ${result.modifiedCount} expired seat hold(s).`);
    }
  } catch (error) {
    console.error('[Cleanup Service Error]:', error.message);
  }
};

const startCleanupTask = (intervalMs = 10000) => {
  // Runs every 10 seconds to check for stale holds
  setInterval(cleanupExpiredHolds, intervalMs);
  console.log('[Cleanup Service] Background auto-release worker started.');
};

module.exports = { startCleanupTask };