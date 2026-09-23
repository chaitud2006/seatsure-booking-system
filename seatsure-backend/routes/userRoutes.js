const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });

const { protect } = require('../middleware/authMiddleware');
const {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  addSavedLocation
} = require('../controllers/userController');

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/locations', protect, addSavedLocation);

module.exports = router;