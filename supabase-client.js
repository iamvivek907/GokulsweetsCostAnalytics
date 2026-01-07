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

    // Save data to Supabase (upsert into gokul_app_data table with user_id)
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
        console.log('Saving data to Supabase...');

        // First, check if a record exists
        const { data: existing, error: selectError } = await this.client
          .from('gokul_app_data')
          .select('id')
          .eq('user_id', userIdToUse)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (selectError) {
          console.error('Error checking existing data:', selectError);
          throw selectError;
        }

        let result;
        
        if (existing) {
          // Update existing record
          console.log('Updating existing record...');
          result = await this.client
            .from('gokul_app_data')
            .update({ 
              payload: payload, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id)
            .select();
        } else {
          // Insert new record
          console.log('Inserting new record...');
          result = await this.client
            .from('gokul_app_data')
            .insert({
              user_id: userIdToUse,
              device_id: deviceId,
              payload: payload,
              updated_at: new Date().toISOString()
            })
            .select();
        }

        if (result.error) {
          console.error('❌ Error saving data to Supabase:', result.error);
          throw result.error;
        }

        console.log('✅ Data saved to Supabase successfully:', result.data);
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
        let query = this.client
          .from('gokul_app_data')
          .select('payload, updated_at')
          .eq('device_id', deviceId);

        // Add user_id filter if available (for authenticated mode)
        if (userIdToUse) {
          query = query.eq('user_id', userIdToUse);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Error loading data from Supabase:', error);
          throw error;
        }

        // maybeSingle() returns null when no rows are found
        if (!data) {
          console.log('No data found for device ID:', deviceId);
          return null;
        }

        console.log('Data loaded from Supabase successfully');
        return data;
      } catch (error) {
        console.error('Failed to load data:', error);
        throw error;
      }
    },

    // Check if client is initialized
    isReady() {
      return this.isInitialized && this.client !== null;
    }
  };

  console.log('SupabaseSync helper loaded');
})();
