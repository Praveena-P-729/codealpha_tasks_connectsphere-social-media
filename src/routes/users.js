const express = require('express');
const { run, get, all } = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:username - Get user profile details
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await get(
      `SELECT id, username, name, bio, avatar_url, cover_url, location, website, created_at 
       FROM users 
       WHERE LOWER(username) = LOWER(?)`,
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUserId = req.user ? req.user.id : null;

    // Get stats and follow status
    const stats = await get(
      `SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count`,
      [user.id, user.id, user.id]
    );

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followCheck = await get(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [currentUserId, user.id]
      );
      isFollowing = !!followCheck;
    }

    return res.json({
      user: {
        ...user,
        followers_count: stats.followers_count || 0,
        following_count: stats.following_count || 0,
        posts_count: stats.posts_count || 0,
        is_following: isFollowing,
        is_self: currentUserId === user.id
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// PUT /api/users/profile - Update current user's profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, bio, avatar_url, cover_url, location, website } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }

    await run(
      `UPDATE users 
       SET name = ?, bio = ?, avatar_url = ?, cover_url = ?, location = ?, website = ?
       WHERE id = ?`,
      [
        name.trim(),
        bio ? bio.trim() : '',
        avatar_url ? avatar_url.trim() : req.user.avatar_url,
        cover_url ? cover_url.trim() : req.user.cover_url,
        location ? location.trim() : '',
        website ? website.trim() : '',
        req.user.id
      ]
    );

    const updatedUser = await get(
      `SELECT id, username, email, name, bio, avatar_url, cover_url, location, website, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    const stats = await get(
      `SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count`,
      [req.user.id, req.user.id, req.user.id]
    );

    return res.json({
      message: 'Profile updated successfully!',
      user: {
        ...updatedUser,
        followers_count: stats.followers_count || 0,
        following_count: stats.following_count || 0,
        posts_count: stats.posts_count || 0
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// GET /api/users/:username/posts - Get user's posts
router.get('/:username/posts', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const targetUser = await get(
      'SELECT id, username, name, avatar_url FROM users WHERE LOWER(username) = LOWER(?)',
      [username]
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUserId = req.user ? req.user.id : null;

    const posts = await all(
      `SELECT 
        p.id, p.content, p.image_url, p.created_at, p.updated_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        ${currentUserId ? `(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as has_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [targetUser.id]
    );

    const formattedPosts = posts.map(post => ({
      ...post,
      has_liked: Boolean(post.has_liked),
      likes_count: Number(post.likes_count),
      comments_count: Number(post.comments_count)
    }));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('Fetch user posts error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user posts.' });
  }
});

module.exports = router;
