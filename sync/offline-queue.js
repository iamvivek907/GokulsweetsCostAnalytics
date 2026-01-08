// Offline Queue Module
// Manages offline changes and syncs when connection restored

(function() {
  'use strict';

  window.Sync = window.Sync || {};

  const QUEUE_STORAGE_KEY = 'offline_sync_queue';
  const MAX_QUEUE_SIZE = 100;

  window.Sync.OfflineQueue = {
    queue: [],
    isOnline: navigator.onLine,
    isSyncing: false,

    /**
     * Initialize offline queue
     */
    init() {
      // Load queue from storage
      this.loadQueue();
      
      // Listen for online/offline events
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      console.log('✅ Offline queue initialized');
    },

    /**
     * Load queue from localStorage
     */
    loadQueue() {
      try {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (stored) {
          this.queue = JSON.parse(stored);
          console.log(`📦 Loaded ${this.queue.length} queued changes`);
        }
      } catch (error) {
        console.error('❌ Error loading queue:', error);
        this.queue = [];
      }
    },

    /**
     * Save queue to localStorage
     */
    saveQueue() {
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      } catch (error) {
        console.error('❌ Error saving queue:', error);
      }
    },

    /**
     * Add operation to queue
     */
    enqueue(operation) {
      // Check queue size
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        console.warn('⚠️ Queue is full, removing oldest item');
        this.queue.shift();
      }
      
      const queueItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        operation
      };
      
      this.queue.push(queueItem);
      this.saveQueue();
      
      console.log(`📥 Queued operation (${this.queue.length} in queue)`);
      
      // Update UI
      this.updateQueueIndicator();
    },

    /**
     * Process queue when online
     */
    async processQueue() {
      if (this.isSyncing) {
        console.log('⏳ Already syncing...');
        return;
      }
      
      if (this.queue.length === 0) {
        console.log('📭 Queue is empty');
        return;
      }
      
      this.isSyncing = true;
      console.log(`🔄 Processing ${this.queue.length} queued operations...`);
      
      if (window.UI?.Toast) {
        window.UI.Toast.info(`🌐 Syncing ${this.queue.length} changes...`);
      }
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      // Process each operation
      while (this.queue.length > 0) {
        const item = this.queue[0];
        
        try {
          await this.executeOperation(item.operation);
          results.success++;
          
          // Remove from queue
          this.queue.shift();
          this.saveQueue();
        } catch (error) {
          console.error('❌ Queue operation failed:', error);
          results.failed++;
          results.errors.push({ item, error });
          
          // Remove failed item after 3 attempts
          if (!item.attempts) item.attempts = 0;
          item.attempts++;
          
          if (item.attempts >= 3) {
            console.warn('⚠️ Removing failed operation after 3 attempts');
            this.queue.shift();
            this.saveQueue();
          } else {
            // Move to end of queue for retry
            this.queue.shift();
            this.queue.push(item);
            this.saveQueue();
          }
        }
      }
      
      this.isSyncing = false;
      this.updateQueueIndicator();
      
      // Show result
      if (window.UI?.Toast) {
        if (results.failed === 0) {
          window.UI.Toast.success(`✅ ${results.success} changes synced`);
        } else {
          window.UI.Toast.warning(`⚠️ ${results.success} synced, ${results.failed} failed`);
        }
      }
      
      console.log('✅ Queue processing complete:', results);
    },

    /**
     * Execute a queued operation
     */
    async executeOperation(operation) {
      const { table, action, data, id } = operation;
      
      switch (action) {
        case 'create':
          return await window.DB[this.capitalize(table)].create(data);
        case 'update':
          return await window.DB[this.capitalize(table)].update(id, data);
        case 'delete':
          return await window.DB[this.capitalize(table)].delete(id);
        default:
          throw new Error(`Unknown operation: ${action}`);
      }
    },

    /**
     * Handle online event
     */
    handleOnline() {
      console.log('🌐 Connection restored');
      this.isOnline = true;
      
      if (window.UI?.Toast) {
        window.UI.Toast.success('🌐 Back online');
      }
      
      // Process queue
      setTimeout(() => this.processQueue(), 1000);
    },

    /**
     * Handle offline event
     */
    handleOffline() {
      console.log('📴 Connection lost');
      this.isOnline = false;
      
      if (window.UI?.Toast) {
        window.UI.Toast.warning('📴 Working offline');
      }
      
      this.updateQueueIndicator();
    },

    /**
     * Update queue indicator in UI
     */
    updateQueueIndicator() {
      const count = this.queue.length;
      
      // Find or create indicator element
      let indicator = document.getElementById('offline-queue-indicator');
      
      if (count > 0 || !this.isOnline) {
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.id = 'offline-queue-indicator';
          indicator.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: var(--color-warning);
            color: #000;
            padding: 8px 12px;
            border-radius: var(--radius);
            font-size: 12px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          `;
          document.body.appendChild(indicator);
        }
        
        if (!this.isOnline) {
          indicator.textContent = count > 0 
            ? `📴 Offline (${count} changes queued)` 
            : '📴 Working offline';
        } else if (this.isSyncing) {
          indicator.textContent = `🔄 Syncing ${count} changes...`;
        }
      } else if (indicator) {
        indicator.remove();
      }
    },

    /**
     * Capitalize first letter
     */
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Clear queue
     */
    clearQueue() {
      this.queue = [];
      this.saveQueue();
      this.updateQueueIndicator();
    }
  };

  console.log('✅ Sync.OfflineQueue module loaded');
})();
