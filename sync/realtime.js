// Real-Time Sync Module
// Handles WebSocket subscriptions for live updates

(function() {
  'use strict';

  window.Sync = window.Sync || {};

  window.Sync.Realtime = {
    channels: new Map(),
    callbacks: new Map(),
    isInitialized: false,

    /**
     * Initialize real-time subscriptions for all tables
     */
    init() {
      if (this.isInitialized) {
        console.log('ℹ️ Real-time sync already initialized');
        return;
      }
      
      console.log('🔄 Initializing real-time sync...');
      
      // Subscribe to each table
      this.subscribe('ingredients');
      this.subscribe('recipes');
      this.subscribe('staff');
      this.subscribe('organizations');
      
      this.isInitialized = true;
      console.log('✅ Real-time sync initialized');
    },

    /**
     * Subscribe to table changes
     */
    subscribe(tableName) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      console.log(`🔔 Subscribing to ${tableName} changes...`);
      
      const channelName = `${tableName}_changes`;
      const channel = client
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `organization_id=eq.${orgId}`
          },
          (payload) => {
            console.log(`🔔 Real-time update received for ${tableName}:`, payload);
            this.handleUpdate(tableName, payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${tableName} changes`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to ${tableName}`);
          } else if (status === 'TIMED_OUT') {
            console.warn(`⚠️ ${tableName} subscription timed out, retrying...`);
            setTimeout(() => this.subscribe(tableName), 5000);
          }
        });
      
      this.channels.set(tableName, channel);
    },

    /**
     * Handle real-time update
     */
    handleUpdate(tableName, payload) {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const currentUser = window.Auth?.currentUser;
      
      // Determine if this change was made by current user
      const isOwnChange = newRecord?.created_by === currentUser?.id || 
                          oldRecord?.created_by === currentUser?.id;
      
      // Show notification for other users' changes
      if (!isOwnChange && window.UI?.Toast) {
        const userName = this.getUserEmail(newRecord || oldRecord);
        
        switch (eventType) {
          case 'INSERT':
            const itemName = newRecord.name || 'item';
            window.UI.Toast.info(`✅ ${userName} added "${itemName}" to ${tableName}`);
            break;
          case 'UPDATE':
            window.UI.Toast.info(`✏️ ${userName} updated ${tableName}`);
            break;
          case 'DELETE':
            window.UI.Toast.info(`🗑️ ${userName} deleted from ${tableName}`);
            break;
        }
      }
      
      // Call registered callbacks
      const callbacks = this.callbacks.get(tableName) || [];
      callbacks.forEach(callback => {
        try {
          callback(eventType, newRecord, oldRecord);
        } catch (error) {
          console.error(`Error in ${tableName} callback:`, error);
        }
      });
    },

    /**
     * Get user email from record
     */
    getUserEmail(record) {
      if (!record) return 'Someone';
      
      // Try to get email from various fields
      if (record.created_by_email) return record.created_by_email;
      if (record.user_email) return record.user_email;
      
      // Fallback to "Another user"
      return 'Another user';
    },

    /**
     * Register callback for table updates
     */
    on(tableName, callback) {
      if (!this.callbacks.has(tableName)) {
        this.callbacks.set(tableName, []);
      }
      
      this.callbacks.get(tableName).push(callback);
      
      // Return unsubscribe function
      return () => {
        const callbacks = this.callbacks.get(tableName);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      };
    },

    /**
     * Unsubscribe from all channels
     */
    cleanup() {
      console.log('🛑 Cleaning up real-time subscriptions...');
      
      this.channels.forEach((channel, tableName) => {
        try {
          channel.unsubscribe();
          console.log(`✅ Unsubscribed from ${tableName}`);
        } catch (error) {
          console.error(`❌ Error unsubscribing from ${tableName}:`, error);
        }
      });
      
      this.channels.clear();
      this.callbacks.clear();
      this.isInitialized = false;
      
      console.log('✅ Real-time sync cleanup complete');
    }
  };

  console.log('✅ Sync.Realtime module loaded');
})();
