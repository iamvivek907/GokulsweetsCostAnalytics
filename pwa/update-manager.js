// PWA Update Manager
// Detects and installs new app versions automatically

(function() {
  'use strict';

  window.PWA = window.PWA || {};

  window.PWA.UpdateManager = {
    registration: null,
    checkInterval: null,
    CHECK_INTERVAL_MS: 60000, // Check every 60 seconds
    updateAvailable: false,

    /**
     * Initialize update manager
     */
    init(registration) {
      if (!registration) {
        console.warn('⚠️ No service worker registration provided');
        return;
      }
      
      this.registration = registration;
      console.log('✅ PWA Update Manager initialized');
      
      // Listen for updates
      this.setupUpdateListeners();
      
      // Start periodic checks
      this.startPeriodicChecks();
    },

    /**
     * Setup update event listeners
     */
    setupUpdateListeners() {
      if (!this.registration) return;
      
      // Listen for new service worker installing
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        console.log('🔄 New service worker found, installing...');
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed
              console.log('✅ New version installed');
              this.handleUpdate(newWorker);
            }
          });
        }
      });
      
      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service worker controller changed');
        this.reloadApp();
      });
    },

    /**
     * Handle update available
     */
    handleUpdate(newWorker) {
      this.updateAvailable = true;
      
      // Show toast notification
      if (window.UI?.Toast) {
        const toast = window.UI.Toast.show(
          '🎉 New version available! Updating in 3 seconds...',
          'info',
          10000
        );
        
        // Add skip button
        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Update Now';
        skipBtn.style.cssText = `
          background: var(--color-primary);
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          margin-left: 10px;
        `;
        skipBtn.onclick = () => {
          this.activateUpdate(newWorker);
          toast.remove();
        };
        toast.appendChild(skipBtn);
      }
      
      // Auto-update after 3 seconds
      setTimeout(() => {
        if (this.updateAvailable) {
          this.activateUpdate(newWorker);
        }
      }, 3000);
    },

    /**
     * Activate update
     */
    activateUpdate(worker) {
      console.log('🔄 Activating update...');
      
      if (worker && worker.state === 'installed') {
        // Tell the service worker to skip waiting
        worker.postMessage({ type: 'SKIP_WAITING' });
      } else if (this.registration && this.registration.waiting) {
        // Fallback: use registration.waiting
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    },

    /**
     * Reload app
     */
    reloadApp() {
      console.log('🔄 Reloading app...');
      
      if (window.UI?.Toast) {
        window.UI.Toast.info('🔄 Updating...', 1000);
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },

    /**
     * Start periodic update checks
     */
    startPeriodicChecks() {
      // Initial check after 5 seconds
      setTimeout(() => this.checkForUpdate(), 5000);
      
      // Then check every minute
      this.checkInterval = setInterval(() => {
        this.checkForUpdate();
      }, this.CHECK_INTERVAL_MS);
      
      console.log(`🔄 Update checks scheduled every ${this.CHECK_INTERVAL_MS / 1000}s`);
    },

    /**
     * Check for updates manually
     */
    async checkForUpdate() {
      if (!this.registration) return;
      
      try {
        console.log('🔍 Checking for updates...');
        await this.registration.update();
      } catch (error) {
        console.error('❌ Update check failed:', error);
      }
    },

    /**
     * Stop periodic checks
     */
    stopPeriodicChecks() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        console.log('🛑 Update checks stopped');
      }
    },

    /**
     * Force update now
     */
    async forceUpdate() {
      console.log('🔄 Forcing update...');
      
      await this.checkForUpdate();
      
      if (this.registration?.waiting) {
        this.activateUpdate(this.registration.waiting);
      } else {
        if (window.UI?.Toast) {
          window.UI.Toast.info('Already on latest version');
        }
      }
    }
  };

  console.log('✅ PWA.UpdateManager module loaded');
})();
