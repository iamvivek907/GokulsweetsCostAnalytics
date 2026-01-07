-- =============================================================================
-- CORRECT SCHEMA FOR GOKUL SWEETS COST ANALYTICS
-- =============================================================================
-- This schema supports:
-- ✅ Multi-user authentication with Row Level Security
-- ✅ Shared organization workspace (all users see same data)
-- ✅ Device sync across multiple devices per user
-- ✅ Real-time collaboration
-- ✅ Data isolation per organization
-- =============================================================================

-- Drop existing table if it has wrong schema
-- IMPORTANT: Backup your data first!
-- SELECT * FROM gokul_app_data;  -- Export this first!
-- DROP TABLE IF EXISTS gokul_app_data CASCADE;

CREATE TABLE IF NOT EXISTS gokul_app_data (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User authentication (foreign key to Supabase auth)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Device identifier for multi-device sync
  device_id TEXT NOT NULL,
  
  -- Organization/workspace identifier (shared across all users)
  organization_id TEXT DEFAULT 'gokul_sweets' NOT NULL,
  
  -- All app data stored as JSONB
  payload JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per device per organization
  UNIQUE(user_id, device_id, organization_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for looking up user's data
CREATE INDEX IF NOT EXISTS idx_gokul_user_id 
ON gokul_app_data(user_id);

-- Index for organization queries (shared workspace)
CREATE INDEX IF NOT EXISTS idx_gokul_org_id 
ON gokul_app_data(organization_id);

-- Composite index for user + org queries
CREATE INDEX IF NOT EXISTS idx_gokul_user_org 
ON gokul_app_data(user_id, organization_id);

-- Index for device sync
CREATE INDEX IF NOT EXISTS idx_gokul_device_id 
ON gokul_app_data(device_id);

-- Index for ordering by update time
CREATE INDEX IF NOT EXISTS idx_gokul_updated_at 
ON gokul_app_data(updated_at DESC);

-- =============================================================================
-- AUTO-UPDATE TIMESTAMP
-- =============================================================================

CREATE OR REPLACE FUNCTION update_gokul_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gokul_updated_at ON gokul_app_data;

CREATE TRIGGER trigger_update_gokul_updated_at
BEFORE UPDATE ON gokul_app_data
FOR EACH ROW
EXECUTE FUNCTION update_gokul_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE gokul_app_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "users_select_own" ON gokul_app_data;
DROP POLICY IF EXISTS "users_insert_own" ON gokul_app_data;
DROP POLICY IF EXISTS "users_update_own" ON gokul_app_data;
DROP POLICY IF EXISTS "users_delete_own" ON gokul_app_data;
DROP POLICY IF EXISTS "dev_allow_all" ON gokul_app_data;

-- Policy: Users can only SELECT their own data
CREATE POLICY "users_select_own"
ON gokul_app_data
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own data
CREATE POLICY "users_insert_own"
ON gokul_app_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own data
CREATE POLICY "users_update_own"
ON gokul_app_data
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own data
CREATE POLICY "users_delete_own"
ON gokul_app_data
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if table was created correctly
-- Run this after creating the table:
/*
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'gokul_app_data'
ORDER BY ordinal_position;

-- Expected output:
-- id              | uuid      | NO  | gen_random_uuid()
-- user_id         | uuid      | NO  | NULL
-- device_id       | text      | NO  | NULL
-- organization_id | text      | NO  | 'gokul_sweets'
-- payload         | jsonb     | NO  | NULL
-- created_at      | timestamp | YES | now()
-- updated_at      | timestamp | YES | now()
*/

-- Check if RLS is enabled
/*
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'gokul_app_data';

-- Expected: rowsecurity = true
*/

-- Check policies
/*
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'gokul_app_data';

-- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE
*/

-- =============================================================================
-- TROUBLESHOOTING
-- =============================================================================

/*
If you get errors like "column organization_id does not exist":

1. Your existing table has the wrong schema
2. Back up your data:
   SELECT * FROM gokul_app_data;  -- Copy this!
   
3. Drop and recreate:
   DROP TABLE gokul_app_data CASCADE;
   -- Then run this entire script again
   
4. Re-import your data (see bulk import feature in app)

If you get RLS errors like "new row violates row-level security policy":

1. Check if you're logged in:
   SELECT auth.uid();  -- Should return your user UUID
   
2. Check if your user_id matches:
   SELECT user_id, payload FROM gokul_app_data 
   WHERE organization_id = 'gokul_sweets';
*/
