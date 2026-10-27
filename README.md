# ConnectSphere — Modern Mini Social Media Platform

A modern, responsive mini social media web application built with **HTML5, CSS3, Vanilla JavaScript (ES6+ SPA)** on the frontend, and **Express.js with SQLite** on the backend.

---

## 🌟 Key Features

1. **User Profiles**:
   - Custom avatars, cover banners, bio, location, personal website, and joined dates.
   - Live counters for Posts, Followers, and Following.
   - Modal viewer to see who is following or followed by any user.
   - Dedicated profile tabs for user's posts and liked posts.
   - Interactive profile editor with image upload preview.

2. **Posts & Media**:
   - Create posts with up to 2,000 characters, hashtags, and `@mentions`.
   - Media support: direct image upload or image URLs with click-to-enlarge lightbox modal.
   - Emoji picker and dynamic character counter.
   - Delete posts authored by the logged-in user.
   - Global feed ("For You") and personalized feed ("Following").

3. **Comments & Discussions**:
   - Real-time collapsible comment drawer under every post.
   - Instant reply submission without page reloads.
   - Comments show author avatar, username, time ago, and content.
   - Delete comments (allowed for comment author or original post owner).

4. **Like & Follow System**:
   - Like/Unlike toggle with animated heart micro-interaction and live counter updates.
   - Follow/Unfollow users with instant UI state synchronization across feeds and profiles.
   - Dedicated "Following" stream filtering posts to only followed creators.

5. **Search & Discovery**:
   - Instant debounced search for both users and posts.
   - Hashtag parsing (`#webdev`, `#design`, `#ai`) that automatically filters posts.
   - "Who to Follow" suggested users widget.
   - "Trending Topics" widget calculating hashtag frequency.

6. **Modern Design & UX**:
   - Responsive 3-column layout (Left navigation, Center feed, Right discovery widget).
   - Mobile bottom navigation bar for small screens.
   - Dark Mode and Light Mode theme toggle with persistent `localStorage` preference.
   - Floating toast notification system for instant feedback.

---

## 🏗️ 12-Module Architectural Breakdown

| Module | Name | Key Deliverables |
|---|---|---|
| **Module 1** | Relational Database & Project Structure | `database.js` with SQLite schema (`users`, `posts`, `comments`, `likes`, `follows`), foreign keys, and indexes. |
| **Module 2** | User Authentication & Security | `routes/auth.js`, `middleware/auth.js` with bcrypt hashing, JWT issuance, `/register`, `/login`, and `/me`. |
| **Module 3** | User Profiles & Metadata Backend | `routes/users.js` with profile retrieval, update endpoints, and user statistics. |
| **Module 4** | Posts Creation, Feeds & Media Backend | `routes/posts.js`, `routes/upload.js` supporting CRUD, global & following feeds, and file uploads. |
| **Module 5** | Comments & Discussions Backend | `routes/comments.js` with comment creation, hierarchical deletion, and counter aggregation. |
| **Module 6** | Like & Follow Ecosystem Backend | `routes/likes.js`, `routes/follows.js` with atomic toggle operations and follower lists. |
| **Module 7** | Search, Discovery & Suggestions Backend | `routes/search.js` supporting unified queries, suggestions, and trending hashtag calculation. |
| **Module 8** | Responsive UI & Modern Design System | `index.html`, `style.css` with CSS custom properties, dark/light themes, and modal templates. |
| **Module 9** | Frontend State, Auth & Routing Engine | `state.js`, `api.js`, `router.js` with centralized store, JWT headers, and hash-based SPA routing. |
| **Module 10** | Interactive Feed & Post Composer UI | `composer.js`, `feed.js` featuring media previews, live char count, like pulses, and share links. |
| **Module 11** | Comments & Profile Management UI | `comments.js`, `profile.js` with comment accordions, profile tabs, and follow state toggles. |
| **Module 12** | Seed Data & Automated E2E Verification | `seed.js`, `test-e2e.js` with comprehensive test suite (21 passing integration tests). |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or newer recommended, verified on v24)
- **npm**

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Demo Data
To populate realistic users, posts, comments, likes, and follows:
```bash
npm run seed
```

### 4. Start the Application
```bash
npm start
```
The server will start at:
👉 **`http://localhost:3000`**

Open `http://localhost:3000` in your web browser.

---

## 👥 Demo User Credentials

The database comes pre-seeded with 4 active demo accounts (all with password `password123`):

| Username | Name | Role |
|---|---|---|
| **`alex`** | Alex Rivera | Full-stack Software Engineer |
| **`sarah_c`** | Sarah Chen | Lead Product Designer |
| **`marcus_v`** | Marcus Vance | Cloud Architect |
| **`elena_r`** | Elena Rostova | AI Researcher & Digital Artist |

> 💡 **Tip**: In the sign-in modal, click the **"⚡ Demo Login (Alex Rivera)"** button for instant one-click login!

---

## 🧪 Running Automated Tests

Run the full end-to-end integration test suite:
```bash
npm test
```
All 21 test assertions across authentication, CRUD, likes, comments, follows, feeds, and search will execute and report status.

---

## 📂 Project Directory Structure

```text
social media/
├── public/
│   ├── css/
│   │   └── style.css            # Responsive modern dark/light CSS
│   ├── js/
│   │   ├── components/
│   │   │   ├── comments.js      # Comment thread component
│   │   │   ├── composer.js      # Post creation component
│   │   │   ├── feed.js          # Feed & post cards component
│   │   │   └── profile.js       # User profile & tabs component
│   │   ├── api.js               # REST API fetch client
│   │   ├── app.js               # Main app controller & modal manager
│   │   ├── router.js            # Hash SPA router
│   │   └── state.js             # Central state & toast system
│   ├── uploads/                 # Uploaded media storage
│   └── index.html               # Main single-page application entry
├── src/
│   ├── db/
│   │   ├── database.js          # SQLite connection & schema creation
│   │   └── social_media.db      # SQLite database file
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middlewares
│   └── routes/
│       ├── auth.js              # Register, login, me endpoints
│       ├── comments.js          # Comments endpoints
│       ├── follows.js           # Follow/unfollow & follower lists
│       ├── likes.js             # Like/unlike endpoints
│       ├── posts.js             # Posts CRUD & feed endpoints
│       ├── search.js            # Search, suggestions, trending endpoints
│       └── upload.js            # Multer image upload endpoint
├── package.json                 # Project scripts & dependencies
├── README.md                    # Project documentation
├── seed.js                      # Database seeder script
├── server.js                    # Express application entry point
└── test-e2e.js                  # Automated integration test runner
```
