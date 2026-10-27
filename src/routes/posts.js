const express = require('express');
const { run, get, all } = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts - Retrieve posts feed
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { filter = 'all', limit = 50, offset = 0 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    let whereClause = '';
    let params = [];

    if (filter === 'following') {
      if (!currentUserId) {
        return res.status(401).json({ error: 'You must be logged in to view your following feed.' });
      }
      whereClause = `WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR p.user_id = ?`;
      params.push(currentUserId, currentUserId);
    }

    const query = `
      SELECT 
        p.id, p.content, p.image_url, p.created_at, p.updated_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        ${currentUserId ? `(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as has_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10) || 50, parseInt(offset, 10) || 0);

    const posts = await all(query, params);

    const formattedPosts = posts.map(post => ({
      ...post,
      has_liked: Boolean(post.has_liked),
      likes_count: Number(post.likes_count),
      comments_count: Number(post.comments_count)
    }));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('Fetch feed error:', err);
    return res.status(500).json({ error: 'Failed to retrieve posts feed.' });
  }
});

// GET /api/posts/:id - Single post details
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const post = await get(
      `SELECT 
        p.id, p.content, p.image_url, p.created_at, p.updated_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        ${currentUserId ? `(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as has_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?`,
      [postId]
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    return res.json({
      post: {
        ...post,
        has_liked: Boolean(post.has_liked),
        likes_count: Number(post.likes_count),
        comments_count: Number(post.comments_count)
      }
    });
  } catch (err) {
    console.error('Fetch post error:', err);
    return res.status(500).json({ error: 'Failed to retrieve post.' });
  }
});

// POST /api/posts - Create a new post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content, image_url } = req.body;

    if ((!content || !content.trim()) && (!image_url || !image_url.trim())) {
      return res.status(400).json({ error: 'Post must contain text content or an image.' });
    }

    if (content && content.length > 2000) {
      return res.status(400).json({ error: 'Post content exceeds maximum length of 2000 characters.' });
    }

    const result = await run(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.user.id, (content || '').trim(), (image_url || '').trim()]
    );

    const newPost = await get(
      `SELECT 
        p.id, p.content, p.image_url, p.created_at, p.updated_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar,
        0 as likes_count,
        0 as comments_count,
        0 as has_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?`,
      [result.lastID]
    );

    return res.status(201).json({
      message: 'Post created successfully!',
      post: {
        ...newPost,
        has_liked: false,
        likes_count: 0,
        comments_count: 0
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ error: 'Failed to create post.' });
  }
});

// DELETE /api/posts/:id - Delete own post
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await get('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    await run('DELETE FROM posts WHERE id = ?', [postId]);

    return res.json({ message: 'Post deleted successfully.', postId: parseInt(postId, 10) });
  } catch (err) {
    console.error('Delete post error:', err);
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
