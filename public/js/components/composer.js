// Pulse Post Composer Component
const ComposerComponent = {
  selectedImageUrl: '',

  init() {
    const textarea = document.getElementById('composer-text');
    const submitBtn = document.getElementById('composer-submit-btn');
    const charCounter = document.getElementById('composer-char-count');
    const fileInput = document.getElementById('composer-file-input');
    const imgUrlBtn = document.getElementById('composer-img-url-btn');
    const removeImgBtn = document.getElementById('composer-remove-img-btn');
    const emojiBtn = document.getElementById('composer-emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');

    if (!textarea) return;

    // Textarea input and char count
    textarea.addEventListener('input', () => {
      this.updateState();
    });

    // File upload
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          showToast('Uploading image...', 'info');
          const data = await api.upload(file);
          this.setImagePreview(data.url);
          showToast('Image uploaded!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          fileInput.value = '';
        }
      });
    }

    // Image URL prompt
    if (imgUrlBtn) {
      imgUrlBtn.addEventListener('click', () => {
        const url = prompt('Enter direct image URL:');
        if (url && url.trim()) {
          this.setImagePreview(url.trim());
        }
      });
    }

    // Remove preview
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => {
        this.clearImage();
      });
    }

    // Emoji toggle
    if (emojiBtn && emojiPicker) {
      emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
      });

      document.querySelectorAll('.emoji-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          textarea.value += opt.textContent;
          this.updateState();
          textarea.focus();
        });
      });

      document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
          emojiPicker.classList.add('hidden');
        }
      });
    }

    // Submit post
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        await this.submitPost();
      });
    }
  },

  updateState() {
    const textarea = document.getElementById('composer-text');
    const submitBtn = document.getElementById('composer-submit-btn');
    const charCounter = document.getElementById('composer-char-count');

    const content = textarea.value;
    const remaining = 2000 - content.length;

    charCounter.textContent = remaining;
    if (remaining < 100) {
      charCounter.className = 'char-counter danger';
    } else if (remaining < 300) {
      charCounter.className = 'char-counter warning';
    } else {
      charCounter.className = 'char-counter';
    }

    const canSubmit = (content.trim().length > 0 || this.selectedImageUrl) && remaining >= 0;
    submitBtn.disabled = !canSubmit;
  },

  setImagePreview(url) {
    this.selectedImageUrl = url;
    const container = document.getElementById('composer-image-preview-container');
    const img = document.getElementById('composer-preview-img');

    if (container && img) {
      img.src = url;
      container.classList.remove('hidden');
    }
    this.updateState();
  },

  clearImage() {
    this.selectedImageUrl = '';
    const container = document.getElementById('composer-image-preview-container');
    const img = document.getElementById('composer-preview-img');

    if (container && img) {
      img.src = '';
      container.classList.add('hidden');
    }
    this.updateState();
  },

  async submitPost() {
    const textarea = document.getElementById('composer-text');
    const submitBtn = document.getElementById('composer-submit-btn');

    if (!state.currentUser) {
      showAuthModal('login');
      return;
    }

    const content = textarea.value.trim();
    const imageUrl = this.selectedImageUrl;

    if (!content && !imageUrl) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Posting...</span>';

    try {
      const data = await api.posts.create(content, imageUrl);
      showToast('Post published successfully!', 'success');

      // Reset form
      textarea.value = '';
      this.clearImage();
      this.updateState();

      // If on feed, prepend new post
      const stream = document.getElementById('posts-stream');
      if (stream) {
        const newEl = FeedComponent.createPostElement(data.post);
        stream.prepend(newEl);
        if (window.lucide) window.lucide.createIcons();
      }

      // Increment currentUser posts count
      if (state.currentUser) {
        state.currentUser.posts_count = (state.currentUser.posts_count || 0) + 1;
        state.setCurrentUser(state.currentUser);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.innerHTML = '<i data-lucide="send"></i><span>Post</span>';
      if (window.lucide) window.lucide.createIcons();
      this.updateState();
    }
  }
};
