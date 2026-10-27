// Pulse Client-Side Router
class AppRouter {
  constructor() {
    this.currentRoute = '';
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init() {
    if (!window.location.hash) {
      window.location.hash = '#feed';
    } else {
      this.handleRoute();
    }
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  handleRoute() {
    const rawHash = window.location.hash.slice(1) || 'feed';
    const [pathPart, queryPart] = rawHash.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    const root = segments[0] || 'feed';

    const params = new URLSearchParams(queryPart || '');

    this.currentRoute = root;
    this.updateActiveNav(root);

    const pageTitle = document.getElementById('page-title');
    const composerSection = document.getElementById('composer-section');
    const feedTabs = document.getElementById('feed-tabs');

    switch (root) {
      case 'feed':
        if (pageTitle) pageTitle.textContent = 'Home';
        if (composerSection && state.currentUser) composerSection.style.display = 'flex';
        if (feedTabs) feedTabs.style.display = 'flex';
        FeedComponent.render();
        break;

      case 'explore':
        if (pageTitle) pageTitle.textContent = 'Explore & Search';
        if (composerSection) composerSection.style.display = 'none';
        if (feedTabs) feedTabs.style.display = 'none';
        const initialQuery = params.get('q') || '';
        this.renderExploreView(initialQuery);
        break;

      case 'profile':
        if (composerSection) composerSection.style.display = 'none';
        if (feedTabs) feedTabs.style.display = 'none';

        const username = segments[1] || (state.currentUser ? state.currentUser.username : null);
        if (!username) {
          showAuthModal('login');
          window.location.hash = '#feed';
          return;
        }

        if (pageTitle) pageTitle.textContent = `@${username}`;
        ProfileComponent.render(username);
        break;

      case 'post':
        if (composerSection) composerSection.style.display = 'none';
        if (feedTabs) feedTabs.style.display = 'none';

        const postId = segments[1];
        if (postId) {
          if (pageTitle) pageTitle.textContent = 'Post';
          FeedComponent.renderSinglePost(postId);
        } else {
          window.location.hash = '#feed';
        }
        break;

      default:
        window.location.hash = '#feed';
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  updateActiveNav(route) {
    document.querySelectorAll('[data-nav]').forEach(el => {
      if (el.getAttribute('data-nav') === route) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  async renderExploreView(initialQuery = '') {
    const mount = document.getElementById('view-mount-point');
    if (!mount) return;

    mount.innerHTML = `
      <div class="explore-container" style="padding: 20px;">
        <div class="search-hero" style="margin-bottom: 24px;">
          <div class="search-widget" style="width: 100%;">
            <i data-lucide="search" class="search-icon"></i>
            <input 
              type="search" 
              id="explore-search-input" 
              class="search-input" 
              value="${initialQuery}" 
              placeholder="Search people, tags, or topics..." 
              style="padding: 12px 18px 12px 44px; font-size: 1rem;">
          </div>
        </div>

        <div id="explore-results-users" class="explore-section" style="margin-bottom: 28px;">
          <h3 class="widget-title" style="font-size: 1.15rem; margin-bottom: 12px;">People</h3>
          <div id="explore-users-list" class="widget-list"></div>
        </div>

        <div id="explore-results-posts" class="explore-section">
          <h3 class="widget-title" style="font-size: 1.15rem; margin-bottom: 12px;">Posts</h3>
          <div id="explore-posts-list" class="posts-stream"></div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const input = document.getElementById('explore-search-input');
    const performSearch = async (q) => {
      const usersList = document.getElementById('explore-users-list');
      const postsList = document.getElementById('explore-posts-list');

      if (!q.trim()) {
        // Show suggestions & trending if empty
        const suggested = await api.search.getSuggested();
        usersList.innerHTML = suggested.users.length ? '' : '<p style="color: var(--text-muted); font-size: 0.9rem;">No suggestions.</p>';
        suggested.users.forEach(u => {
          usersList.appendChild(renderUserWidgetRow(u));
        });

        // Load trending posts
        const feedData = await api.posts.getFeed('all', 10);
        postsList.innerHTML = '';
        feedData.posts.forEach(p => {
          postsList.appendChild(FeedComponent.createPostElement(p));
        });
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      usersList.innerHTML = '<div class="skeleton-widget-item"></div>';
      postsList.innerHTML = '<div class="skeleton-post"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line"></div></div></div>';

      try {
        const data = await api.search.query(q);
        usersList.innerHTML = '';
        postsList.innerHTML = '';

        if (data.users.length === 0) {
          usersList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No people found matching your search.</p>';
        } else {
          data.users.forEach(u => usersList.appendChild(renderUserWidgetRow(u)));
        }

        if (data.posts.length === 0) {
          postsList.innerHTML = '<div class="empty-state"><p style="color: var(--text-muted);">No posts found matching your search.</p></div>';
        } else {
          data.posts.forEach(p => postsList.appendChild(FeedComponent.createPostElement(p)));
        }

        if (window.lucide) window.lucide.createIcons();
      } catch (err) {
        showToast('Search failed: ' + err.message, 'error');
      }
    };

    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(e.target.value), 350);
    });

    performSearch(initialQuery);
  }
}

const router = new AppRouter();
