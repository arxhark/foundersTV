const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  saveConnection,
  listConnections,
  getMessages,
  sendMessage,
} = require('../controllers/connectionController');

const router = express.Router();

router.get('/', authenticate, listConnections);
router.post('/save', authenticate, saveConnection);
router.get('/:connectionId/messages', authenticate, getMessages);
router.post('/:connectionId/messages', authenticate, sendMessage);

module.exports = router;
