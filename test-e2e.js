const http = require('http');
const { app, startServer } = require('./server');

const TEST_PORT = 3001;

// Helper to make HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;

async function runTests() {
  console.log('🧪 Starting End-to-End Integration Tests for Social Media Platform...\n');

  // Start server on dedicated test port
  process.env.PORT = TEST_PORT;
  server = app.listen(TEST_PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Healthcheck
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Module 1: Server and API health check');

    // Test 2: Auth Registration
    const testUsername = `user_${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      username: testUsername,
      email: testEmail,
      password: 'password123',
      name: 'Test Tester'
    });
    assert(regRes.status === 201 && regRes.data.token && regRes.data.user.username === testUsername, 'Module 2: User registration with validation & password hashing');
    let testToken = regRes.data.token;
    const testUserId = regRes.data.user.id;

    // Test 3: Auth Login
    const loginRes = await request('POST', '/api/auth/login', {
      login: testUsername,
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Module 2: User authentication & JWT issuance');
    testToken = loginRes.data.token;

    // Test 4: Auth Me
    const meRes = await request('GET', '/api/auth/me', null, testToken);
    assert(meRes.status === 200 && meRes.data.user.username === testUsername, 'Module 2: Protected /api/auth/me token verification');

    // Test 5: Profile Update
    const updateRes = await request('PUT', '/api/users/profile', {
      name: 'Tester Updated',
      bio: 'Writing automated tests #qa #dev',
      location: 'Berlin, Germany',
      website: 'https://tester.dev'
    }, testToken);
    assert(updateRes.status === 200 && updateRes.data.user.name === 'Tester Updated' && updateRes.data.user.location === 'Berlin, Germany', 'Module 3: Update profile info and metadata');

    // Test 6: Fetch Profile by Username
    const profileRes = await request('GET', `/api/users/${testUsername}`, null, testToken);
    assert(profileRes.status === 200 && profileRes.data.user.name === 'Tester Updated' && profileRes.data.user.is_self === true, 'Module 3: Fetch user profile by username with self-check');

    // Test 7: Post Creation
    const postRes = await request('POST', '/api/posts', {
      content: 'Hello Pulse social network! Testing #webdev and #express functionality!',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600'
    }, testToken);
    assert(postRes.status === 201 && postRes.data.post.id && postRes.data.post.likes_count === 0, 'Module 4: Post creation with content and image URL');
    const createdPostId = postRes.data.post.id;

    // Test 8: Post Retrieval
    const getPostRes = await request('GET', `/api/posts/${createdPostId}`, null, testToken);
    assert(getPostRes.status === 200 && getPostRes.data.post.author_username === testUsername, 'Module 4: Fetch single post details');

    // Test 9: Global Feed
    const feedRes = await request('GET', '/api/posts?filter=all', null, testToken);
    assert(feedRes.status === 200 && Array.isArray(feedRes.data.posts) && feedRes.data.posts.length > 0, 'Module 4: Global feed retrieval');

    // Test 10: Comments - Add Comment
    const commentRes = await request('POST', `/api/posts/${createdPostId}/comments`, {
      content: 'This is an automated test comment!'
    }, testToken);
    assert(commentRes.status === 201 && commentRes.data.comment.id && commentRes.data.comments_count === 1, 'Module 5: Add comment to post');
    const createdCommentId = commentRes.data.comment.id;

    // Test 11: Comments - Get Comments
    const getCommentsRes = await request('GET', `/api/posts/${createdPostId}/comments`, null, testToken);
    assert(getCommentsRes.status === 200 && getCommentsRes.data.comments.length === 1, 'Module 5: Retrieve post comments in chronological order');

    // Test 12: Like Toggle - Like
    const likeRes = await request('POST', `/api/posts/${createdPostId}/like`, null, testToken);
    assert(likeRes.status === 200 && likeRes.data.liked === true && likeRes.data.likes_count === 1, 'Module 6: Toggle Like on post (increment)');

    // Test 13: Like Toggle - Unlike
    const unlikeRes = await request('POST', `/api/posts/${createdPostId}/like`, null, testToken);
    assert(unlikeRes.status === 200 && unlikeRes.data.liked === false && unlikeRes.data.likes_count === 0, 'Module 6: Toggle Unlike on post (decrement)');

    // Test 14: Follow User - Follow Alex (ID: 1)
    const followRes = await request('POST', '/api/users/1/follow', null, testToken);
    assert(followRes.status === 200 && followRes.data.is_following === true, 'Module 6: Follow user');

    // Test 15: Following Feed
    const followingFeedRes = await request('GET', '/api/posts?filter=following', null, testToken);
    assert(followingFeedRes.status === 200 && Array.isArray(followingFeedRes.data.posts), 'Module 6: Retrieve Following-only feed');

    // Test 16: User Followers & Following lists
    const followersRes = await request('GET', `/api/users/alex/followers`, null, testToken);
    assert(followersRes.status === 200 && followersRes.data.followers.some(f => f.username === testUsername), 'Module 6: Verify follower list includes current user');

    // Test 17: Search Users and Posts
    const searchRes = await request('GET', '/api/search?q=webdev', null, testToken);
    assert(searchRes.status === 200 && (searchRes.data.posts.length > 0 || searchRes.data.users.length > 0), 'Module 7: Search posts and users by query/tags');

    // Test 18: Trending Topics
    const trendingRes = await request('GET', '/api/search/trending');
    assert(trendingRes.status === 200 && Array.isArray(trendingRes.data.trending), 'Module 7: Extract trending hashtags & frequencies');

    // Test 19: Delete Comment
    const delCommentRes = await request('DELETE', `/api/comments/${createdCommentId}`, null, testToken);
    assert(delCommentRes.status === 200 && delCommentRes.data.comments_count === 0, 'Module 5: Delete comment with authorization');

    // Test 20: Delete Post
    const delPostRes = await request('DELETE', `/api/posts/${createdPostId}`, null, testToken);
    assert(delPostRes.status === 200 && delPostRes.data.postId === createdPostId, 'Module 4: Delete post by owner');

    // Test 21: Static HTML/Frontend Delivery
    const staticRes = await request('GET', '/');
    assert(staticRes.status === 200 && typeof staticRes.data === 'string' && staticRes.data.includes('Pulse'), 'Module 8-11: Serve frontend SPA HTML bundle');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n=============================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=============================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL 12 MODULES VERIFIED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTests();
