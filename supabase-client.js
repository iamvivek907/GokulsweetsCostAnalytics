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

    // Save data to SHARED organization workspace
    async saveData(deviceId, payload, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized');
      }

      if (!userId) {
        console.warn('⚠️ No user ID - cannot save to cloud');
        return { success: false, error: 'Not authenticated' };
      }

      try {
        console.log('💾 Saving to SHARED workspace...');
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

        // Check if shared organization record exists
        const { data: existing, error: selectError } = await this.client
          .from('gokul_app_data')
          .select('id, payload')
          .eq('organization_id', this.organizationId)  // ✅ Query by organization_id ONLY
          .eq('device_id', 'shared_workspace')
          .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        // Merge new data with existing shared data
        let mergedPayload = payload;
        if (existing && existing.payload) {
          console.log('🔄 Merging with existing shared data...');
          mergedPayload = {
            ingredients: { ...(existing.payload.ingredients || {}), ...(payload.ingredients || {}) },
            recipes: { ...(existing.payload.recipes || {}), ...(payload.recipes || {}) },
            staff: { ...(existing.payload.staff || {}), ...(payload.staff || {}) }
          };
          console.log('📊 Merged counts:', {
            ingredients: Object.keys(mergedPayload.ingredients).length,
            recipes: Object.keys(mergedPayload.recipes).length,
            staff: Object.keys(mergedPayload.staff).length
          });
        }

        const dataToSave = {
          organization_id: this.organizationId,
          device_id: 'shared_workspace',
          user_id: userId,  // Track last modifier for audit trail
          payload: mergedPayload,
          updated_at: new Date().toISOString()
        };

        let result;
        
        if (existing) {
          // Update shared organization record
          console.log('📝 Updating SHARED workspace...');
          result = await this.client
            .from('gokul_app_data')
            .update(dataToSave)
            .eq('organization_id', this.organizationId)  // ✅ Update by organization_id ONLY
            .eq('device_id', 'shared_workspace')
            .select();
        } else {
          // Insert new shared record
          console.log('➕ Creating SHARED workspace...');
          result = await this.client
            .from('gokul_app_data')
            .insert(dataToSave)
            .select();
        }

        if (result.error) {
          console.error('❌ Save error:', result.error);
          throw result.error;
        }

        console.log('✅ Data saved to SHARED workspace successfully');
        console.log('✅ Last modified by user:', userId);
        console.log('✅ Saved counts:', {
          ingredients: Object.keys(mergedPayload.ingredients || {}).length,
          recipes: Object.keys(mergedPayload.recipes || {}).length,
          staff: Object.keys(mergedPayload.staff || {}).length
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

    // Load data from SHARED organization workspace
    async loadData(deviceId, userId = null) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized');
      }

      if (!userId) {
        console.warn('⚠️ No user ID - cannot load from cloud');
        return null;
      }

      try {
        console.log('📥 Loading SHARED organization data from cloud...');

        const { data, error } = await this.client
          .from('gokul_app_data')
          .select('payload, updated_at, user_id')
          .eq('organization_id', this.organizationId)  // ✅ Load by organization_id ONLY
          .eq('device_id', 'shared_workspace')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Load error:', error);
          throw error;
        }

        if (data && data.payload) {
          console.log('✅ Loaded SHARED organization data from cloud');
          console.log('📊 Loaded counts:', {
            ingredients: Object.keys(data.payload.ingredients || {}).length,
            recipes: Object.keys(data.payload.recipes || {}).length,
            staff: Object.keys(data.payload.staff || {}).length
          });
          console.log('👤 Last modified by user:', data.user_id);
          return data;
        } else {
          console.log('📭 No shared workspace data found');
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
