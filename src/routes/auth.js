const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get } = require('../db/database');
const { requireAuth, generateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to sanitize and format user object
const formatUser = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, name, bio, avatar_url } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ error: 'Username, email, name, and password are required.' });
    }

    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    name = name.trim();

    // Validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check uniqueness
    const existing = await get(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing) {
      if (existing.username.toLowerCase() === username) {
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }
      if (existing.email.toLowerCase() === email) {
        return res.status(400).json({ error: 'Email is already registered. Please log in.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default avatar if not provided
    const defaultAvatar = avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

    const result = await run(
      `INSERT INTO users (username, email, password_hash, name, bio, avatar_url, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, name, bio || '', defaultAvatar, defaultCover]
    );

    const newUser = await get(
      'SELECT id, username, email, name, bio, avatar_url, cover_url, location, website, created_at FROM users WHERE id = ?',
      [result.lastID]
    );

    const token = generateToken(newUser.id);

    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        ...newUser,
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    const identifier = login.trim();

    // Query user by username or email
    const user = await get(
      `SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    // Fetch user stats
    const stats = await get(
      `SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count`,
      [user.id, user.id, user.id]
    );

    const token = generateToken(user.id);

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        ...formatUser(user),
        followers_count: stats.followers_count || 0,
        following_count: stats.following_count || 0,
        posts_count: stats.posts_count || 0
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const stats = await get(
      `SELECT 
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count`,
      [req.user.id, req.user.id, req.user.id]
    );

    return res.json({
      user: {
        ...req.user,
        followers_count: stats.followers_count || 0,
        following_count: stats.following_count || 0,
        posts_count: stats.posts_count || 0
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
