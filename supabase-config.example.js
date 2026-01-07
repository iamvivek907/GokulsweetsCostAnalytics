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
 *    -- IMPORTANT: Use the correct schema with all required columns!
 *    -- See supabase-schema.sql in this repository for the full schema
 *    
 *    CREATE TABLE IF NOT EXISTS gokul_app_data (
 *      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *      device_id TEXT NOT NULL,
 *      organization_id TEXT DEFAULT 'gokul_sweets' NOT NULL,
 *      payload JSONB NOT NULL,
 *      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *      UNIQUE(user_id, device_id, organization_id)
 *    );
 *
 *    -- Create indexes for performance
 *    CREATE INDEX IF NOT EXISTS idx_gokul_user_id ON gokul_app_data(user_id);
 *    CREATE INDEX IF NOT EXISTS idx_gokul_org_id ON gokul_app_data(organization_id);
 *    CREATE INDEX IF NOT EXISTS idx_gokul_device_id ON gokul_app_data(device_id);
 *
 * 3. (IMPORTANT) Enable Row Level Security (RLS):
 *    
 *    ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;
 *    
 *    -- Create policies to ensure users can only access their own data:
 *    
 *    CREATE POLICY "users_select_own"
 *    ON gokul_app_data
 *    FOR SELECT
 *    USING (auth.uid() = user_id);
 *    
 *    CREATE POLICY "users_insert_own"
 *    ON gokul_app_data
 *    FOR INSERT
 *    WITH CHECK (auth.uid() = user_id);
 *    
 *    CREATE POLICY "users_update_own"
 *    ON gokul_app_data
 *    FOR UPDATE
 *    USING (auth.uid() = user_id)
 *    WITH CHECK (auth.uid() = user_id);
 *    
 *    CREATE POLICY "users_delete_own"
 *    ON gokul_app_data
 *    FOR DELETE
 *    USING (auth.uid() = user_id);
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
 * // Get current user
 * const user = window.Auth.getCurrentUser();
 * 
 * // Save current app data (per-user, not shared)
 * const deviceId = 'my-device-123';
 * const appData = {
 *   ingredients: {...},
 *   recipes: {...},
 *   // ... other data
 * };
 * await SupabaseSync.saveData(deviceId, appData, user.id);
 * 
 * // Load user's data
 * const loadedData = await SupabaseSync.loadData(deviceId, user.id);
 * console.log(loadedData.payload);
 *
 * SECURITY WARNINGS:
 * 
 * - The anon key is PUBLIC and should only be used with Row Level Security (RLS) enabled
 * - Without RLS, anyone with the anon key can read/write all data in the table
 * - RLS policies ensure users can only access their own data
 * - Each user has their own isolated data workspace
 * - The organization_id column is for future shared workspace features
 * 
 * CRITICAL SCHEMA REQUIREMENTS:
 * 
 * - MUST have user_id column (UUID, references auth.users)
 * - MUST have device_id column (TEXT)
 * - MUST have organization_id column (TEXT, default 'gokul_sweets')
 * - MUST have payload column (JSONB)
 * - MUST enable RLS with policies that check auth.uid() = user_id
 * - Without these columns, the app WILL NOT WORK and data will be lost!
 * 
 * For the complete, production-ready schema with all optimizations,
 * see supabase-schema.sql in this repository.
 */

// Example configuration object (DO NOT USE IN PRODUCTION)
const exampleConfig = {
  supabaseUrl: 'https://yourproject.supabase.co',
  supabaseAnonKey: 'your-anon-key-here'
};

// You would initialize like this:
// await SupabaseSync.init(exampleConfig.supabaseUrl, exampleConfig.supabaseAnonKey);
