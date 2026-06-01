/**
 * Supabase Authentication + Bookmarks + History
 */

const SUPABASE_URL = 'https://ulluacifirzywhmzkvkr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C';

class SageAuth {
  constructor() {
    this.user = null;
    this.session = null;
  }

  /**
   * Initialize auth and check if user is logged in
   */
  async init() {
    try {
      // Check localStorage for session token
      const token = localStorage.getItem('supabase.auth.token');
      if (token) {
        this.session = JSON.parse(token);
        this.user = this.session.user;
        console.log('✓ Restored session for:', this.user.email);
        this.updateUIForLoggedIn();
      }
    } catch (e) {
      console.log('No existing session');
    }
  }

  /**
   * Sign up new user
   */
  async signup(email, password) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/signup`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json();
      if (data.user) {
        this.user = data.user;
        this.session = data.session;
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        console.log('✓ Signed up:', email);
        this.updateUIForLoggedIn();
        return true;
      } else {
        console.error('Signup error:', data.error_description);
        return false;
      }
    } catch (e) {
      console.error('Signup failed:', e);
      return false;
    }
  }

  /**
   * Login existing user
   */
  async login(email, password) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json();
      if (data.user) {
        this.user = data.user;
        this.session = data.session;
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        console.log('✓ Logged in:', email);
        this.updateUIForLoggedIn();
        return true;
      } else {
        console.error('Login error:', data.error_description);
        return false;
      }
    } catch (e) {
      console.error('Login failed:', e);
      return false;
    }
  }

  /**
   * Logout
   */
  logout() {
    this.user = null;
    this.session = null;
    localStorage.removeItem('supabase.auth.token');
    console.log('✓ Logged out');
    this.updateUIForLoggedOut();
  }

  /**
   * Get Authorization header
   */
  getAuthHeader() {
    if (!this.session) return {};
    return {
      'Authorization': `Bearer ${this.session.access_token}`
    };
  }

  /**
   * Add bookmark
   */
  async addBookmark(sageId) {
    if (!this.user) {
      alert('צריך להיות מחובר כדי לשמור');
      return false;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bookmarks`,
        {
          method: 'POST',
          headers: {
            ...this.getAuthHeader(),
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: this.user.id,
            sage_id: sageId
          })
        }
      );

      if (response.ok) {
        console.log('✓ Bookmarked:', sageId);
        return true;
      } else {
        console.error('Bookmark error:', response.status);
        return false;
      }
    } catch (e) {
      console.error('Bookmark failed:', e);
      return false;
    }
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(sageId) {
    if (!this.user) return false;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bookmarks?user_id=eq.${this.user.id}&sage_id=eq.${sageId}`,
        {
          method: 'DELETE',
          headers: {
            ...this.getAuthHeader(),
            'apikey': SUPABASE_KEY
          }
        }
      );

      if (response.ok) {
        console.log('✓ Removed bookmark:', sageId);
        return true;
      }
    } catch (e) {
      console.error('Remove bookmark failed:', e);
    }
    return false;
  }

  /**
   * Get user bookmarks
   */
  async getBookmarks() {
    if (!this.user) return [];

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/bookmarks?user_id=eq.${this.user.id}&select=sage_id`,
        {
          headers: {
            ...this.getAuthHeader(),
            'apikey': SUPABASE_KEY
          }
        }
      );

      if (response.ok) {
        const bookmarks = await response.json();
        return bookmarks.map(b => b.sage_id);
      }
    } catch (e) {
      console.error('Get bookmarks failed:', e);
    }
    return [];
  }

  /**
   * Log view history
   */
  async logHistory(sageId, note = '') {
    if (!this.user) return false;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_history`,
        {
          method: 'POST',
          headers: {
            ...this.getAuthHeader(),
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: this.user.id,
            sage_id: sageId,
            note: note
          })
        }
      );

      if (response.ok) {
        console.log('✓ Logged view:', sageId);
        return true;
      }
    } catch (e) {
      console.error('Log history failed:', e);
    }
    return false;
  }

  /**
   * Get user history
   */
  async getHistory() {
    if (!this.user) return [];

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_history?user_id=eq.${this.user.id}&order=viewed_at.desc`,
        {
          headers: {
            ...this.getAuthHeader(),
            'apikey': SUPABASE_KEY
          }
        }
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Get history failed:', e);
    }
    return [];
  }

  /**
   * Update UI when logged in
   */
  updateUIForLoggedIn() {
    const authBtn = document.getElementById('authButton');
    if (authBtn) {
      authBtn.innerHTML = `<i class="fas fa-user"></i> ${this.user.email.split('@')[0]}`;
      authBtn.onclick = () => this.logout();
    }

    const bookmarkBtn = document.getElementById('bookmarkButton');
    if (bookmarkBtn) {
      bookmarkBtn.style.display = 'block';
    }

    const historyBtn = document.getElementById('historyButton');
    if (historyBtn) {
      historyBtn.style.display = 'block';
    }

    document.getElementById('authModal').style.display = 'none';
  }

  /**
   * Update UI when logged out
   */
  updateUIForLoggedOut() {
    const authBtn = document.getElementById('authButton');
    if (authBtn) {
      authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> התחברות';
      authBtn.onclick = () => this.showAuthModal();
    }

    const bookmarkBtn = document.getElementById('bookmarkButton');
    if (bookmarkBtn) {
      bookmarkBtn.style.display = 'none';
    }

    const historyBtn = document.getElementById('historyButton');
    if (historyBtn) {
      historyBtn.style.display = 'none';
    }
  }

  /**
   * Show authentication modal
   */
  showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
  }

  /**
   * Hide authentication modal
   */
  hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
  }
}

// Initialize auth globally
window.sageAuth = new SageAuth();
document.addEventListener('DOMContentLoaded', () => {
  window.sageAuth.init();
});
