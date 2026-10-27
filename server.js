const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./src/db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure public upload directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/posts', require('./src/routes/posts'));
app.use('/api/posts', require('./src/routes/comments'));
app.use('/api/comments', require('./src/routes/comments'));
app.use('/api/posts', require('./src/routes/likes'));
app.use('/api', require('./src/routes/likes'));
app.use('/api', require('./src/routes/follows'));
app.use('/api/search', require('./src/routes/search'));
app.use('/api/upload', require('./src/routes/upload'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback for HTML5 history API (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(__dirname, 'public/index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server after database schema init
const startServer = async () => {
  try {
    await initSchema();
    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Social Media Platform server running!`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
      console.log(`===============================================`);
    });
    return server;
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
