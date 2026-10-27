// Pulse Feed & Post Component
const FeedComponent = {
  async render() {
    const mount = document.getElementById('view-mount-point');
    if (!mount) return;

    // Set skeleton loader
    mount.innerHTML = `
      <div class="posts-stream" id="posts-stream">
        <div class="skeleton-post"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-line" style="width:30%"></div><div class="skeleton-line"></div><div class="skeleton-line" style="width:70%"></div></div></div>
        <div class="skeleton-post"><div class="skeleton-avatar"></div><div class="skeleton-content"><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line"></div></div></div>
      </div>
    `;

    try {
      const feedType = state.activeFeed;
      const data = await api.posts.getFeed(feedType);

      const stream = document.getElementById('posts-stream');
      stream.innerHTML = '';

      if (!data.posts || data.posts.length === 0) {
        stream.innerHTML = `
          <div class="empty-state">
            <i data-lucide="message-square" class="empty-state-icon"></i>
            <h3>No posts yet</h3>
            <p>${feedType === 'following' ? 'Follow other creators to see their updates here!' : 'Be the first one to share a post!'}</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      data.posts.forEach(post => {
        stream.appendChild(this.createPostElement(post));
      });

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      mount.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle" class="empty-state-icon" style="color: var(--accent-danger);"></i>
          <h3>Failed to load feed</h3>
          <p>${err.message}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  async renderSinglePost(postId) {
    const mount = document.getElementById('view-mount-point');
    if (!mount) return;

    mount.innerHTML = `
      <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
        <a href="#feed" class="btn btn-outline btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="arrow-left"></i> Back to feed
        </a>
      </div>
      <div class="posts-stream" id="single-post-stream"></div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
      const data = await api.posts.getById(postId);
      const stream = document.getElementById('single-post-stream');
      const postEl = this.createPostElement(data.post, true); // true = auto-expand comments
      stream.appendChild(postEl);
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      mount.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state-icon"></i>
          <h3>Post not found</h3>
          <p>${err.message}</p>
          <a href="#feed" class="btn btn-primary" style="margin-top: 14px;">Return Home</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  createPostElement(post, expandCommentsOnInit = false) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;

    const isOwnPost = state.currentUser && state.currentUser.id === post.author_id;

    card.innerHTML = `
      <div class="post-author-avatar-col">
        <a href="#profile/${post.author_username}">
          <img src="${post.author_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author_username}`}" 
               alt="${post.author_name}" 
               class="avatar avatar-md">
        </a>
      </div>

      <div class="post-body-col">
        <div class="post-header">
          <div class="post-author-meta">
            <a href="#profile/${post.author_username}" class="post-author-name">${post.author_name}</a>
            <span class="post-author-handle">@${post.author_username}</span>
            <span class="post-dot">•</span>
            <span class="post-time">${timeAgo(post.created_at)}</span>
          </div>

          ${isOwnPost ? `
            <div class="post-actions-menu">
              <button class="icon-button post-delete-btn" title="Delete post" data-post-id="${post.id}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          ` : ''}
        </div>

        <div class="post-content">${formatPostText(post.content)}</div>

        ${post.image_url ? `
          <div class="post-media-box" data-img-url="${post.image_url}">
            <img src="${post.image_url}" alt="Post attachment" loading="lazy">
          </div>
        ` : ''}

        <div class="post-footer">
          <!-- Like Button -->
          <button class="action-btn like-btn ${post.has_liked ? 'liked' : ''}" data-post-id="${post.id}">
            <i data-lucide="heart"></i>
            <span class="like-count">${post.likes_count}</span>
          </button>

          <!-- Comment Button -->
          <button class="action-btn comment-btn" data-post-id="${post.id}">
            <i data-lucide="message-circle"></i>
            <span class="comment-count">${post.comments_count}</span>
          </button>

          <!-- Share Button -->
          <button class="action-btn share-btn" data-post-id="${post.id}" title="Copy Link">
            <i data-lucide="share-2"></i>
          </button>
        </div>

        <!-- Comments Container (Initially hidden unless expandCommentsOnInit) -->
        <div class="comments-section ${expandCommentsOnInit ? '' : 'hidden'}" id="comments-section-${post.id}">
          <div class="comment-input-row ${state.currentUser ? '' : 'hidden'}">
            <img src="${state.currentUser ? state.currentUser.avatar_url : ''}" alt="Your avatar" class="avatar avatar-xs" id="comment-avatar-${post.id}">
            <input type="text" class="comment-input" placeholder="Write a reply..." id="comment-input-${post.id}" maxlength="500">
            <button class="btn btn-primary btn-sm submit-comment-btn" data-post-id="${post.id}">Reply</button>
          </div>
          ${!state.currentUser ? `
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
              <a href="javascript:void(0)" class="guest-login-link post-tag">Sign in</a> to leave a comment.
            </p>
          ` : ''}
          <div class="comments-list" id="comments-list-${post.id}">
            <!-- Comments injected here -->
          </div>
        </div>
      </div>
    `;

    // 1. Image Click -> Lightbox
    const mediaBox = card.querySelector('.post-media-box');
    if (mediaBox) {
      mediaBox.addEventListener('click', () => {
        openLightbox(post.image_url);
      });
    }

    // 2. Like Button Click
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', async () => {
      if (!state.currentUser) {
        showAuthModal('login');
        return;
      }

      try {
        const countSpan = likeBtn.querySelector('.like-count');
        const res = await api.likes.toggle(post.id);

        if (res.liked) {
          likeBtn.classList.add('liked');
        } else {
          likeBtn.classList.remove('liked');
        }
        countSpan.textContent = res.likes_count;
        if (window.lucide) window.lucide.createIcons();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // 3. Comment Button Toggle
    const commentBtn = card.querySelector('.comment-btn');
    const commentSection = card.querySelector(`#comments-section-${post.id}`);
    commentBtn.addEventListener('click', async () => {
      const isHidden = commentSection.classList.contains('hidden');
      if (isHidden) {
        commentSection.classList.remove('hidden');
        commentBtn.classList.add('comment-active');
        await CommentsComponent.loadComments(post.id);
      } else {
        commentSection.classList.add('hidden');
        commentBtn.classList.remove('comment-active');
      }
    });

    if (expandCommentsOnInit) {
      commentBtn.classList.add('comment-active');
      CommentsComponent.loadComments(post.id);
    }

    // 4. Submit Comment
    const commentInput = card.querySelector(`#comment-input-${post.id}`);
    const submitCommentBtn = card.querySelector(`.submit-comment-btn`);
    if (submitCommentBtn && commentInput) {
      const handleCommentSubmit = async () => {
        const text = commentInput.value.trim();
        if (!text) return;
        submitCommentBtn.disabled = true;

        try {
          const res = await api.comments.create(post.id, text);
          commentInput.value = '';
          const commentsList = card.querySelector(`#comments-list-${post.id}`);
          commentsList.appendChild(CommentsComponent.createCommentElement(res.comment));

          // Update count
          card.querySelector('.comment-count').textContent = res.comments_count;
          showToast('Comment posted!', 'success');
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitCommentBtn.disabled = false;
        }
      };

      submitCommentBtn.addEventListener('click', handleCommentSubmit);
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCommentSubmit();
        }
      });
    }

    // 5. Delete Post
    const deleteBtn = card.querySelector('.post-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
          await api.posts.delete(post.id);
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          card.style.transition = 'all 0.25s ease';
          setTimeout(() => card.remove(), 250);
          showToast('Post deleted.', 'info');

          if (state.currentUser && state.currentUser.posts_count > 0) {
            state.currentUser.posts_count -= 1;
            state.setCurrentUser(state.currentUser);
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // 6. Share Button
    const shareBtn = card.querySelector('.share-btn');
    shareBtn.addEventListener('click', () => {
      const postUrl = `${window.location.origin}/#post/${post.id}`;
      navigator.clipboard.writeText(postUrl).then(() => {
        showToast('Post link copied to clipboard!', 'info');
      }).catch(() => {
        showToast(`Post URL: ${postUrl}`, 'info');
      });
    });

    // 7. Guest login link inside comments
    const guestLogin = card.querySelector('.guest-login-link');
    if (guestLogin) {
      guestLogin.addEventListener('click', () => showAuthModal('login'));
    }

    return card;
  }
};
