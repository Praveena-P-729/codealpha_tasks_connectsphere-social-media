// Pulse API Client
const API_BASE = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  }

  // Auth Endpoints
  auth = {
    login: (login, password) => {
      return this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password })
      });
    },
    register: (userData) => {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    me: () => {
      return this.request('/auth/me');
    }
  };

  // Posts Endpoints
  posts = {
    getFeed: (filter = 'all', limit = 50, offset = 0) => {
      return this.request(`/posts?filter=${filter}&limit=${limit}&offset=${offset}`);
    },
    getById: (id) => {
      return this.request(`/posts/${id}`);
    },
    create: (content, imageUrl = '') => {
      return this.request('/posts', {
        method: 'POST',
        body: JSON.stringify({ content, image_url: imageUrl })
      });
    },
    delete: (id) => {
      return this.request(`/posts/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // Comments Endpoints
  comments = {
    getByPost: (postId) => {
      return this.request(`/posts/${postId}/comments`);
    },
    create: (postId, content) => {
      return this.request(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },
    delete: (commentId) => {
      return this.request(`/comments/${commentId}`, {
        method: 'DELETE'
      });
    }
  };

  // Likes Endpoints
  likes = {
    toggle: (postId) => {
      return this.request(`/posts/${postId}/like`, {
        method: 'POST'
      });
    },
    getByUser: (username) => {
      return this.request(`/users/${username}/likes`);
    }
  };

  // Follows Endpoints
  follows = {
    toggle: (userId) => {
      return this.request(`/users/${userId}/follow`, {
        method: 'POST'
      });
    },
    getFollowers: (username) => {
      return this.request(`/users/${username}/followers`);
    },
    getFollowing: (username) => {
      return this.request(`/users/${username}/following`);
    }
  };

  // User Endpoints
  users = {
    getProfile: (username) => {
      return this.request(`/users/${encodeURIComponent(username)}`);
    },
    updateProfile: (profileData) => {
      return this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    },
    getUserPosts: (username) => {
      return this.request(`/users/${encodeURIComponent(username)}/posts`);
    }
  };

  // Search & Discovery Endpoints
  search = {
    query: (q) => {
      return this.request(`/search?q=${encodeURIComponent(q)}`);
    },
    getSuggested: () => {
      return this.request('/search/suggested');
    },
    getTrending: () => {
      return this.request('/search/trending');
    }
  };

  // Media Upload Endpoint
  upload = async (file) => {
    const formData = new FormData();
    formData.append('media', file);

    const headers = {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload image.');
    }
    return data;
  };
}

// Global API instance
const api = new ApiClient();
