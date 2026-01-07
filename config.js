// Configuration for Gokul Sweets Cost Analytics
// This file can be customized for deployment with environment-specific values

// ⚠️ SECURITY WARNING ⚠️
// Do NOT commit actual Supabase credentials to public repositories!
// Use GitHub Secrets and CI/CD to inject credentials at build time.
// See .github/workflows/deploy.yml and SUPABASE_SETUP.md for details.

(function() {
  'use strict';

  // Default configuration
  window.AppConfig = {
    // Supabase configuration (will be replaced by GitHub Actions at build time)
    // If deploying manually, replace these placeholders with actual values
    supabase: {
      url: '__SUPABASE_URL__', // Will be replaced by CI/CD
      anonKey: '__SUPABASE_ANON_KEY__', // Will be replaced by CI/CD
      autoSync: true // Enable automatic sync on app load
    },

    // App settings
    app: {
      name: 'Gokul Sweets Cost Analytics',
      version: '2.1.0' // Updated with authentication support
    }
  };

  console.log('AppConfig loaded:', window.AppConfig.app.name, 'v' + window.AppConfig.app.version);
})();
