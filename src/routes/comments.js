const express = require('express');
const { run, get, all } = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/posts/:postId/comments - Get comments for a post
router.get('/:postId/comments', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const comments = await all(
      `SELECT 
        c.id, c.post_id, c.content, c.created_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    return res.json({ comments });
  } catch (err) {
    console.error('Fetch comments error:', err);
    return res.status(500).json({ error: 'Failed to retrieve comments.' });
  }
});

// POST /api/posts/:postId/comments - Add a comment
router.post('/:postId/comments', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment exceeds maximum length of 500 characters.' });
    }

    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const result = await run(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, req.user.id, content.trim()]
    );

    const newComment = await get(
      `SELECT 
        c.id, c.post_id, c.content, c.created_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.lastID]
    );

    const countResult = await get('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [postId]);

    return res.status(201).json({
      message: 'Comment added successfully!',
      comment: newComment,
      comments_count: countResult.count
    });
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// DELETE /api/comments/:id or /api/comments/item/:id - Delete a comment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const commentId = req.params.id;

    const comment = await get(
      `SELECT c.id, c.user_id as comment_author_id, c.post_id, p.user_id as post_author_id
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       WHERE c.id = ?`,
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Allow author of comment or author of post to delete
    if (comment.comment_author_id !== req.user.id && comment.post_author_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
    }

    await run('DELETE FROM comments WHERE id = ?', [commentId]);

    const countResult = await get('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [comment.post_id]);

    return res.json({
      message: 'Comment deleted successfully.',
      commentId: parseInt(commentId, 10),
      postId: comment.post_id,
      comments_count: countResult.count
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    return res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
