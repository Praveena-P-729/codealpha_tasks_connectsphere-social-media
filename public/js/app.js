// Pulse Main Application Controller

document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

async function initApp() {
  // 1. Initialize Theme
  state.setTheme(state.theme);

  // 2. Theme Toggle Listener
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.setTheme(nextTheme);
    });
  }

  // 3. Verify Existing Auth Session
  if (state.token) {
    try {
      const meData = await api.auth.me();
      state.setCurrentUser(meData.user);
    } catch (err) {
      console.warn('Session expired or invalid, logging out.');
      state.setToken(null);
      state.setCurrentUser(null);
    }
  } else {
    state.updateAuthUI();
  }

  // 4. Initialize Composer Component
  ComposerComponent.init();

  // 5. Setup Feed Tab Switching
  setupFeedTabs();

  // 6. Setup Global Modals
  setupAuthModal();
  setupEditProfileModal();
  setupUserListModal();
  setupLightboxModal();

  // 7. Setup Sidebar & Mobile Nav Buttons
  setupGlobalActions();

  // 8. Load Sidebar Widgets (Who to follow & Trending)
  loadSidebarWidgets();

  // 9. Setup Global Search Input
  setupSearchInput();

  // 10. Start Router
  router.init();

  // Refresh lucide icons
  if (window.lucide) window.lucide.createIcons();
}

// Feed Tabs Controller
function setupFeedTabs() {
  document.querySelectorAll('.feed-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const feedType = tab.getAttribute('data-feed');
      if (feedType === 'following' && !state.currentUser) {
        showAuthModal('login');
        return;
      }

      document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.setActiveFeed(feedType);
      FeedComponent.render();
    });
  });
}

// Global UI Actions
function setupGlobalActions() {
  // Sidebar login button
  const sidebarLoginBtn = document.getElementById('sidebar-login-btn');
  if (sidebarLoginBtn) {
    sidebarLoginBtn.addEventListener('click', () => showAuthModal('login'));
  }

  // Mobile login button
  const mobileLoginBtn = document.getElementById('mobile-login-btn');
  if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener('click', () => showAuthModal('login'));
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) {
        state.logout();
      }
    });
  }

  // Profile click in sidebar
  const miniProfileTrigger = document.getElementById('user-mini-profile-trigger');
  if (miniProfileTrigger) {
    miniProfileTrigger.addEventListener('click', () => {
      if (state.currentUser) {
        window.location.hash = `#profile/${state.currentUser.username}`;
      }
    });
  }

  // New post buttons
  const newPostAction = () => {
    if (!state.currentUser) {
      showAuthModal('login');
      return;
    }
    window.location.hash = '#feed';
    const textarea = document.getElementById('composer-text');
    if (textarea) {
      textarea.scrollIntoView({ behavior: 'smooth' });
      textarea.focus();
    }
  };

  const sidebarNewPostBtn = document.getElementById('sidebar-new-post-btn');
  if (sidebarNewPostBtn) sidebarNewPostBtn.addEventListener('click', newPostAction);

  const mobileCreateBtn = document.getElementById('mobile-create-post-btn');
  if (mobileCreateBtn) mobileCreateBtn.addEventListener('click', newPostAction);
}

// Sidebar Widgets (Suggested Users & Trending)
async function loadSidebarWidgets() {
  await Promise.all([
    loadSuggestedUsers(),
    loadTrendingTopics()
  ]);
}

async function loadSuggestedUsers() {
  const container = document.getElementById('suggested-users-list');
  if (!container) return;

  try {
    const data = await api.search.getSuggested();
    container.innerHTML = '';

    if (!data.users || data.users.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No new suggestions right now.</p>';
      return;
    }

    data.users.forEach(u => {
      container.appendChild(renderUserWidgetRow(u));
    });

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Failed to load suggestions.</p>`;
  }
}

function renderUserWidgetRow(user) {
  const row = document.createElement('div');
  row.className = 'widget-user-item';

  row.innerHTML = `
    <div class="widget-user-meta" onclick="window.location.hash='#profile/${user.username}'">
      <img src="${user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}" 
           alt="${user.name}" 
           class="avatar avatar-sm">
      <div class="widget-user-names">
        <div class="name">${user.name}</div>
        <div class="handle">@${user.username}</div>
      </div>
    </div>
    ${user.is_self ? '' : `
      <button class="btn ${user.is_following ? 'btn-outline' : 'btn-primary'} btn-sm widget-follow-btn" data-user-id="${user.id}">
        <span>${user.is_following ? 'Following' : 'Follow'}</span>
      </button>
    `}
  `;

  const followBtn = row.querySelector('.widget-follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!state.currentUser) {
        showAuthModal('login');
        return;
      }

      followBtn.disabled = true;
      try {
        const res = await api.follows.toggle(user.id);
        user.is_following = res.is_following;
        followBtn.className = `btn ${res.is_following ? 'btn-outline' : 'btn-primary'} btn-sm widget-follow-btn`;
        followBtn.querySelector('span').textContent = res.is_following ? 'Following' : 'Follow';
        showToast(res.message, 'info');

        // If on user profile or feed, notify
        state.notify('FOLLOW_STATUS_CHANGED', { userId: user.id, isFollowing: res.is_following });
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        followBtn.disabled = false;
      }
    });
  }

  return row;
}

async function loadTrendingTopics() {
  const container = document.getElementById('trending-list');
  if (!container) return;

  try {
    const data = await api.search.getTrending();
    container.innerHTML = '';

    if (!data.trending || data.trending.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No trending topics yet.</p>';
      return;
    }

    data.trending.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'trending-item';
      itemEl.innerHTML = `
        <span class="trending-tag">${item.tag}</span>
        <span class="trending-count">${item.count} ${item.count === 1 ? 'post' : 'posts'}</span>
      `;
      itemEl.addEventListener('click', () => {
        window.location.hash = `#explore?q=${encodeURIComponent(item.tag)}`;
      });
      container.appendChild(itemEl);
    });
  } catch (err) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Failed to load trending topics.</p>`;
  }
}

// Global Search Bar in right sidebar
function setupSearchInput() {
  const input = document.getElementById('global-search-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      if (val) {
        window.location.hash = `#explore?q=${encodeURIComponent(val)}`;
        input.value = '';
      }
    }
  });
}

// ----------------- MODALS ----------------- //

// 1. Auth Modal
function showAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  const errorBanner = document.getElementById('auth-error-banner');
  if (errorBanner) errorBanner.classList.add('hidden');

  switchAuthTab(tab);
  modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('hidden');
}

function switchAuthTab(tab) {
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const errorBanner = document.getElementById('auth-error-banner');

  if (errorBanner) errorBanner.classList.add('hidden');

  if (tab === 'login') {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
  } else {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');
  const errorBanner = document.getElementById('auth-error-banner');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const demoFillBtn = document.getElementById('demo-user-fill-btn');

  closeBtn.addEventListener('click', closeAuthModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAuthModal();
  });

  loginBtn.addEventListener('click', () => switchAuthTab('login'));
  regBtn.addEventListener('click', () => switchAuthTab('register'));

  // Quick Demo fill
  if (demoFillBtn) {
    demoFillBtn.addEventListener('click', () => {
      document.getElementById('login-identifier').value = 'alex';
      document.getElementById('login-password').value = 'password123';
      loginForm.dispatchEvent(new Event('submit'));
    });
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing in...</span>';
    errorBanner.classList.add('hidden');

    try {
      const data = await api.auth.login(login, password);
      state.setToken(data.token);
      state.setCurrentUser(data.user);
      closeAuthModal();
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      loadSidebarWidgets();
      router.handleRoute();
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In</span>';
    }
  });

  // Handle Register
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const submitBtn = document.getElementById('register-submit-btn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating account...</span>';
    errorBanner.classList.add('hidden');

    try {
      const data = await api.auth.register({ name, username, email, password });
      state.setToken(data.token);
      state.setCurrentUser(data.user);
      closeAuthModal();
      showToast(`Welcome to Pulse, ${data.user.name}!`, 'success');
      loadSidebarWidgets();
      router.handleRoute();
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account</span>';
    }
  });
}

// 2. Edit Profile Modal
function openEditProfileModal(user) {
  const modal = document.getElementById('edit-profile-modal');
  document.getElementById('edit-profile-name').value = user.name || '';
  document.getElementById('edit-profile-bio').value = user.bio || '';
  document.getElementById('edit-profile-location').value = user.location || '';
  document.getElementById('edit-profile-website').value = user.website || '';
  document.getElementById('edit-profile-avatar-url').value = user.avatar_url || '';

  const avatarPreview = document.getElementById('edit-avatar-preview');
  if (avatarPreview) avatarPreview.src = user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;

  const coverPreview = document.getElementById('edit-cover-preview');
  if (coverPreview) coverPreview.src = user.cover_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';

  modal.classList.remove('hidden');
}

function closeEditProfileModal() {
  document.getElementById('edit-profile-modal').classList.add('hidden');
}

function setupEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  const closeBtn = document.getElementById('close-edit-profile-modal');
  const cancelBtn = document.getElementById('cancel-edit-profile-btn');
  const form = document.getElementById('edit-profile-form');
  const fileInput = document.getElementById('edit-avatar-file-input');
  const avatarUrlInput = document.getElementById('edit-profile-avatar-url');
  const avatarPreview = document.getElementById('edit-avatar-preview');
  const coverPromptBtn = document.getElementById('edit-cover-prompt-btn');

  closeBtn.addEventListener('click', closeEditProfileModal);
  cancelBtn.addEventListener('click', closeEditProfileModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEditProfileModal();
  });

  // Avatar file upload
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showToast('Uploading avatar...', 'info');
        const data = await api.upload(file);
        avatarUrlInput.value = data.url;
        avatarPreview.src = data.url;
        showToast('Avatar uploaded!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Cover image prompt
  if (coverPromptBtn) {
    coverPromptBtn.addEventListener('click', () => {
      const url = prompt('Enter image URL for profile cover banner:');
      if (url && url.trim()) {
        document.getElementById('edit-cover-preview').src = url.trim();
        document.getElementById('edit-cover-preview').dataset.newCover = url.trim();
      }
    });
  }

  // Submit profile edit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const newCover = document.getElementById('edit-cover-preview').dataset.newCover;

    const payload = {
      name: document.getElementById('edit-profile-name').value.trim(),
      bio: document.getElementById('edit-profile-bio').value.trim(),
      location: document.getElementById('edit-profile-location').value.trim(),
      website: document.getElementById('edit-profile-website').value.trim(),
      avatar_url: avatarUrlInput.value.trim()
    };

    if (newCover) {
      payload.cover_url = newCover;
    }

    try {
      const data = await api.users.updateProfile(payload);
      state.setCurrentUser(data.user);
      closeEditProfileModal();
      showToast('Profile updated successfully!', 'success');
      ProfileComponent.render(data.user.username);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });
}

// 3. User List Modal (Followers / Following)
async function openUserListModal(title, fetcher) {
  const modal = document.getElementById('user-list-modal');
  const titleEl = document.getElementById('user-list-modal-title');
  const bodyEl = document.getElementById('user-list-modal-body');

  titleEl.textContent = title;
  bodyEl.innerHTML = '<div class="skeleton-widget-item"></div><div class="skeleton-widget-item"></div>';
  modal.classList.remove('hidden');

  try {
    const data = await fetcher();
    const list = data.followers || data.following || [];
    bodyEl.innerHTML = '';

    if (list.length === 0) {
      bodyEl.innerHTML = `<p style="color: var(--text-muted); padding: 16px; text-align: center;">No ${title.toLowerCase()} yet.</p>`;
      return;
    }

    list.forEach(u => {
      const row = renderUserWidgetRow(u);
      bodyEl.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    bodyEl.innerHTML = `<p style="color: var(--accent-danger); padding: 16px;">Failed to load: ${err.message}</p>`;
  }
}

function setupUserListModal() {
  const modal = document.getElementById('user-list-modal');
  const closeBtn = document.getElementById('close-user-list-modal');

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}

// 4. Lightbox Modal
function openLightbox(imgUrl) {
  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-img');
  img.src = imgUrl;
  modal.classList.remove('hidden');
}

function setupLightboxModal() {
  const modal = document.getElementById('image-lightbox-modal');
  const closeBtn = document.getElementById('close-lightbox-btn');

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}
