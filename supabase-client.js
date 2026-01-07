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

    // Stop real-time sync with proper cleanup
    stopRealtimeSync() {
      if (this.realtimeChannel) {
        try {
          console.log('🛑 Stopping real-time sync...');
          
          // Unsubscribe from channel
          this.realtimeChannel.unsubscribe();
          
          // Remove channel
          if (this.client) {
            this.client.removeChannel(this.realtimeChannel);
          }
          
          this.realtimeChannel = null;
          this.syncCallbacks = [];
          
          console.log('✅ Real-time sync stopped and cleaned up');
        } catch (error) {
          console.error('❌ Error stopping real-time sync:', error);
          // Force cleanup even on error
          this.realtimeChannel = null;
          this.syncCallbacks = [];
        }
      } else {
        console.log('ℹ️ No active real-time channel to stop');
      }
    },

    // Save data to user's workspace (NOT shared organization)
    async saveData(deviceId, payload, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized');
      }

      if (!userId) {
        console.warn('⚠️ No user ID - cannot save to cloud');
        return { success: false, error: 'Not authenticated' };
      }

      try {
        console.log('💾 Saving user data to cloud...');
        console.log('📊 Payload preview:', {
          ingredients: Object.keys(payload.ingredients || {}).length,
          recipes: Object.keys(payload.recipes || {}).length,
          staff: Object.keys(payload.staff || {}).length
        });

        // CRITICAL: Validate payload before saving
        const recipeCount = Object.keys(payload.recipes || {}).length;
        if (recipeCount === 0 && localStorage.getItem('restaurant_recipes')) {
          const localRecipes = JSON.parse(localStorage.getItem('restaurant_recipes') || '{}');
          if (Object.keys(localRecipes).length > 0) {
            console.error('❌ ABORT: Local has recipes but payload is empty - data consistency check failed');
            return { success: false, error: 'Data validation failed' };
          }
        }

        // Check if user's record exists
        const { data: existing, error: selectError } = await this.client
          .from('gokul_app_data')
          .select('id')
          .eq('user_id', userId)          // ✅ Query by user_id
          .eq('device_id', deviceId)      // ✅ Query by device_id
          .eq('organization_id', this.organizationId)
          .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        const dataToSave = {
          user_id: userId,
          device_id: deviceId,
          organization_id: this.organizationId,
          payload: payload,
          updated_at: new Date().toISOString()
        };

        let result;
        
        if (existing) {
          // Update user's existing record
          console.log('📝 Updating user data...');
          result = await this.client
            .from('gokul_app_data')
            .update(dataToSave)
            .eq('user_id', userId)        // ✅ Update only this user's row
            .eq('device_id', deviceId)
            .eq('organization_id', this.organizationId)
            .select();
        } else {
          // Insert new record for user
          console.log('➕ Creating user data...');
          result = await this.client
            .from('gokul_app_data')
            .insert(dataToSave)
            .select();
        }

        if (result.error) {
          console.error('❌ Save error:', result.error);
          throw result.error;
        }

        console.log('✅ Data saved to cloud successfully');
        console.log('✅ Saved counts:', {
          ingredients: Object.keys(payload.ingredients || {}).length,
          recipes: Object.keys(payload.recipes || {}).length,
          staff: Object.keys(payload.staff || {}).length
        });
        
        return { success: true, data: result.data };
      } catch (error) {
        console.error('❌ Failed to save data:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint
        });
        throw error;
      }
    },

    // Load data from user's workspace
    async loadData(deviceId, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized');
      }

      if (!userId) {
        console.warn('⚠️ No user ID - cannot load from cloud');
        return null;
      }

      try {
        console.log('📥 Loading user data from cloud...');

        const { data, error } = await this.client
          .from('gokul_app_data')
          .select('payload, updated_at')
          .eq('user_id', userId)          // ✅ Load only this user's data
          .eq('device_id', deviceId)
          .eq('organization_id', this.organizationId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Load error:', error);
          throw error;
        }

        if (data && data.payload) {
          console.log('✅ Loaded user data from cloud');
          console.log('📊 Loaded counts:', {
            ingredients: Object.keys(data.payload.ingredients || {}).length,
            recipes: Object.keys(data.payload.recipes || {}).length,
            staff: Object.keys(data.payload.staff || {}).length
          });
          return data;
        } else {
          console.log('📭 No cloud data found for user');
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
