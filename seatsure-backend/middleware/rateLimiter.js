const rateLimit = require('express-rate-limit');

// Strictly limit seat hold requests per IP
const holdLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // Limit each IP to 5 seat hold requests per minute
  message: { message: 'Too many hold requests from this IP, please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { holdLimiter };