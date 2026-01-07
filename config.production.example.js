// config.production.example.js
// Example production configuration with Supabase credentials
// Copy this to config.js and update with your actual credentials

// ⚠️ SECURITY WARNING ⚠️
// Only commit these credentials to GitHub if you have implemented SECURE
// RLS policies with Supabase Auth. The development policy in the docs is
// INSECURE and allows anyone with the anon key to access ALL data.
// See DEPLOYMENT.md for secure production RLS policy examples.

(function() {
  'use strict';

  window.AppConfig = {
    // Supabase configuration
    supabase: {
      // Your Supabase project URL
      url: 'https://yourproject.supabase.co',
      
      // Your Supabase anon/public key 
      // Safe to expose ONLY with proper RLS policies
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
