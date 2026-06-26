const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createRoom, getRoom } = require('../controllers/roomController');

const router = express.Router();

router.post('/', authenticate, createRoom);
router.get('/:roomId', authenticate, getRoom);

module.exports = router;
