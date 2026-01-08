-- =====================================================================
-- SUPABASE SHARED WORKSPACE MIGRATION
-- Transforms per-user isolation to organization-wide shared workspace
-- =====================================================================

-- Step 1: Drop existing per-user RLS policies
DROP POLICY IF EXISTS "Users can insert their own data" ON gokul_app_data;
DROP POLICY IF EXISTS "Users can update their own data" ON gokul_app_data;
DROP POLICY IF EXISTS "Users can view their own data" ON gokul_app_data;
DROP POLICY IF EXISTS "Users can delete their own data" ON gokul_app_data;

-- Step 2: Create organization-based RLS policies
-- All authenticated users in the same organization can access shared data

-- Allow insert for authenticated users (creates shared org record)
CREATE POLICY "Organization members can insert shared data"
ON gokul_app_data
FOR INSERT
TO authenticated
WITH CHECK (organization_id = 'gokul_sweets');

-- Allow update for authenticated users (modifies shared org record)
CREATE POLICY "Organization members can update shared data"
ON gokul_app_data
FOR UPDATE
TO authenticated
USING (organization_id = 'gokul_sweets')
WITH CHECK (organization_id = 'gokul_sweets');

-- Allow select for authenticated users (reads shared org record)
CREATE POLICY "Organization members can view shared data"
ON gokul_app_data
FOR SELECT
TO authenticated
USING (organization_id = 'gokul_sweets');

-- Allow delete for authenticated users (removes shared org record)
CREATE POLICY "Organization members can delete shared data"
ON gokul_app_data
FOR DELETE
TO authenticated
USING (organization_id = 'gokul_sweets');

-- Step 3: Merge existing user data into one shared record
-- This combines all user recipes, ingredients, and staff into single shared record

DO $$
DECLARE
    merged_payload JSONB;
    merged_ingredients JSONB := '{}';
    merged_recipes JSONB := '{}';
    merged_staff JSONB := '{}';
    user_record RECORD;
    migration_user_id UUID;
BEGIN
    -- Get first user_id for audit trail before deletion
    SELECT user_id INTO migration_user_id 
    FROM gokul_app_data 
    WHERE organization_id = 'gokul_sweets' 
      AND user_id IS NOT NULL
    LIMIT 1;

    -- Combine all ingredients from all users
    FOR user_record IN 
        SELECT payload->'ingredients' as ingredients 
        FROM gokul_app_data 
        WHERE organization_id = 'gokul_sweets' 
          AND payload->'ingredients' IS NOT NULL
    LOOP
        merged_ingredients := merged_ingredients || user_record.ingredients;
    END LOOP;

    -- Combine all recipes from all users
    FOR user_record IN 
        SELECT payload->'recipes' as recipes 
        FROM gokul_app_data 
        WHERE organization_id = 'gokul_sweets' 
          AND payload->'recipes' IS NOT NULL
    LOOP
        merged_recipes := merged_recipes || user_record.recipes;
    END LOOP;

    -- Combine all staff from all users
    FOR user_record IN 
        SELECT payload->'staff' as staff 
        FROM gokul_app_data 
        WHERE organization_id = 'gokul_sweets' 
          AND payload->'staff' IS NOT NULL
    LOOP
        merged_staff := merged_staff || user_record.staff;
    END LOOP;

    -- Create merged payload
    merged_payload := jsonb_build_object(
        'ingredients', merged_ingredients,
        'recipes', merged_recipes,
        'staff', merged_staff
    );

    -- Delete all existing user-specific records
    DELETE FROM gokul_app_data WHERE organization_id = 'gokul_sweets';

    -- Insert single shared record with preserved user_id for audit
    INSERT INTO gokul_app_data (
        organization_id,
        device_id,
        user_id,
        payload,
        updated_at
    ) VALUES (
        'gokul_sweets',
        'shared_workspace',
        migration_user_id,  -- Preserve one user_id for audit trail
        merged_payload,
        NOW()
    );

    RAISE NOTICE 'Migration completed: Merged data into shared workspace';
    RAISE NOTICE 'Audit trail user_id: %', migration_user_id;
END $$;

-- Step 4: Verification queries
-- Run these to verify the migration succeeded

-- Should return exactly 1 row with merged data
SELECT 
    organization_id,
    device_id,
    user_id,
    jsonb_array_length(jsonb_object_keys(payload->'ingredients')) as ingredient_keys_sample,
    jsonb_array_length(jsonb_object_keys(payload->'recipes')) as recipe_keys_sample,
    jsonb_array_length(jsonb_object_keys(payload->'staff')) as staff_keys_sample,
    updated_at
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets';

-- Count total entities in shared workspace
SELECT 
    organization_id,
    COUNT(*) as total_records,
    jsonb_object_keys(payload->'ingredients') as ingredient_sample_keys,
    jsonb_object_keys(payload->'recipes') as recipe_sample_keys,
    jsonb_object_keys(payload->'staff') as staff_sample_keys
FROM gokul_app_data 
WHERE organization_id = 'gokul_sweets'
GROUP BY organization_id, payload;

-- Verify RLS policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'gokul_app_data' 
ORDER BY policyname;
