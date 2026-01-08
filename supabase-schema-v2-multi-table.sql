-- =============================================================================
-- GOKUL SWEETS - PRODUCTION MULTI-TABLE SCHEMA V2
-- =============================================================================
-- Features:
-- ✅ Normalized tables (no JSONB for critical data)
-- ✅ Optimistic locking (version columns)
-- ✅ Audit trail (who changed what when)
-- ✅ Foreign key constraints (referential integrity)
-- ✅ UNIQUE constraints (duplicate prevention)
-- ✅ Indexes for performance
-- ✅ RLS policies for shared workspace security
-- ✅ Triggers for auto-updates
-- =============================================================================

-- =============================================================================
-- TABLE 1: ORGANIZATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  
  -- Settings (can be JSONB since they're configuration)
  shop_overhead JSONB DEFAULT '{
    "electricity": 0,
    "gas": 0,
    "rent": 0,
    "water": 0,
    "maintenance": 0
  }'::jsonb,
  
  factory_overhead JSONB DEFAULT '{
    "electricity": 0,
    "gas": 0,
    "rent": 0,
    "water": 0,
    "maintenance": 0,
    "labor": 0
  }'::jsonb,
  
  profit_margin DECIMAL(5,2) DEFAULT 30.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  CONSTRAINT valid_profit_margin CHECK (profit_margin >= 0 AND profit_margin <= 100)
);

-- Create default organization
INSERT INTO organizations (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'gokul_sweets')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- TABLE 2: ORGANIZATION MEMBERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (user_id, organization_id)
);

-- Trigger: Auto-add first user as owner
CREATE OR REPLACE FUNCTION auto_add_user_to_org()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION auto_add_user_to_org();

-- =============================================================================
-- TABLE 3: INGREDIENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optimistic locking
  version INTEGER DEFAULT 1,
  
  -- Constraints
  CONSTRAINT valid_price CHECK (price_per_unit >= 0),
  CONSTRAINT valid_unit CHECK (unit IN ('kg', 'g', 'L', 'ml', 'pieces', 'dozen', 'packet')),
  
  -- Prevent duplicates (case-insensitive)
  UNIQUE (organization_id, LOWER(name))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_org ON ingredients(organization_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(organization_id, LOWER(name));

-- =============================================================================
-- TABLE 4: RECIPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'sweets', 'snacks', 'beverages', 'other')),
  selling_price DECIMAL(10,2) NOT NULL,
  wastage_percentage DECIMAL(5,2) DEFAULT 0,
  daily_production INTEGER DEFAULT 50,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optimistic locking
  version INTEGER DEFAULT 1,
  
  -- Constraints
  CONSTRAINT valid_selling_price CHECK (selling_price >= 0),
  CONSTRAINT valid_wastage CHECK (wastage_percentage >= 0 AND wastage_percentage <= 100),
  CONSTRAINT valid_production CHECK (daily_production >= 0),
  
  -- Prevent duplicate recipe names
  UNIQUE (organization_id, LOWER(name))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_org ON recipes(organization_id);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(organization_id, LOWER(name));

-- =============================================================================
-- TABLE 5: RECIPE INGREDIENTS (Junction Table)
-- =============================================================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,3) NOT NULL,
  
  PRIMARY KEY (recipe_id, ingredient_id),
  CONSTRAINT valid_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

-- =============================================================================
-- TABLE 6: STAFF
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  -- Constraints
  CONSTRAINT valid_salary CHECK (salary >= 0),
  UNIQUE (organization_id, LOWER(name))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_org ON staff(organization_id);

-- =============================================================================
-- TABLE 7: AUDIT LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  old_data JSONB,
  new_data JSONB,
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);

-- =============================================================================
-- TRIGGERS: AUTO-UPDATE TIMESTAMPS & VERSIONS
-- =============================================================================

-- Function: Update timestamp and increment version
CREATE OR REPLACE FUNCTION update_timestamp_and_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with version column
DROP TRIGGER IF EXISTS update_ingredients_metadata ON ingredients;
CREATE TRIGGER update_ingredients_metadata
BEFORE UPDATE ON ingredients
FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

DROP TRIGGER IF EXISTS update_recipes_metadata ON recipes;
CREATE TRIGGER update_recipes_metadata
BEFORE UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

DROP TRIGGER IF EXISTS update_staff_metadata ON staff;
CREATE TRIGGER update_staff_metadata
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

DROP TRIGGER IF EXISTS update_organizations_metadata ON organizations;
CREATE TRIGGER update_organizations_metadata
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_timestamp_and_version();

-- =============================================================================
-- TRIGGERS: AUDIT LOGGING
-- =============================================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  u_email TEXT;
BEGIN
  -- Get organization_id from record
  IF TG_TABLE_NAME = 'ingredients' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME = 'recipes' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME = 'staff' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  END IF;
  
  -- Get user email
  SELECT email INTO u_email FROM auth.users WHERE id = auth.uid();
  
  -- Insert audit record
  INSERT INTO audit_log (
    organization_id,
    user_id,
    user_email,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  ) VALUES (
    org_id,
    auth.uid(),
    u_email,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
DROP TRIGGER IF EXISTS audit_ingredients ON ingredients;
CREATE TRIGGER audit_ingredients
AFTER INSERT OR UPDATE OR DELETE ON ingredients
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS audit_recipes ON recipes;
CREATE TRIGGER audit_recipes
AFTER INSERT OR UPDATE OR DELETE ON recipes
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS audit_staff ON staff;
CREATE TRIGGER audit_staff
AFTER INSERT OR UPDATE OR DELETE ON staff
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS org_access_organizations ON organizations;
DROP POLICY IF EXISTS org_access_ingredients ON ingredients;
DROP POLICY IF EXISTS org_access_recipes ON recipes;
DROP POLICY IF EXISTS org_access_recipe_ingredients ON recipe_ingredients;
DROP POLICY IF EXISTS org_access_staff ON staff;
DROP POLICY IF EXISTS org_access_audit_log ON audit_log;
DROP POLICY IF EXISTS org_members_access ON organization_members;

-- Policy: Users can access their organization's data
CREATE POLICY org_access_organizations ON organizations
FOR ALL USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY org_access_ingredients ON ingredients
FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY org_access_recipes ON recipes
FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY org_access_recipe_ingredients ON recipe_ingredients
FOR ALL USING (
  recipe_id IN (
    SELECT id FROM recipes WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY org_access_staff ON staff
FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY org_access_audit_log ON audit_log
FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY org_members_access ON organization_members
FOR ALL USING (
  user_id = auth.uid() OR 
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS recipe_details;

-- View: Recipes with full ingredient details
CREATE VIEW recipe_details AS
SELECT 
  r.id,
  r.organization_id,
  r.name,
  r.category,
  r.selling_price,
  r.wastage_percentage,
  r.daily_production,
  r.version,
  r.created_at,
  r.updated_at,
  r.created_by,
  (SELECT email FROM auth.users WHERE id = r.created_by) as created_by_email,
  COALESCE(
    json_agg(
      json_build_object(
        'ingredient_id', i.id,
        'name', i.name,
        'unit', i.unit,
        'price_per_unit', i.price_per_unit,
        'quantity', ri.quantity,
        'cost', ri.quantity * i.price_per_unit
      ) ORDER BY i.name
    ) FILTER (WHERE i.id IS NOT NULL),
    '[]'
  ) as ingredients,
  COALESCE(
    SUM(ri.quantity * i.price_per_unit),
    0
  ) as raw_material_cost
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
GROUP BY r.id;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'organization_members', 'ingredients', 'recipes', 'recipe_ingredients', 'staff', 'audit_log')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'ingredients', 'recipes', 'staff')
ORDER BY tablename;

-- Check default organization exists
SELECT * FROM organizations WHERE name = 'gokul_sweets';
