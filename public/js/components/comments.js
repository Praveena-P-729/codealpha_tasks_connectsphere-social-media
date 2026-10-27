// Pulse Comments Component
const CommentsComponent = {
  async loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;

    list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Loading replies...</p>';

    try {
      const data = await api.comments.getByPost(postId);
      list.innerHTML = '';

      if (!data.comments || data.comments.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No replies yet. Be the first to join the conversation!</p>';
        return;
      }

      data.comments.forEach(comment => {
        list.appendChild(this.createCommentElement(comment));
      });

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      list.innerHTML = `<p style="color: var(--accent-danger); font-size: 0.85rem;">Failed to load replies: ${err.message}</p>`;
    }
  },

  createCommentElement(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.id = `comment-${comment.id}`;

    const isOwnComment = state.currentUser && state.currentUser.id === comment.author_id;

    item.innerHTML = `
      <a href="#profile/${comment.author_username}">
        <img src="${comment.author_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.author_username}`}" 
             alt="${comment.author_name}" 
             class="avatar avatar-xs">
      </a>
      <div class="comment-bubble">
        <div class="comment-bubble-header">
          <div>
            <a href="#profile/${comment.author_username}" class="comment-author-name">${comment.author_name}</a>
            <span class="comment-date">• ${timeAgo(comment.created_at)}</span>
          </div>
          ${isOwnComment ? `
            <button class="delete-comment-btn" data-comment-id="${comment.id}" title="Delete comment">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          ` : ''}
        </div>
        <div class="comment-text">${formatPostText(comment.content)}</div>
      </div>
    `;

    const deleteBtn = item.querySelector('.delete-comment-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this reply?')) return;
        try {
          const res = await api.comments.delete(comment.id);
          item.remove();
          showToast('Reply deleted.', 'info');

          // Update comment count on post
          const postCard = document.getElementById(`post-${comment.post_id}`);
          if (postCard) {
            const countSpan = postCard.querySelector('.comment-count');
            if (countSpan && res.comments_count !== undefined) {
              countSpan.textContent = res.comments_count;
            }
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    return item;
  }
};
