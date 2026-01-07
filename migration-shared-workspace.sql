-- Migration: Convert from per-user isolation to shared workspace model
-- Purpose: Enable real-time collaboration for all users in Gokul Sweets organization
-- Date: 2026-01-07

-- Step 1: Add organization_id column
ALTER TABLE gokul_app_data 
ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'gokul_sweets';

-- Step 2: Create index for faster organization-based queries
CREATE INDEX IF NOT EXISTS idx_gokul_app_data_org 
ON gokul_app_data(organization_id);

-- Step 3: Drop old user-specific policies
DROP POLICY IF EXISTS "users_select_own_data" ON gokul_app_data;
DROP POLICY IF EXISTS "users_insert_own_data" ON gokul_app_data;
DROP POLICY IF EXISTS "users_update_own_data" ON gokul_app_data;
DROP POLICY IF EXISTS "users_delete_own_data" ON gokul_app_data;

-- Backward compatibility: Drop old policy names if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON gokul_app_data;
DROP POLICY IF EXISTS "Users can insert their own data" ON gokul_app_data;
DROP POLICY IF EXISTS "Users can update their own data" ON gokul_app_data;
DROP POLICY IF EXISTS "Users can delete their own data" ON gokul_app_data;

-- Step 4: Create new shared workspace policies
-- All authenticated users can view organization data
CREATE POLICY "All authenticated users can view organization data"
ON gokul_app_data FOR SELECT
TO authenticated
USING (organization_id = 'gokul_sweets');

-- All authenticated users can insert organization data
CREATE POLICY "All authenticated users can insert organization data"
ON gokul_app_data FOR INSERT
TO authenticated
WITH CHECK (organization_id = 'gokul_sweets');

-- All authenticated users can update organization data
CREATE POLICY "All authenticated users can update organization data"
ON gokul_app_data FOR UPDATE
TO authenticated
USING (organization_id = 'gokul_sweets')
WITH CHECK (organization_id = 'gokul_sweets');

-- All authenticated users can delete organization data
CREATE POLICY "All authenticated users can delete organization data"
ON gokul_app_data FOR DELETE
TO authenticated
USING (organization_id = 'gokul_sweets');

-- Step 5: Update unique constraint to organization-based
-- Drop old constraint (handle both possible names)
ALTER TABLE gokul_app_data 
DROP CONSTRAINT IF EXISTS gokul_app_data_user_device_unique;

ALTER TABLE gokul_app_data 
DROP CONSTRAINT IF EXISTS gokul_app_data_user_id_device_id_key;

-- Add new organization-based unique constraint
-- Only one record per organization (shared workspace)
ALTER TABLE gokul_app_data 
ADD CONSTRAINT gokul_app_data_org_unique 
UNIQUE (organization_id);

-- Step 6: Migrate existing data to shared model
-- Set organization_id for any existing records
UPDATE gokul_app_data 
SET organization_id = 'gokul_sweets'
WHERE organization_id IS NULL;

-- Step 7: Enable Realtime for the table
-- This ensures clients can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE gokul_app_data;

-- Verification queries (optional - run to verify migration)
-- SELECT COUNT(*) as total_records, organization_id FROM gokul_app_data GROUP BY organization_id;
-- SELECT * FROM pg_policies WHERE tablename = 'gokul_app_data';
