// Supabase Client Helper for Gokul Sweets Cost Analytics
// Shared workspace with real-time synchronization

(function() {
  'use strict';

  window.SupabaseSync = {
    client: null,
    isInitialized: false,
    organizationId: 'gokul_sweets',
    realtimeChannel: null,
    syncCallbacks: [],

    // Initialize Supabase client
    async init(supabaseUrl, supabaseKey) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and anon key are required');
      }

      if (!window.supabase) {
        await this._loadSupabaseLibrary();
      }

      try {
        this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
        console.log('✅ Supabase client initialized');
        return true;
      } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
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
          console.log('✅ Supabase library loaded');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Supabase library'));
        };
        document.head.appendChild(script);
      });
    },

    // Initialize real-time subscription
    initRealtimeSync() {
      if (!this.isInitialized || !this.client) {
        console.error('❌ Cannot init realtime: client not initialized');
        return;
      }

      console.log('🔄 Initializing real-time sync...');

      this.realtimeChannel = this.client
        .channel('gokul_app_data_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
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
            console.error('❌ Real-time channel error');
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ Real-time subscription timed out, retrying...');
            setTimeout(() => this.initRealtimeSync(), 5000);
          } else {
            console.log('📡 Real-time status:', status);
          }
        });
    },

    // Handle real-time updates
    handleRealtimeUpdate(payload) {
      const { eventType, new: newRecord } = payload;

      if (newRecord && newRecord.payload) {
        console.log(`🔄 Processing ${eventType} event`);
        
        this.syncCallbacks.forEach(callback => {
          try {
            callback(eventType, newRecord.payload);
          } catch (error) {
            console.error('Error in sync callback:', error);
          }
        });
      }
    },

    // Register callback for real-time updates
    onDataSync(callback) {
      this.syncCallbacks.push(callback);
      return () => {
        const index = this.syncCallbacks.indexOf(callback);
        if (index > -1) {
          this.syncCallbacks.splice(index, 1);
        }
      };
    },

    // Stop real-time sync
    stopRealtimeSync() {
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
        this.syncCallbacks = [];
        console.log('🛑 Real-time sync stopped');
      }
    },

    // Save data to shared organization workspace
    async saveData(deviceId, payload, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized');
      }

      if (!userId) {
        console.warn('⚠️ No user ID - cannot save to cloud');
        return { success: false, error: 'Not authenticated' };
      }

      try {
        console.log('💾 Saving to shared workspace...');

        // Check if organization record exists
        const { data: existing, error: selectError } = await this.client
          .from('gokul_app_data')
          .select('id')
          .eq('organization_id', this.organizationId)
          .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        const dataToSave = {
          organization_id: this.organizationId,
          user_id: userId,
          device_id: deviceId,
          payload: payload,
          updated_at: new Date().toISOString()
        };

        let result;
        
        if (existing) {
          // Update existing shared record
          console.log('📝 Updating shared organization data...');
          result = await this.client
            .from('gokul_app_data')
            .update(dataToSave)
            .eq('organization_id', this.organizationId)
            .select();
        } else {
          // Insert new shared record
          console.log('➕ Creating shared organization data...');
          result = await this.client
            .from('gokul_app_data')
            .insert(dataToSave)
            .select();
        }

        if (result.error) {
          throw result.error;
        }

        console.log('✅ Data saved to shared workspace');
        return { success: true, data: result.data };
      } catch (error) {
        console.error('❌ Failed to save data:', error);
        throw error;
      }
    },

    // Load data from shared organization workspace
    async loadData(deviceId, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized');
      }

      try {
        console.log('📥 Loading shared organization data...');

        const { data, error } = await this.client
          .from('gokul_app_data')
          .select('payload, updated_at')
          .eq('organization_id', this.organizationId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data && data.payload) {
          console.log('✅ Loaded shared data from cloud');
          return data;
        } else {
          console.log('📭 No cloud data found for organization');
          return null;
        }
      } catch (error) {
        console.error('❌ Failed to load data:', error);
        throw error;
      }
    },

    isReady() {
      return this.isInitialized && this.client !== null;
    }
  };

  console.log('SupabaseSync helper loaded');
})();
