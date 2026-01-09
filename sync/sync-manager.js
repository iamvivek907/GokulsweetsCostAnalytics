// Sync Manager Module
// Orchestrates all sync operations

(function() {
  'use strict';

  window.Sync = window.Sync || {};

  window.Sync.Manager = {
    isInitialized: false,
    saveTimeout: null,
    DEBOUNCE_MS: 300,

    /**
     * Initialize sync manager
     */
    async init() {
      if (this.isInitialized) {
        console.log('ℹ️ Sync manager already initialized');
        return;
      }
      
      console.log('🔄 Initializing sync manager...');
      
      // Initialize offline queue
      if (window.Sync.OfflineQueue) {
        window.Sync.OfflineQueue.init();
      }
      
      // Initialize real-time sync
      if (window.Sync.Realtime) {
        window.Sync.Realtime.init();
      }
      
      this.isInitialized = true;
      console.log('✅ Sync manager initialized');
    },

    /**
     * Save with debouncing and offline queue
     */
    async save(table, action, data, id = null) {
      // Clear existing timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      
      return new Promise((resolve, reject) => {
        this.saveTimeout = setTimeout(async () => {
          try {
            // Check if online
            if (!navigator.onLine && window.Sync.OfflineQueue) {
              console.log('📴 Offline - queuing operation');
              
              window.Sync.OfflineQueue.enqueue({
                table,
                action,
                data,
                id
              });
              
              if (window.UI?.Toast) {
                window.UI.Toast.info('📴 Saved offline, will sync when online');
              }
              
              resolve({ queued: true });
              return;
            }
            
            // Show saving indicator
            if (window.UI?.SaveIndicator) {
              window.UI.SaveIndicator.show('saving');
            }
            
            // Execute operation
            const moduleName = this.capitalize(table);
            const dbModule = window.DB?.[moduleName];
            
            if (!dbModule) {
              throw new Error(`DB module ${moduleName} not found`);
            }
            
            let result;
            switch (action) {
              case 'create':
                result = await dbModule.create(data);
                break;
              case 'update':
                result = await dbModule.update(id, data);
                break;
              case 'delete':
                result = await dbModule.delete(id);
                break;
              default:
                throw new Error(`Unknown action: ${action}`);
            }
            
            // Show success indicator
            if (window.UI?.SaveIndicator) {
              window.UI.SaveIndicator.show('success');
            }
            
            resolve(result);
          } catch (error) {
            console.error('❌ Save failed:', error);
            
            // Show error indicator
            if (window.UI?.SaveIndicator) {
              window.UI.SaveIndicator.show('error');
            }
            
            // Handle error
            if (window.UI?.ErrorHandler) {
              window.UI.ErrorHandler.show(error, `Failed to save ${table}`);
            }
            
            // If network error, queue for later
            if (error.code === 'NETWORK_ERROR' && window.Sync.OfflineQueue) {
              window.Sync.OfflineQueue.enqueue({
                table,
                action,
                data,
                id
              });
              resolve({ queued: true });
            } else {
              reject(error);
            }
          }
        }, this.DEBOUNCE_MS);
      });
    },

    /**
     * Capitalize string
     */
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Cleanup sync manager
     */
    cleanup() {
      console.log('🛑 Cleaning up sync manager...');
      
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      
      if (window.Sync.Realtime) {
        window.Sync.Realtime.cleanup();
      }
      
      this.isInitialized = false;
      console.log('✅ Sync manager cleanup complete');
    }
  };

  console.log('✅ Sync.Manager module loaded');
})();
