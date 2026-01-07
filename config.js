// Configuration for Gokul Sweets Cost Analytics
// This file can be customized for deployment with environment-specific values

// ⚠️ SECURITY WARNING ⚠️
// If you commit Supabase credentials here and push to a PUBLIC GitHub repository,
// ANYONE can access your Supabase database if you're using the insecure development
// RLS policy. See DEPLOYMENT.md for secure production setup instructions.

(function() {
  'use strict';

  // Default configuration
  window.AppConfig = {
    // Supabase configuration (optional - can be set at deployment time)
    // If these are set, the app will use them automatically instead of requiring manual input
    supabase: {
      url: '', // REPLACE: e.g., 'https://yourproject.supabase.co'
      anonKey: '', // REPLACE: e.g., 'your-anon-key-here'
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
