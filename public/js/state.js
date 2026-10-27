// Pulse State Management Store
class AppState {
  constructor() {
    this.token = localStorage.getItem('pulse_token') || null;
    this.currentUser = null;
    this.theme = localStorage.getItem('pulse_theme') || 'dark';
    this.activeFeed = 'all'; // 'all' or 'following'
    this.listeners = [];
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data) {
    this.listeners.forEach(fn => fn(event, data, this));
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('pulse_token', token);
    } else {
      localStorage.removeItem('pulse_token');
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.notify('USER_CHANGED', user);
    this.updateAuthUI();
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('pulse_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    const themeIcon = document.getElementById('theme-icon');
    const themeLabel = document.getElementById('theme-label');

    if (themeIcon && themeLabel) {
      if (theme === 'dark') {
        themeIcon.setAttribute('data-lucide', 'moon');
        themeLabel.textContent = 'Dark Mode';
      } else {
        themeIcon.setAttribute('data-lucide', 'sun');
        themeLabel.textContent = 'Light Mode';
      }
      if (window.lucide) window.lucide.createIcons();
    }
    this.notify('THEME_CHANGED', theme);
  }

  setActiveFeed(feedType) {
    this.activeFeed = feedType;
    this.notify('FEED_TAB_CHANGED', feedType);
  }

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
    showToast('You have been logged out.', 'info');
    window.location.hash = '#feed';
  }

  updateAuthUI() {
    const isLoggedIn = Boolean(this.currentUser);

    // Toggle auth-only / guest-only elements
    document.querySelectorAll('.auth-only').forEach(el => {
      el.style.display = isLoggedIn ? '' : 'none';
    });
    document.querySelectorAll('.guest-only').forEach(el => {
      el.style.display = isLoggedIn ? 'none' : '';
    });

    if (isLoggedIn && this.currentUser) {
      // Update sidebar user card
      const sidebarAvatar = document.getElementById('sidebar-user-avatar');
      const sidebarName = document.getElementById('sidebar-user-name');
      const sidebarHandle = document.getElementById('sidebar-user-handle');
      const composerAvatar = document.getElementById('composer-user-avatar');

      if (sidebarAvatar) sidebarAvatar.src = this.currentUser.avatar_url;
      if (sidebarName) sidebarName.textContent = this.currentUser.name;
      if (sidebarHandle) sidebarHandle.textContent = `@${this.currentUser.username}`;
      if (composerAvatar) composerAvatar.src = this.currentUser.avatar_url;
    }
  }
}

// Global State Instance
const state = new AppState();

// Global Toast System
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Utility: format relative time
function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Utility: format content with hashtags & mentions
function formatPostText(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/#(\w+)/g, '<a href="#explore?q=%23$1" class="post-tag">#$1</a>')
    .replace(/@(\w+)/g, '<a href="#profile/$1" class="post-tag">@$1</a>');
}
