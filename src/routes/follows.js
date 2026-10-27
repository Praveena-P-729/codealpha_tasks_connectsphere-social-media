const express = require('express');
const { run, get, all } = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/users/:userId/follow - Follow or Unfollow a user
router.post('/users/:userId/follow', requireAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const targetUser = await get('SELECT id, username FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const existingFollow = await get(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [currentUserId, targetUserId]
    );

    let isFollowing = false;
    if (existingFollow) {
      // Unfollow
      await run('DELETE FROM follows WHERE id = ?', [existingFollow.id]);
      isFollowing = false;
    } else {
      // Follow
      await run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [currentUserId, targetUserId]);
      isFollowing = true;
    }

    // Return target user's updated stats
    const stats = await get(
      `SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count`,
      [targetUserId, targetUserId]
    );

    return res.json({
      message: isFollowing ? `You are now following @${targetUser.username}` : `You unfollowed @${targetUser.username}`,
      is_following: isFollowing,
      followers_count: stats.followers_count,
      following_count: stats.following_count
    });
  } catch (err) {
    console.error('Toggle follow error:', err);
    return res.status(500).json({ error: 'Failed to update follow status.' });
  }
});

// GET /api/users/:username/followers - Get list of users following this user
router.get('/users/:username/followers', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = await get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const followers = await all(
      `SELECT 
        u.id, u.username, u.name, u.bio, u.avatar_url,
        ${currentUserId ? `(SELECT 1 FROM follows WHERE follower_id = ${currentUserId} AND following_id = u.id)` : '0'} as is_following,
        ${currentUserId ? `(u.id = ${currentUserId})` : '0'} as is_self
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    const formattedFollowers = followers.map(f => ({
      ...f,
      is_following: Boolean(f.is_following),
      is_self: Boolean(f.is_self)
    }));

    return res.json({ followers: formattedFollowers });
  } catch (err) {
    console.error('Fetch followers error:', err);
    return res.status(500).json({ error: 'Failed to retrieve followers.' });
  }
});

// GET /api/users/:username/following - Get list of users this user is following
router.get('/users/:username/following', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = await get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const following = await all(
      `SELECT 
        u.id, u.username, u.name, u.bio, u.avatar_url,
        ${currentUserId ? `(SELECT 1 FROM follows WHERE follower_id = ${currentUserId} AND following_id = u.id)` : '0'} as is_following,
        ${currentUserId ? `(u.id = ${currentUserId})` : '0'} as is_self
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    const formattedFollowing = following.map(f => ({
      ...f,
      is_following: Boolean(f.is_following),
      is_self: Boolean(f.is_self)
    }));

    return res.json({ following: formattedFollowing });
  } catch (err) {
    console.error('Fetch following error:', err);
    return res.status(500).json({ error: 'Failed to retrieve following list.' });
  }
});

module.exports = router;
