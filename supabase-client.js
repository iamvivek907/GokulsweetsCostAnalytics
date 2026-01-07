// Supabase Client Helper for Gokul Sweets Cost Analytics
// Enhanced with authentication support and user-scoped operations

(function() {
  'use strict';

  // Global namespace for Supabase sync
  window.SupabaseSync = {
    client: null,
    isInitialized: false,
    supabaseLib: null,
    currentUserId: null,
    organizationId: 'gokul_sweets',
    realtimeChannel: null,
    syncCallbacks: [],

    // Initialize the Supabase client with URL and anon key
    async init(supabaseUrl, supabaseKey) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and anon key are required');
      }

      // Dynamically load Supabase library if not already loaded
      if (!window.supabase) {
        await this._loadSupabaseLibrary();
      }

      try {
        this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
        
        // Check for existing session and set user ID
        const { data: { session } } = await this.client.auth.getSession();
        if (session && session.user) {
          this.currentUserId = session.user.id;
        }
        
        console.log('Supabase client initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        throw error;
      }
    },

    // Set current user ID (called after authentication)
    setUserId(userId) {
      this.currentUserId = userId;
    },

    // Get current user ID
    getUserId() {
      return this.currentUserId;
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
          console.log('Supabase library loaded from CDN');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Supabase library from CDN'));
        };
        document.head.appendChild(script);
      });
    },

    // Save data to Supabase (upsert into gokul_app_data table with organization_id)
    async saveData(deviceId, payload, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized. Call init() first.');
      }

      // Use provided userId or current user ID
      const userIdToUse = userId || this.currentUserId;
      
      if (!userIdToUse) {
        console.warn('No user ID available, cannot save to cloud');
        return { success: false, error: 'Not authenticated' };
      }

      try {
        console.log('💾 Saving data to shared workspace...');

        // Check if organization record exists
        const { data: existing, error: selectError } = await this.client
          .from('gokul_app_data')
          .select('id')
          .eq('organization_id', this.organizationId)
          .maybeSingle();

        if (selectError) {
          console.error('Error checking existing data:', selectError);
          throw selectError;
        }

        let result;
        const dataToSave = {
          organization_id: this.organizationId,
          user_id: userIdToUse, // Track who made the change
          device_id: deviceId,
          payload: payload,
          updated_at: new Date().toISOString()
        };
        
        if (existing) {
          // Update existing shared record
          console.log('Updating shared organization data...');
          result = await this.client
            .from('gokul_app_data')
            .update(dataToSave)
            .eq('organization_id', this.organizationId)
            .select();
        } else {
          // Insert new shared record
          console.log('Creating shared organization data...');
          result = await this.client
            .from('gokul_app_data')
            .insert(dataToSave)
            .select();
        }

        if (result.error) {
          console.error('❌ Error saving data to Supabase:', result.error);
          throw result.error;
        }

        console.log('✅ Data saved to shared workspace successfully');
        return { success: true, data: result.data };
      } catch (error) {
        console.error('❌ Failed to save data:', error);
        throw error;
      }
    },

    // Load data from Supabase (select from gokul_app_data table)
    async loadData(deviceId, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized. Call init() first.');
      }

      // Use provided userId or current user ID
      const userIdToUse = userId || this.currentUserId;

      try {
        console.log('📥 Loading shared organization data...');

        const { data, error } = await this.client
          .from('gokul_app_data')
          .select('payload, updated_at')
          .eq('organization_id', this.organizationId)
          .maybeSingle();

        if (error) {
          // If no data found, return null instead of throwing
          if (error.code === 'PGRST116') {
            console.log('No cloud data found for organization');
            return null;
          }
          console.error('Error loading data from Supabase:', error);
          throw error;
        }

        if (data) {
          console.log('✅ Loaded shared data from cloud');
          return data;
        } else {
          console.log('No cloud data found for organization');
          return null;
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        throw error;
      }
    },

    // Check if client is initialized
    isReady() {
      return this.isInitialized && this.client !== null;
    },

    // Initialize real-time subscription
    initRealtimeSync() {
      if (!this.client) {
        console.error('Supabase client not initialized');
        return;
      }

      console.log('🔄 Initializing real-time sync...');

      // Subscribe to changes on gokul_app_data table
      this.realtimeChannel = this.client
        .channel('gokul_app_data_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'gokul_app_data',
            filter: `organization_id=eq.${this.organizationId}`
          },
          (payload) => {
            console.log('🔔 Real-time update received:', payload);
            this.handleRealtimeUpdate(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time sync active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time sync error');
          } else {
            console.log('Real-time status:', status);
          }
        });
    },

    // Handle incoming real-time updates
    handleRealtimeUpdate(payload) {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      console.log(`Real-time ${eventType}:`, newRecord || oldRecord);

      // Notify all registered callbacks
      this.syncCallbacks.forEach(callback => {
        try {
          callback(eventType, newRecord);
        } catch (error) {
          console.error('Error in sync callback:', error);
        }
      });
    },

    // Register callback for real-time updates
    onDataSync(callback) {
      this.syncCallbacks.push(callback);
      
      // Return unsubscribe function
      return () => {
        const index = this.syncCallbacks.indexOf(callback);
        if (index > -1) {
          this.syncCallbacks.splice(index, 1);
        }
      };
    },

    // Unsubscribe from real-time updates
    stopRealtimeSync() {
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
        console.log('Real-time sync stopped');
      }
    }
  };

  console.log('SupabaseSync helper loaded');
})();
