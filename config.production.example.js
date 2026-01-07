// config.production.example.js
// Example production configuration with Supabase credentials
// Copy this to config.js and update with your actual credentials

(function() {
  'use strict';

  window.AppConfig = {
    // Supabase configuration
    supabase: {
      // Your Supabase project URL
      url: 'https://yourproject.supabase.co',
      
      // Your Supabase anon/public key (safe to expose in frontend)
      anonKey: 'your-anon-key-here',
      
      // Enable automatic sync on app load
      // When true, the app will automatically load data from Supabase on startup
      autoSync: true
    },

    app: {
      name: 'Gokul Sweets Cost Analytics',
      version: '2.0.0'
    }
  };

  console.log('AppConfig loaded:', window.AppConfig.app.name, 'v' + window.AppConfig.app.version);
})();
