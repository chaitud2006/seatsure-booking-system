const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Configure TLS options for Upstash (rediss://)
const redis = new Redis(redisUrl, {
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => console.log('Connected to Upstash Redis successfully!'));
redis.on('error', (err) => console.error('Redis connection error:', err));

/**
 * Attempts to acquire an atomic lock on a seat.
 * @param {string} seatId 
 * @param {string} userId 
 * @param {number} ttlSeconds Hold duration (default 300s / 5 mins)
 * @returns {Promise<boolean>} True if lock acquired, false if seat is already locked
 */
const acquireSeatLock = async (seatId, userId, ttlSeconds = 300) => {
  const lockKey = `lock:seat:${seatId}`;
  
  // NX = Only set key if it does not exist
  // EX = Expiration time in seconds
  const result = await redis.set(lockKey, userId, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
};

const releaseSeatLock = async (seatId) => {
  const lockKey = `lock:seat:${seatId}`;
  await redis.del(lockKey);
};

module.exports = { redis, acquireSeatLock, releaseSeatLock };
