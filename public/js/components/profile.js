// Pulse User Profile Component
const ProfileComponent = {
  currentProfileUser: null,
  activeProfileTab: 'posts',

  async render(username) {
    const mount = document.getElementById('view-mount-point');
    if (!mount) return;

    mount.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--text-muted);">Loading profile @${username}...</p>
      </div>
    `;

    try {
      const data = await api.users.getProfile(username);
      this.currentProfileUser = data.user;
      this.renderProfileView(data.user);
    } catch (err) {
      mount.innerHTML = `
        <div class="empty-state">
          <i data-lucide="user-x" class="empty-state-icon"></i>
          <h3>User Not Found</h3>
          <p>${err.message}</p>
          <a href="#feed" class="btn btn-primary" style="margin-top: 14px;">Back to Feed</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  renderProfileView(user) {
    const mount = document.getElementById('view-mount-point');
    if (!mount) return;

    const isSelf = state.currentUser && state.currentUser.id === user.id;
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
    const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

    const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    mount.innerHTML = `
      <div class="profile-view">
        <!-- Cover Banner -->
        <div class="profile-cover-banner">
          <img src="${user.cover_url || defaultCover}" alt="Profile banner" id="profile-banner-img">
        </div>

        <!-- Profile Details Strip -->
        <div class="profile-header-details">
          <div class="profile-avatar-row">
            <img src="${user.avatar_url || defaultAvatar}" 
                 alt="${user.name}" 
                 class="avatar avatar-xl profile-main-avatar">
            
            <div class="profile-action-btns">
              ${isSelf ? `
                <button class="btn btn-outline" id="edit-profile-btn">
                  <i data-lucide="edit-3"></i> Edit Profile
                </button>
              ` : `
                <button class="btn ${user.is_following ? 'btn-outline' : 'btn-primary'}" id="profile-follow-btn" data-user-id="${user.id}">
                  <i data-lucide="${user.is_following ? 'user-check' : 'user-plus'}"></i>
                  <span>${user.is_following ? 'Following' : 'Follow'}</span>
                </button>
              `}
            </div>
          </div>

          <div class="profile-names-block">
            <h2 class="profile-display-name">${user.name}</h2>
            <span class="profile-handle">@${user.username}</span>
          </div>

          ${user.bio ? `<p class="profile-bio">${formatPostText(user.bio)}</p>` : ''}

          <div class="profile-meta-info">
            ${user.location ? `
              <div class="profile-meta-item">
                <i data-lucide="map-pin"></i>
                <span>${user.location}</span>
              </div>
            ` : ''}
            ${user.website ? `
              <div class="profile-meta-item">
                <i data-lucide="globe"></i>
                <a href="${user.website}" target="_blank" rel="noopener noreferrer" class="post-tag">${user.website.replace(/^https?:\/\//, '')}</a>
              </div>
            ` : ''}
            <div class="profile-meta-item">
              <i data-lucide="calendar"></i>
              <span>Joined ${joinedDate}</span>
            </div>
          </div>

          <!-- Stats Counters -->
          <div class="profile-stats-row">
            <div class="stat-item">
              <strong id="profile-stat-posts">${user.posts_count}</strong> Posts
            </div>
            <div class="stat-item" id="profile-stat-followers-btn">
              <strong id="profile-stat-followers">${user.followers_count}</strong> Followers
            </div>
            <div class="stat-item" id="profile-stat-following-btn">
              <strong id="profile-stat-following">${user.following_count}</strong> Following
            </div>
          </div>
        </div>

        <!-- Profile Tabs -->
        <div class="profile-tabs">
          <button class="profile-tab active" data-tab="posts">Posts</button>
          <button class="profile-tab" data-tab="likes">Liked Posts</button>
        </div>

        <!-- Tab Content Stream -->
        <div class="posts-stream" id="profile-posts-stream">
          <div class="skeleton-post"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-line"></div></div></div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Attach Event Listeners
    this.attachProfileEvents(user);
    this.loadTabContent('posts');
  },

  attachProfileEvents(user) {
    // 1. Follow / Unfollow button
    const followBtn = document.getElementById('profile-follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        if (!state.currentUser) {
          showAuthModal('login');
          return;
        }

        followBtn.disabled = true;
        try {
          const res = await api.follows.toggle(user.id);
          user.is_following = res.is_following;
          user.followers_count = res.followers_count;

          const span = followBtn.querySelector('span');
          if (res.is_following) {
            followBtn.className = 'btn btn-outline';
            followBtn.innerHTML = '<i data-lucide="user-check"></i><span>Following</span>';
          } else {
            followBtn.className = 'btn btn-primary';
            followBtn.innerHTML = '<i data-lucide="user-plus"></i><span>Follow</span>';
          }

          document.getElementById('profile-stat-followers').textContent = res.followers_count;
          showToast(res.message, 'info');
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          followBtn.disabled = false;
        }
      });
    }

    // 2. Edit Profile button
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openEditProfileModal(user);
      });
    }

    // 3. Followers / Following Clickable Modals
    const followersBtn = document.getElementById('profile-stat-followers-btn');
    if (followersBtn) {
      followersBtn.addEventListener('click', async () => {
        await openUserListModal('Followers', () => api.follows.getFollowers(user.username));
      });
    }

    const followingBtn = document.getElementById('profile-stat-following-btn');
    if (followingBtn) {
      followingBtn.addEventListener('click', async () => {
        await openUserListModal('Following', () => api.follows.getFollowing(user.username));
      });
    }

    // 4. Tab switching
    document.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabType = tab.getAttribute('data-tab');
        this.activeProfileTab = tabType;
        this.loadTabContent(tabType);
      });
    });
  },

  async loadTabContent(tabType) {
    const stream = document.getElementById('profile-posts-stream');
    if (!stream || !this.currentProfileUser) return;

    stream.innerHTML = `
      <div class="skeleton-post"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line"></div></div></div>
    `;

    try {
      let data;
      if (tabType === 'posts') {
        data = await api.users.getUserPosts(this.currentProfileUser.username);
      } else {
        data = await api.likes.getByUser(this.currentProfileUser.username);
      }

      stream.innerHTML = '';
      if (!data.posts || data.posts.length === 0) {
        stream.innerHTML = `
          <div class="empty-state">
            <i data-lucide="folder" class="empty-state-icon"></i>
            <h3>No ${tabType === 'posts' ? 'posts' : 'liked posts'} yet</h3>
            <p>${this.currentProfileUser.name} has not ${tabType === 'posts' ? 'posted' : 'liked'} anything yet.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      data.posts.forEach(post => {
        stream.appendChild(FeedComponent.createPostElement(post));
      });

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      stream.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle" class="empty-state-icon" style="color: var(--accent-danger);"></i>
          <h3>Failed to load</h3>
          <p>${err.message}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }
};
