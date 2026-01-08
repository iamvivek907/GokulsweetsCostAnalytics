// Application Initialization Script
// Initializes all modules in the correct order

(function() {
  'use strict';

  window.AppInit = {
    isInitialized: false,
    useMultiTable: false, // Flag to control which architecture to use

    /**
     * Initialize the application
     */
    async init() {
      if (this.isInitialized) {
        console.log('ℹ️ App already initialized');
        return;
      }

      console.log('🚀 Initializing Gokul Sweets Cost Analytics...');

      try {
        // Step 1: Initialize auth and Supabase
        await this.initAuth();

        // Step 2: Check if multi-table schema is available
        const hasMultiTable = await this.checkMultiTableSchema();

        if (hasMultiTable) {
          console.log('✅ Multi-table schema detected');
          this.useMultiTable = true;

          // Step 3: Initialize new architecture
          await this.initMultiTableArchitecture();
        } else {
          console.log('ℹ️ Using legacy JSONB architecture');
          this.useMultiTable = false;

          // Use legacy initialization
          await this.initLegacyArchitecture();
        }

        this.isInitialized = true;
        console.log('✅ Application initialized successfully');

      } catch (error) {
        console.error('❌ Application initialization failed:', error);
        throw error;
      }
    },

    /**
     * Initialize authentication
     */
    async initAuth() {
      console.log('🔐 Initializing authentication...');

      if (!window.Auth) {
        throw new Error('Auth module not loaded');
      }

      // Auth initialization is handled by existing auth.js
      // Just verify it's ready
      if (window.Auth.initialized) {
        console.log('✅ Auth already initialized');
      }
    },

    /**
     * Check if multi-table schema exists
     */
    async checkMultiTableSchema() {
      if (!window.SupabaseSync?.client) {
        return false;
      }

      try {
        // Try to query the organizations table
        const { error } = await window.SupabaseSync.client
          .from('organizations')
          .select('id')
          .limit(1);

        // If no error, multi-table schema exists
        return !error;
      } catch (error) {
        console.log('ℹ️ Multi-table schema not available:', error.message);
        return false;
      }
    },

    /**
     * Initialize multi-table architecture
     */
    async initMultiTableArchitecture() {
      console.log('🔧 Initializing multi-table architecture...');

      // Initialize UI modules
      if (window.UI?.Toast) {
        window.UI.Toast.init();
      }

      // Initialize sync manager
      if (window.Sync?.Manager) {
        await window.Sync.Manager.init();
      }

      // Initialize PWA update manager
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && window.PWA?.UpdateManager) {
          window.PWA.UpdateManager.init(registration);
        }
      }

      // Check if migration is needed
      if (window.Migration) {
        const needsMigration = await window.Migration.needsMigration();
        if (needsMigration) {
          console.log('🔄 Migration needed');
          
          // Ask user if they want to migrate
          const shouldMigrate = confirm(
            'We\'ve upgraded to a new data format! Would you like to migrate your existing data now?\n\n' +
            'Your data is safe and backed up. This will take a few seconds.'
          );

          if (shouldMigrate) {
            // Backup old data first
            window.Migration.backupOldData();

            // Perform migration
            await window.Migration.migrate();

            if (window.UI?.Toast) {
              window.UI.Toast.success('✅ Migration complete! Enjoy the new features!', 6000);
            }
          } else {
            console.log('ℹ️ User declined migration');
            if (window.UI?.Toast) {
              window.UI.Toast.info('You can migrate later from Settings', 4000);
            }
          }
        }
      }

      console.log('✅ Multi-table architecture initialized');
    },

    /**
     * Initialize legacy architecture (fallback)
     */
    async initLegacyArchitecture() {
      console.log('🔧 Initializing legacy architecture...');

      // Legacy initialization is handled by existing code in index.html
      // This is just a placeholder for future enhancements

      console.log('✅ Legacy architecture initialized');
    },

    /**
     * Get current architecture info
     */
    getInfo() {
      return {
        initialized: this.isInitialized,
        architecture: this.useMultiTable ? 'multi-table' : 'legacy',
        modules: {
          db: !!window.DB,
          sync: !!window.Sync,
          ui: !!window.UI,
          pwa: !!window.PWA,
          migration: !!window.Migration
        }
      };
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Don't auto-init, let the app call it when auth is ready
      console.log('✅ AppInit ready, waiting for manual initialization');
    });
  } else {
    console.log('✅ AppInit ready, waiting for manual initialization');
  }

  console.log('✅ AppInit module loaded');
})();
