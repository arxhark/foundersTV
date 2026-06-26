const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createPost,
  listFeed,
  reactToPost,
  commentOnPost,
  deletePost,
} = require('../controllers/postController');

const router = express.Router();

router.get('/', authenticate, listFeed);
router.post('/', authenticate, createPost);
router.post('/:id/react', authenticate, reactToPost);
router.post('/:id/comment', authenticate, commentOnPost);
router.delete('/:id', authenticate, deletePost);

module.exports = router;
