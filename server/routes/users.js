const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  updateProfile,
  togglePause,
  getPublicProfile,
  reportUser,
  blockUser,
  unblockUser,
  getOnlineCount,
} = require('../controllers/userController');

const router = express.Router();

router.patch('/profile', authenticate, upload.single('photo'), updateProfile);
router.patch('/pause', authenticate, togglePause);
router.post('/report', authenticate, reportUser);
router.post('/block', authenticate, blockUser);
router.post('/unblock', authenticate, unblockUser);
router.get('/online-count', getOnlineCount);
router.get('/:id', authenticate, getPublicProfile);

module.exports = router;
