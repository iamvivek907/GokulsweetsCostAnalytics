// Supabase Client Helper for Gokul Sweets Cost Analytics
// This helper dynamically loads the Supabase client and provides simple sync functions

(function() {
  'use strict';

  // Global namespace for Supabase sync
  window.SupabaseSync = {
    client: null,
    isInitialized: false,
    supabaseLib: null,

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
        console.log('Supabase client initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
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
          console.log('Supabase library loaded from CDN');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Supabase library from CDN'));
        };
        document.head.appendChild(script);
      });
    },

    // Save data to Supabase (upsert into gokul_app_data table)
    async saveData(deviceId, payload) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized. Call init() first.');
      }

      try {
        const { data, error } = await this.client
          .from('gokul_app_data')
          .upsert({
            device_id: deviceId,
            payload: payload,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'device_id'
          });

        if (error) {
          console.error('Error saving data to Supabase:', error);
          throw error;
        }

        console.log('Data saved to Supabase successfully');
        return { success: true, data };
      } catch (error) {
        console.error('Failed to save data:', error);
        throw error;
      }
    },

    // Load data from Supabase (select from gokul_app_data table)
    async loadData(deviceId) {
      if (!this.isInitialized || !this.client) {
        throw new Error('Supabase client not initialized. Call init() first.');
      }

      try {
        const { data, error } = await this.client
          .from('gokul_app_data')
          .select('payload, updated_at')
          .eq('device_id', deviceId)
          .single();

        if (error) {
          // If no data found, return null instead of throwing
          if (error.code === 'PGRST116') {
            console.log('No data found for device ID:', deviceId);
            return null;
          }
          console.error('Error loading data from Supabase:', error);
          throw error;
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
