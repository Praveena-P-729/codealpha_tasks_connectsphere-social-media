const express = require('express');
const { run, get, all } = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/posts/:postId/like - Toggle like on a post
router.post('/:postId/like', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check post exists
    const post = await get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Check if existing like exists
    const existing = await get(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    let liked = false;
    if (existing) {
      // Unlike
      await run('DELETE FROM likes WHERE id = ?', [existing.id]);
      liked = false;
    } else {
      // Like
      await run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      liked = true;
    }

    // Get updated like count
    const countResult = await get('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    return res.json({
      message: liked ? 'Post liked!' : 'Post unliked.',
      liked,
      likes_count: countResult.count
    });
  } catch (err) {
    console.error('Toggle like error:', err);
    return res.status(500).json({ error: 'Failed to process like action.' });
  }
});

// GET /api/users/:username/likes - Get all posts liked by a user
router.get('/users/:username/likes', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = await get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const posts = await all(
      `SELECT 
        p.id, p.content, p.image_url, p.created_at, p.updated_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        ${currentUserId ? `(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as has_liked
       FROM likes l
       JOIN posts p ON l.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC`,
      [user.id]
    );

    const formattedPosts = posts.map(post => ({
      ...post,
      has_liked: Boolean(post.has_liked),
      likes_count: Number(post.likes_count),
      comments_count: Number(post.comments_count)
    }));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('Fetch liked posts error:', err);
    return res.status(500).json({ error: 'Failed to retrieve liked posts.' });
  }
});

module.exports = router;
