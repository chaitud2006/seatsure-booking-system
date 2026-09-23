const User = require('../models/User');

// GET /api/user/profile - Get current user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/user/profile - Update name or basic details
exports.updateUserProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    await user.save();

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/user/avatar - Upload profile photo
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file.' });
    }

    const user = await User.findById(req.user._id);
    user.avatar = req.file.path; // Cloudinary image URL
    await user.save();

    res.status(200).json({ message: 'Avatar updated successfully', avatarUrl: user.avatar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/user/locations - Save address
exports.addSavedLocation = async (req, res) => {
  try {
    const { address, city, zipCode } = req.body;
    const user = await User.findById(req.user._id);

    user.savedLocations.push({ address, city, zipCode });
    await user.save();

    res.status(200).json({ message: 'Location saved', locations: user.savedLocations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};