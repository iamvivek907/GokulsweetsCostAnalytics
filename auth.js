// Authentication Module for Gokul Sweets Cost Analytics
// Enhanced with proper cleanup and state management

(function() {
  'use strict';

  // Global timeout tracker to prevent memory leaks
  let loginTimeoutId = null;
  let signupTimeoutId = null;
  let authStateUnsubscribe = null;

  // Configuration constants
  const REALTIME_SYNC_DELAY_MS = 500; // Delay before re-initializing real-time sync after login

  window.Auth = {
    currentUser: null,
    supabaseClient: null,
    initialized: false,

    async init(supabaseUrl, supabaseKey) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and key are required');
      }

      if (!window.supabase) {
        await this._loadSupabaseLibrary();
      }

      try {
        this.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        this.initialized = true;
        console.log('✅ Auth system initialized');

        const { data: { session } } = await this.supabaseClient.auth.getSession();
        if (session) {
          this.currentUser = session.user;
          console.log('✅ Existing session found:', this.currentUser.email);
          return { user: this.currentUser, session };
        }

        return { user: null, session: null };
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
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

    async signUp(email, password) {
      if (!this.initialized) {
        throw new Error('Auth system not initialized');
      }

      const { data, error } = await this.supabaseClient.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      this.currentUser = data.user;
      console.log('✅ User signed up:', email);
      return { user: data.user, session: data.session };
    },

    async signIn(email, password) {
      if (!this.initialized) {
        throw new Error('Auth system not initialized');
      }

      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      this.currentUser = data.user;
      console.log('✅ User signed in:', email);
      return { user: data.user, session: data.session };
    },

    async signOut() {
      if (!this.initialized) {
        throw new Error('Auth system not initialized');
      }

      try {
        const { error } = await this.supabaseClient.auth.signOut();
        if (error) throw error;

        console.log('✅ User signed out');
        this.currentUser = null;
        
        // Clean up auth state listener
        if (authStateUnsubscribe) {
          authStateUnsubscribe();
          authStateUnsubscribe = null;
        }
        
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

    onAuthStateChange(callback) {
      if (!this.initialized) {
        console.warn('Auth system not initialized');
        return () => {};
      }

      // Clean up previous subscription if exists
      if (authStateUnsubscribe) {
        authStateUnsubscribe();
      }

      const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        this.currentUser = session?.user || null;
        callback(event, session);
      });

      authStateUnsubscribe = () => subscription.unsubscribe();
      return authStateUnsubscribe;
    },

    // Check if user is authenticated
    isAuthenticated() {
      return this.currentUser !== null;
    },

    getCurrentUser() {
      return this.currentUser;
    },

    // Clean up all auth-related state
    cleanup() {
      if (authStateUnsubscribe) {
        authStateUnsubscribe();
        authStateUnsubscribe = null;
      }
      this.currentUser = null;
    }
  };

  window.AuthUI = {
    show() {
      const authScreen = document.getElementById('auth-screen');
      if (authScreen) {
        authScreen.style.display = 'flex';
      }
      this.hideError();
      this.resetForms();
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
      this.resetForms();
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
    },

    // Reset all form states to default
    resetForms() {
      // Reset login form
      const loginBtn = document.getElementById('login-submit');
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }

      const loginEmail = document.getElementById('login-email');
      const loginPassword = document.getElementById('login-password');
      if (loginEmail) loginEmail.value = '';
      if (loginPassword) loginPassword.value = '';

      // Reset signup form
      const signupBtn = document.getElementById('signup-submit');
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.textContent = 'Sign Up';
      }

      const signupEmail = document.getElementById('signup-email');
      const signupPassword = document.getElementById('signup-password');
      const signupConfirm = document.getElementById('signup-confirm-password');
      if (signupEmail) signupEmail.value = '';
      if (signupPassword) signupPassword.value = '';
      if (signupConfirm) signupConfirm.value = '';

      // Clear any pending timeouts
      if (loginTimeoutId) {
        clearTimeout(loginTimeoutId);
        loginTimeoutId = null;
      }
      if (signupTimeoutId) {
        clearTimeout(signupTimeoutId);
        signupTimeoutId = null;
      }
    }
  };

  // Login handler with comprehensive cleanup
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
      console.warn('⚠️ Login already in progress');
      return;
    }

    // Clear any existing timeout
    if (loginTimeoutId) {
      clearTimeout(loginTimeoutId);
      loginTimeoutId = null;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    window.AuthUI.hideError();

    // Set 15-second timeout
    loginTimeoutId = setTimeout(() => {
      console.error('❌ Login timeout after 15 seconds');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
      window.AuthUI.showError('Login timeout. Please check your connection and try again.');
      loginTimeoutId = null;
    }, 15000);

    try {
      console.log('🔐 Attempting login for:', email);
      const result = await window.Auth.signIn(email, password);
      
      // Clear timeout on success
      if (loginTimeoutId) {
        clearTimeout(loginTimeoutId);
        loginTimeoutId = null;
      }
      
      if (result.user) {
        console.log('✅ Login successful');
        
        // Hide auth screen and show app
        window.AuthUI.hide();
        window.AuthUI.showApp();
        window.AuthUI.updateUserInfo(result.user.email);
        
        // CRITICAL: Stop any existing real-time sync
        if (window.SupabaseSync && window.SupabaseSync.isReady()) {
          console.log('🛑 Stopping existing real-time sync...');
          window.SupabaseSync.stopRealtimeSync();
        }
        
        // CRITICAL: Force data reload from cloud
        console.log('📥 Force loading user data from cloud...');
        if (typeof window.loadUserData === 'function') {
          try {
            await window.loadUserData(result.user.id);
            console.log('✅ User data loaded successfully');
          } catch (error) {
            console.error('❌ Failed to load user data:', error);
            window.AuthUI.showError('Failed to load data. Please refresh the page.');
          }
        }
        
        // Initialize V2 multi-table architecture if available
        if (window.AppInit && !window.AppInit.isInitialized) {
          try {
            console.log('🚀 Initializing V2 architecture...');
            await window.AppInit.init();
            console.log('✅ V2 architecture initialized');
          } catch (error) {
            console.warn('⚠️ V2 initialization failed, using legacy mode:', error);
          }
        }
        
        // CRITICAL: Re-initialize real-time sync
        if (window.SupabaseSync && window.SupabaseSync.isReady()) {
          console.log('🔄 Re-initializing real-time sync...');
          setTimeout(() => {
            window.SupabaseSync.initRealtimeSync();
          }, REALTIME_SYNC_DELAY_MS); // Small delay to ensure data is loaded first
        }
        
        // Reset form for next time
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
      }
    } catch (error) {
      // Clear timeout on error
      if (loginTimeoutId) {
        clearTimeout(loginTimeoutId);
        loginTimeoutId = null;
      }
      
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address';
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      window.AuthUI.showError(errorMessage);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  };

  // Signup handler with comprehensive cleanup
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

    // Prevent multiple submissions
    if (submitBtn.disabled) {
      console.warn('⚠️ Signup already in progress');
      return;
    }

    // Clear any existing timeout
    if (signupTimeoutId) {
      clearTimeout(signupTimeoutId);
      signupTimeoutId = null;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    window.AuthUI.hideError();

    // Set 15-second timeout
    signupTimeoutId = setTimeout(() => {
      console.error('❌ Signup timeout after 15 seconds');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
      window.AuthUI.showError('Signup timeout. Please try again.');
      signupTimeoutId = null;
    }, 15000);

    try {
      console.log('📝 Attempting signup for:', email);
      const result = await window.Auth.signUp(email, password);
      
      // Clear timeout on success
      if (signupTimeoutId) {
        clearTimeout(signupTimeoutId);
        signupTimeoutId = null;
      }
      
      if (result.user) {
        if (result.session) {
          console.log('✅ Signup successful with immediate session');
          
          window.AuthUI.hide();
          window.AuthUI.showApp();
          window.AuthUI.updateUserInfo(result.user.email);
          
          // Initialize for new user
          if (typeof window.initializeUserData === 'function') {
            await window.initializeUserData(result.user.id);
          }
          
          // Initialize V2 multi-table architecture if available
          if (window.AppInit && !window.AppInit.isInitialized) {
            try {
              console.log('🚀 Initializing V2 architecture...');
              await window.AppInit.init();
              console.log('✅ V2 architecture initialized');
            } catch (error) {
              console.warn('⚠️ V2 initialization failed, using legacy mode:', error);
            }
          }
          
          // Initialize real-time sync
          if (window.SupabaseSync && window.SupabaseSync.isReady()) {
            window.SupabaseSync.initRealtimeSync();
          }
          
          // Reset form
          document.getElementById('signup-email').value = '';
          document.getElementById('signup-password').value = '';
          document.getElementById('signup-confirm-password').value = '';
        } else {
          console.log('✅ Signup successful - email confirmation required');
          window.AuthUI.showError('Account created! Please check your email to confirm.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign Up';
        }
      }
    } catch (error) {
      // Clear timeout on error
      if (signupTimeoutId) {
        clearTimeout(signupTimeoutId);
        signupTimeoutId = null;
      }
      
      console.error('❌ Signup error:', error);
      
      let errorMessage = 'Signup failed. Please try again.';
      if (error.message) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          errorMessage = 'Email already registered. Please login.';
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      window.AuthUI.showError(errorMessage);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  };

  // Logout handler with comprehensive cleanup
  window.handleLogout = async function() {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      console.log('🚪 Logging out...');
      
      // Stop real-time sync BEFORE signing out
      if (window.SupabaseSync) {
        console.log('🛑 Stopping real-time sync...');
        window.SupabaseSync.stopRealtimeSync();
      }
      
      // Sign out from Supabase
      await window.Auth.signOut();
      
      // Clean up auth state
      window.Auth.cleanup();
      
      // Clear UI
      window.AuthUI.clearUserInfo();
      window.AuthUI.hideApp();
      
      // Reset auth forms BEFORE showing
      window.AuthUI.resetForms();
      
      // Show auth screen
      window.AuthUI.show();
      
      // Clear local data
      if (typeof window.clearLocalData === 'function') {
        window.clearLocalData();
      }
      
      // Clear any pending timeouts
      if (loginTimeoutId) {
        clearTimeout(loginTimeoutId);
        loginTimeoutId = null;
      }
      if (signupTimeoutId) {
        clearTimeout(signupTimeoutId);
        signupTimeoutId = null;
      }
      
      console.log('✅ Logout complete - all state cleaned up');
    } catch (error) {
      console.error('❌ Logout error:', error);
      alert('Logout failed: ' + (error.message || 'Unknown error'));
    }
  };

  console.log('✅ Auth module loaded with enhanced cleanup');
})();
