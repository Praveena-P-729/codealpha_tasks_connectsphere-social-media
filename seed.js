const bcrypt = require('bcryptjs');
const { run, get, initSchema } = require('./src/db/database');

async function seed() {
  console.log('🌱 Starting database seeding...');
  await initSchema();

  // Clear existing data
  await run('DELETE FROM comments');
  await run('DELETE FROM likes');
  await run('DELETE FROM follows');
  await run('DELETE FROM posts');
  await run('DELETE FROM users');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create Users
  const usersData = [
    {
      username: 'alex',
      email: 'alex@example.com',
      name: 'Alex Rivera',
      bio: 'Full-stack software engineer & open source enthusiast. Exploring web architectures, Node.js & modern frontend frameworks. 🚀 #webdev #javascript',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      location: 'San Francisco, CA',
      website: 'https://alexrivera.dev'
    },
    {
      username: 'sarah_c',
      email: 'sarah@example.com',
      name: 'Sarah Chen',
      bio: 'Lead Product Designer 🎨 Crafting intuitive digital experiences & design systems. Advocate for accessible web. #design #uiux',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80',
      location: 'Seattle, WA',
      website: 'https://sarahchen.design'
    },
    {
      username: 'marcus_v',
      email: 'marcus@example.com',
      name: 'Marcus Vance',
      bio: 'Cloud Architect & Tech Speaker ☁️ Building resilient distributed microservices. Coffee lover ☕ #cloud #devops #tech',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      location: 'Austin, TX',
      website: 'https://marcusvance.io'
    },
    {
      username: 'elena_r',
      email: 'elena@example.com',
      name: 'Elena Rostova',
      bio: 'AI researcher & generative media enthusiast 🤖 Writing about neural networks and the future of human-computer interaction. #ai #tech',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
      location: 'Boston, MA',
      website: 'https://elena-ai.org'
    }
  ];

  const userIds = {};

  for (const u of usersData) {
    const res = await run(
      `INSERT INTO users (username, email, password_hash, name, bio, avatar_url, cover_url, location, website)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.email, passwordHash, u.name, u.bio, u.avatar_url, u.cover_url, u.location, u.website]
    );
    userIds[u.username] = res.lastID;
    console.log(`Created user: @${u.username} (ID: ${res.lastID})`);
  }

  // 2. Create Follow Relationships
  // Alex follows Sarah, Marcus
  // Sarah follows Alex, Elena
  // Marcus follows Alex, Sarah, Elena
  // Elena follows Alex
  const followPairs = [
    [userIds.alex, userIds.sarah_c],
    [userIds.alex, userIds.marcus_v],
    [userIds.sarah_c, userIds.alex],
    [userIds.sarah_c, userIds.elena_r],
    [userIds.marcus_v, userIds.alex],
    [userIds.marcus_v, userIds.sarah_c],
    [userIds.marcus_v, userIds.elena_r],
    [userIds.elena_r, userIds.alex]
  ];

  for (const [follower, following] of followPairs) {
    await run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [follower, following]);
  }
  console.log('Follow relationships created.');

  // 3. Create Posts
  const postsData = [
    {
      userId: userIds.alex,
      content: 'Just launched our new mini social media platform built with Express.js, SQLite, and vanilla modern JavaScript! 🚀 Clean modular architecture, real-time like/follow dynamics, and responsive dark mode. Feedback welcome! #codealpha #webdev #javascript',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop&q=80'
    },
    {
      userId: userIds.sarah_c,
      content: 'Good design is as little design as possible. When typography, whitespace, and micro-interactions align seamlessly, software feels like an extension of thought. 💡 What is your favorite design system? #design #uiux',
      imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80'
    },
    {
      userId: userIds.marcus_v,
      content: 'Scalability starts with relational data modeling. Normalized relational tables with well-indexed foreign keys and cascades beat premature microservices every single time! 💯 #tech #cloud',
      imageUrl: ''
    },
    {
      userId: userIds.elena_r,
      content: 'Experimenting with generative interface adapters that adjust contrast and layout based on ambient lighting and reading speed. The future of UX is adaptive and personalized! ✨ #ai #tech #design',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80'
    },
    {
      userId: userIds.alex,
      content: 'Pro tip for developers: always structure your web apps into clean decoupled modules. Easier to test, easier to scale, and a joy to maintain! 🛠️ #webdev #javascript #codealpha',
      imageUrl: ''
    }
  ];

  const postIds = [];
  for (const p of postsData) {
    const res = await run(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [p.userId, p.content, p.imageUrl]
    );
    postIds.push(res.lastID);
  }
  console.log(`${postIds.length} sample posts created.`);

  // 4. Create Likes
  const likePairs = [
    [postIds[0], userIds.sarah_c],
    [postIds[0], userIds.marcus_v],
    [postIds[0], userIds.elena_r],
    [postIds[1], userIds.alex],
    [postIds[1], userIds.marcus_v],
    [postIds[2], userIds.alex],
    [postIds[3], userIds.alex],
    [postIds[3], userIds.sarah_c],
    [postIds[4], userIds.marcus_v]
  ];

  for (const [postId, userId] of likePairs) {
    await run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }
  console.log('Sample likes added.');

  // 5. Create Comments
  const commentsData = [
    { postId: postIds[0], userId: userIds.sarah_c, content: 'This looks super sleek Alex! Love the dark aesthetic and snappy responses.' },
    { postId: postIds[0], userId: userIds.marcus_v, content: 'Great job! SQLite + Express is an outstanding combo for lightweight apps.' },
    { postId: postIds[1], userId: userIds.alex, content: 'Completely agree, Dieter Rams principles remain timeless.' },
    { postId: postIds[3], userId: userIds.alex, content: 'Exciting work Elena! Adaptive contrast is fantastic for accessibility.' }
  ];

  for (const c of commentsData) {
    await run('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [c.postId, c.userId, c.content]);
  }
  console.log('Sample comments added.');

  console.log('✅ Database successfully seeded!');
  console.log('=============================================');
  console.log('Demo Login Credentials:');
  console.log('👤 Username: alex       | Password: password123');
  console.log('👤 Username: sarah_c    | Password: password123');
  console.log('👤 Username: marcus_v   | Password: password123');
  console.log('👤 Username: elena_r    | Password: password123');
  console.log('=============================================');
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seed;
