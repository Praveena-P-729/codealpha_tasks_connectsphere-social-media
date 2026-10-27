const express = require('express');
const { all, get } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/search?q=query - Search across users and posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const currentUserId = req.user ? req.user.id : null;

    if (!query) {
      return res.json({ users: [], posts: [] });
    }

    const searchTerm = `%${query}%`;

    // Search users
    const users = await all(
      `SELECT id, username, name, bio, avatar_url,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
        ${currentUserId ? `(SELECT 1 FROM follows WHERE follower_id = ${currentUserId} AND following_id = users.id)` : '0'} as is_following,
        ${currentUserId ? `(users.id = ${currentUserId})` : '0'} as is_self
       FROM users
       WHERE username LIKE ? OR name LIKE ? OR bio LIKE ?
       LIMIT 10`,
      [searchTerm, searchTerm, searchTerm]
    );

    // Search posts
    const posts = await all(
      `SELECT 
        p.id, p.content, p.image_url, p.created_at, p.updated_at,
        u.id as author_id, u.username as author_username, u.name as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        ${currentUserId ? `(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as has_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.content LIKE ?
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [searchTerm]
    );

    const formattedUsers = users.map(u => ({
      ...u,
      is_following: Boolean(u.is_following),
      is_self: Boolean(u.is_self),
      followers_count: Number(u.followers_count)
    }));

    const formattedPosts = posts.map(p => ({
      ...p,
      has_liked: Boolean(p.has_liked),
      likes_count: Number(p.likes_count),
      comments_count: Number(p.comments_count)
    }));

    return res.json({
      query,
      users: formattedUsers,
      posts: formattedPosts
    });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed.' });
  }
});

// GET /api/search/suggested - Suggested users to follow
router.get('/suggested', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;

    let query = '';
    let params = [];

    if (currentUserId) {
      query = `
        SELECT id, username, name, bio, avatar_url,
          (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
          0 as is_following
        FROM users
        WHERE id != ? 
          AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
        ORDER BY followers_count DESC, id DESC
        LIMIT 5
      `;
      params = [currentUserId, currentUserId];
    } else {
      query = `
        SELECT id, username, name, bio, avatar_url,
          (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
          0 as is_following
        FROM users
        ORDER BY followers_count DESC, id DESC
        LIMIT 5
      `;
    }

    const users = await all(query, params);

    return res.json({
      users: users.map(u => ({
        ...u,
        is_following: false,
        followers_count: Number(u.followers_count)
      }))
    });
  } catch (err) {
    console.error('Fetch suggested error:', err);
    return res.status(500).json({ error: 'Failed to retrieve suggestions.' });
  }
});

// GET /api/search/trending - Trending hashtags
router.get('/trending', async (req, res) => {
  try {
    const posts = await all('SELECT content FROM posts ORDER BY created_at DESC LIMIT 100');

    const tagCounts = {};
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;

    for (const post of posts) {
      const matches = post.content.match(hashtagRegex);
      if (matches) {
        for (let tag of matches) {
          tag = tag.toLowerCase();
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const trending = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Fallback default trending topics if few posts
    if (trending.length === 0) {
      trending.push(
        { tag: '#welcome', count: 12 },
        { tag: '#webdev', count: 8 },
        { tag: '#javascript', count: 7 },
        { tag: '#tech', count: 5 },
        { tag: '#codealpha', count: 4 }
      );
    }

    return res.json({ trending });
  } catch (err) {
    console.error('Fetch trending error:', err);
    return res.status(500).json({ error: 'Failed to retrieve trending topics.' });
  }
});

module.exports = router;
