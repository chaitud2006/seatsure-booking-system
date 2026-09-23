const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyOTP,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

module.exports = router;