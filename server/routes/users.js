const express = require('express');
const { authenticate } = require('../middleware/auth');
const { ownConnection } = require('../middleware/ownership');
const { upload } = require('../config/cloudinary');
const {
  updateProfile,
  togglePause,
  getContacts,
  saveContact,
  deleteContact,
  reportUser,
  getOnlineCount,
} = require('../controllers/userController');

const router = express.Router();

router.patch('/profile', authenticate, upload.single('photo'), updateProfile);
router.patch('/pause', authenticate, togglePause);
router.get('/contacts', authenticate, getContacts);
router.post('/contacts', authenticate, saveContact);
// ownConnection verifies the connection belongs to req.user before deleteContact runs
router.delete('/contacts/:connectionId', authenticate, ownConnection, deleteContact);
router.post('/report', authenticate, reportUser);
router.get('/online-count', getOnlineCount);

module.exports = router;
