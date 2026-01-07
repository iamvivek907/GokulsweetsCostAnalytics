// Supabase Configuration Loader
// Loads credentials from build-time environment variables or AppConfig

(function() {
  'use strict';

  // Configuration namespace
  window.SupabaseConfig = {
    // Get Supabase URL from environment or config
    getUrl() {
      // Priority 1: Build-time replaced placeholder
      if (window.SUPABASE_URL && window.SUPABASE_URL !== '__SUPABASE_URL__') {
        return window.SUPABASE_URL;
      }

      // Priority 2: AppConfig from config.js
      if (window.AppConfig && window.AppConfig.supabase && window.AppConfig.supabase.url) {
        return window.AppConfig.supabase.url;
      }

      // Priority 3: Return empty string (requires manual input)
      return '';
    },

    // Get Supabase anon key from environment or config
    getAnonKey() {
      // Priority 1: Build-time replaced placeholder
      if (window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY !== '__SUPABASE_ANON_KEY__') {
        return window.SUPABASE_ANON_KEY;
      }

      // Priority 2: AppConfig from config.js
      if (window.AppConfig && window.AppConfig.supabase && window.AppConfig.supabase.anonKey) {
        return window.AppConfig.supabase.anonKey;
      }

      // Priority 3: Return empty string (requires manual input)
      return '';
    },

    // Check if credentials are configured
    isConfigured() {
      const url = this.getUrl();
      const key = this.getAnonKey();
      return url && key && url !== '' && key !== '';
    },

    // Get all configuration
    getConfig() {
      return {
        url: this.getUrl(),
        anonKey: this.getAnonKey(),
        isConfigured: this.isConfigured()
      };
    }
  };

  // Make configuration available globally
  console.log('Supabase config loaded:', window.SupabaseConfig.isConfigured() ? 'configured' : 'not configured');
})();
