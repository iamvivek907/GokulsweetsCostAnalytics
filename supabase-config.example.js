// supabase-config.example.js
// Example configuration for Supabase integration
// DO NOT commit this file with actual secrets - this is for reference only

/*
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create a Supabase project at https://supabase.com
 * 
 * 2. Create the required table in your Supabase project:
 *    Run this SQL in the Supabase SQL Editor:
 *
 *    CREATE TABLE gokul_app_data (
 *      device_id TEXT PRIMARY KEY,
 *      payload JSONB NOT NULL,
 *      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 *    );
 *
 * 3. (IMPORTANT) For production, enable Row Level Security (RLS):
 *    
 *    ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;
 *    
 *    Then create policies to restrict access per user (requires Supabase Auth):
 *    
 *    CREATE POLICY "Users can only access their own data"
 *    ON gokul_app_data
 *    FOR ALL
 *    USING (auth.uid()::text = device_id);
 *
 * 4. Get your Supabase URL and anon key:
 *    - Go to Project Settings > API
 *    - Copy the "Project URL" and "anon public" key
 *
 * 5. In the app's Settings tab, paste these values in the Cloud Sync section
 *
 * EXAMPLE USAGE IN BROWSER CONSOLE:
 * 
 * // Initialize with your credentials
 * await SupabaseSync.init('https://yourproject.supabase.co', 'your-anon-key');
 * 
 * // Save current app data
 * const deviceId = 'my-device-123';
 * const appData = {
 *   ingredients: {...},
 *   recipes: {...},
 *   // ... other data
 * };
 * await SupabaseSync.saveData(deviceId, appData);
 * 
 * // Load data
 * const loadedData = await SupabaseSync.loadData(deviceId);
 * console.log(loadedData.payload);
 *
 * SECURITY WARNINGS:
 * 
 * - The anon key is PUBLIC and should only be used with Row Level Security (RLS) enabled
 * - Without RLS, anyone with the anon key can read/write all data in the table
 * - For production, implement Supabase Auth and use RLS policies to protect user data
 * - The current implementation uses device_id as a simple identifier
 * - Consider implementing proper authentication before deploying to production
 * 
 * TESTING NOTE:
 * 
 * This example is intentionally lightweight for testing and development.
 * The app UI provides a simple form to paste credentials for quick testing.
 */

// Example configuration object (DO NOT USE IN PRODUCTION)
const exampleConfig = {
  supabaseUrl: 'https://yourproject.supabase.co',
  supabaseAnonKey: 'your-anon-key-here'
};

// You would initialize like this:
// await SupabaseSync.init(exampleConfig.supabaseUrl, exampleConfig.supabaseAnonKey);
