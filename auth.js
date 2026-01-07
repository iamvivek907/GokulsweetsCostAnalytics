// Authentication Module for Gokul Sweets Cost Analytics
// Handles user authentication, session management, and UI

(function() {
  'use strict';

  // Global namespace for authentication
  window.Auth = {
    currentUser: null,
    supabaseClient: null,
    initialized: false,

    // Initialize authentication system
    async init(supabaseUrl, supabaseKey) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and key are required');
      }

      // Load Supabase library if not already loaded
      if (!window.supabase) {
        await this._loadSupabaseLibrary();
      }

      try {
        this.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        this.initialized = true;
        console.log('Auth system initialized');

        // Check for existing session
        const { data: { session } } = await this.supabaseClient.auth.getSession();
        if (session) {
          this.currentUser = session.user;
          console.log('Existing session found:', this.currentUser.email);
          return { user: this.currentUser, session };
        }

        return { user: null, session: null };
      } catch (error) {
        console.error('Failed to initialize auth system:', error);
        throw error;
      }
    },

    // Load Supabase library from CDN
    async _loadSupabaseLibrary() {
      return new Promise((resolve, reject) => {
        if (window.supabase) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
          console.log('Supabase library loaded');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Supabase library'));
        };
        document.head.appendChild(script);
      });
    },

    // Sign up new user
    async signUp(email, password) {
      if (!this.initialized) {
        throw new Error('Auth system not initialized');
      }

      try {
        const { data, error } = await this.supabaseClient.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        this.currentUser = data.user;
        console.log('User signed up:', email);
        return { user: data.user, session: data.session };
      } catch (error) {
        console.error('Sign up error:', error);
        throw error;
      }
    },

    // Sign in existing user
    async signIn(email, password) {
      if (!this.initialized) {
        throw new Error('Auth system not initialized');
      }

      try {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        this.currentUser = data.user;
        console.log('User signed in:', email);
        return { user: data.user, session: data.session };
      } catch (error) {
        console.error('Sign in error:', error);
        throw error;
      }
    },

    // Sign out current user
    async signOut() {
      if (!this.initialized) {
        throw new Error('Auth system not initialized');
      }

      try {
        const { error } = await this.supabaseClient.auth.signOut();
        if (error) throw error;

        console.log('User signed out');
        this.currentUser = null;
        return true;
      } catch (error) {
        console.error('Sign out error:', error);
        throw error;
      }
    },

    // Get current session
    async getSession() {
      if (!this.initialized) {
        return null;
      }

      try {
        const { data: { session } } = await this.supabaseClient.auth.getSession();
        return session;
      } catch (error) {
        console.error('Get session error:', error);
        return null;
      }
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
      if (!this.initialized) {
        console.warn('Auth system not initialized');
        return () => {};
      }

      const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        this.currentUser = session?.user || null;
        callback(event, session);
      });

      return () => subscription.unsubscribe();
    },

    // Check if user is authenticated
    isAuthenticated() {
      return this.currentUser !== null;
    },

    // Get current user
    getCurrentUser() {
      return this.currentUser;
    }
  };

  // UI Components for Authentication
  window.AuthUI = {
    // Show authentication screen
    show() {
      const authScreen = document.getElementById('auth-screen');
      if (authScreen) {
        authScreen.style.display = 'flex';
      }
      this.hideError();
    },

    // Hide authentication screen
    hide() {
      const authScreen = document.getElementById('auth-screen');
      if (authScreen) {
        authScreen.style.display = 'none';
      }
    },

    // Show main app
    showApp() {
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.style.display = 'flex';
      }
    },

    // Hide main app
    hideApp() {
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.style.display = 'none';
      }
    },

    // Show loading state
    showLoading(message = 'Loading...') {
      const authScreen = document.getElementById('auth-screen');
      if (authScreen) {
        authScreen.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <div style="font-size: 24px; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 16px; color: var(--color-text-secondary);">${message}</div>
          </div>
        `;
      }
    },

    // Show error message
    showError(message) {
      const errorEl = document.getElementById('auth-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    },

    // Hide error message
    hideError() {
      const errorEl = document.getElementById('auth-error');
      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }
    },

    // Toggle between login and signup modes
    toggleMode() {
      const loginForm = document.getElementById('login-form');
      const signupForm = document.getElementById('signup-form');
      const modeToggle = document.getElementById('mode-toggle');

      if (loginForm && signupForm) {
        const isLoginMode = loginForm.style.display !== 'none';
        
        if (isLoginMode) {
          loginForm.style.display = 'none';
          signupForm.style.display = 'block';
          if (modeToggle) modeToggle.textContent = 'Already have an account? Login';
        } else {
          loginForm.style.display = 'block';
          signupForm.style.display = 'none';
          if (modeToggle) modeToggle.textContent = "Don't have an account? Sign up";
        }
      }
      this.hideError();
    },

    // Update user info in header
    updateUserInfo(email) {
      const userEmailEl = document.getElementById('user-email');
      if (userEmailEl && email) {
        userEmailEl.textContent = email;
        userEmailEl.style.display = 'inline';
      }

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.style.display = 'inline-block';
      }
    },

    // Clear user info from header
    clearUserInfo() {
      const userEmailEl = document.getElementById('user-email');
      if (userEmailEl) {
        userEmailEl.style.display = 'none';
        userEmailEl.textContent = '';
      }

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.style.display = 'none';
      }
    }
  };

  // Login handler with 15-second timeout
  window.handleLogin = async function() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit');

    if (!email || !password) {
      window.AuthUI.showError('Please enter email and password');
      return;
    }

    // Prevent multiple submissions
    if (submitBtn.disabled) {
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    window.AuthUI.hideError();

    // 15-second timeout
    const timeoutId = setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
      window.AuthUI.showError('Login timeout. Please check your connection and try again.');
    }, 15000);

    try {
      const result = await window.Auth.signIn(email, password);
      clearTimeout(timeoutId);
      
      if (result.user) {
        window.AuthUI.hide();
        window.AuthUI.showApp();
        window.AuthUI.updateUserInfo(result.user.email);
        
        // Initialize real-time sync
        if (window.SupabaseSync && window.SupabaseSync.isReady()) {
          window.SupabaseSync.initRealtimeSync();
        }
        
        // Load user data
        if (typeof window.loadUserData === 'function') {
          await window.loadUserData(result.user.id);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      window.AuthUI.showError(errorMessage);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  };

  // Signup handler with timeout
  window.handleSignup = async function() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const submitBtn = document.getElementById('signup-submit');

    if (!email || !password || !confirmPassword) {
      window.AuthUI.showError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      window.AuthUI.showError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      window.AuthUI.showError('Passwords do not match');
      return;
    }

    if (submitBtn.disabled) {
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    window.AuthUI.hideError();

    const timeoutId = setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
      window.AuthUI.showError('Signup timeout. Please try again.');
    }, 15000);

    try {
      const result = await window.Auth.signUp(email, password);
      clearTimeout(timeoutId);
      
      if (result.user) {
        if (result.session) {
          window.AuthUI.hide();
          window.AuthUI.showApp();
          window.AuthUI.updateUserInfo(result.user.email);
          
          // Initialize real-time sync
          if (window.SupabaseSync && window.SupabaseSync.isReady()) {
            window.SupabaseSync.initRealtimeSync();
          }
          
          if (typeof window.initializeUserData === 'function') {
            await window.initializeUserData(result.user.id);
          }
        } else {
          window.AuthUI.showError('Account created! Please check email to confirm.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign Up';
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Signup failed. Please try again.';
      if (error.message) {
        if (error.message.includes('already registered')) {
          errorMessage = 'Email already registered. Please login.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      window.AuthUI.showError(errorMessage);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  };

  window.handleLogout = async function() {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      // Stop real-time sync
      if (window.SupabaseSync) {
        window.SupabaseSync.stopRealtimeSync();
      }
      
      await window.Auth.signOut();
      window.AuthUI.clearUserInfo();
      window.AuthUI.hideApp();
      window.AuthUI.show();
      
      if (typeof window.clearLocalData === 'function') {
        window.clearLocalData();
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  };

  console.log('Auth module loaded');
})();
