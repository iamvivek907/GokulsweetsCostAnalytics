// Configuration for Gokul Sweets Cost Analytics
// This file can be customized for deployment with environment-specific values

(function() {
  'use strict';

  // Default configuration
  window.AppConfig = {
    // Supabase configuration (optional - can be set at deployment time)
    // If these are set, the app will use them automatically instead of requiring manual input
    supabase: {
      url: '', // e.g., 'https://yourproject.supabase.co'
      anonKey: '', // e.g., 'your-anon-key-here'
      autoSync: false // Set to true to enable automatic sync on app load
    },

    // App settings
    app: {
      name: 'Gokul Sweets Cost Analytics',
      version: '2.0.0'
    }
  };

  console.log('AppConfig loaded:', window.AppConfig.app.name, 'v' + window.AppConfig.app.version);
})();
