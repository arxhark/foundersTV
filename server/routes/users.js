const express = require('express');
const { authenticate } = require('../middleware/auth');
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
router.delete('/contacts/:connectionId', authenticate, deleteContact);
router.post('/report', authenticate, reportUser);
router.get('/online-count', getOnlineCount);

module.exports = router;
