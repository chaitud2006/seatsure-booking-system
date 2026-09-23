const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'seatsure_default_secret';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    console.error('JWT Error:', error.message);
    res.status(401).json({ message: 'Token failed or expired.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin privileges required.' });
  }
};

module.exports = { protect, adminOnly };