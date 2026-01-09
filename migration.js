// Data Migration Utility
// Migrates data from old JSONB format to new multi-table schema

(function() {
  'use strict';

  window.Migration = {
    /**
     * Check if migration is needed
     */
    async needsMigration() {
      // Check if we have old localStorage data
      const hasOldData = localStorage.getItem('restaurant_recipes') || 
                         localStorage.getItem('restaurant_ingredients') ||
                         localStorage.getItem('restaurant_staff');
      
      if (!hasOldData) {
        console.log('ℹ️ No old data found, migration not needed');
        return false;
      }
      
      // Check if new tables have data
      try {
        const ingredientsResult = await window.DB.Ingredients.list();
        const recipesResult = await window.DB.Recipes.list();
        const staffResult = await window.DB.Staff.list();
        
        const hasNewData = 
          ingredientsResult.data.length > 0 ||
          recipesResult.data.length > 0 ||
          staffResult.data.length > 0;
        
        if (hasNewData) {
          console.log('ℹ️ New tables already have data, migration not needed');
          return false;
        }
        
        console.log('✅ Migration needed - old data exists, new tables empty');
        return true;
      } catch (error) {
        console.error('❌ Error checking migration status:', error);
        return false;
      }
    },

    /**
     * Perform migration
     */
    async migrate() {
      console.log('🔄 Starting data migration...');
      
      if (window.UI?.Toast) {
        window.UI.Toast.info('🔄 Migrating your data to new format...', 10000);
      }
      
      const results = {
        ingredients: { success: 0, failed: 0, errors: [] },
        recipes: { success: 0, failed: 0, errors: [] },
        staff: { success: 0, failed: 0, errors: [] }
      };
      
      try {
        // Migrate ingredients
        await this.migrateIngredients(results.ingredients);
        
        // Migrate staff
        await this.migrateStaff(results.staff);
        
        // Migrate recipes (must be after ingredients)
        await this.migrateRecipes(results.recipes);
        
        // Migrate settings
        await this.migrateSettings();
        
        // Show results
        console.log('✅ Migration complete:', results);
        
        const totalSuccess = results.ingredients.success + results.recipes.success + results.staff.success;
        const totalFailed = results.ingredients.failed + results.recipes.failed + results.staff.failed;
        
        if (window.UI?.Toast) {
          if (totalFailed === 0) {
            window.UI.Toast.success(`✅ Migration complete! ${totalSuccess} items migrated`, 5000);
          } else {
            window.UI.Toast.warning(`⚠️ Migration completed with ${totalFailed} errors. ${totalSuccess} items migrated.`, 8000);
          }
        }
        
        return results;
      } catch (error) {
        console.error('❌ Migration failed:', error);
        
        if (window.UI?.Toast) {
          window.UI.Toast.error('❌ Migration failed. Your data is safe in local storage.', 8000);
        }
        
        throw error;
      }
    },

    /**
     * Migrate ingredients
     */
    async migrateIngredients(results) {
      const oldData = localStorage.getItem('restaurant_ingredients');
      if (!oldData) return;
      
      const ingredients = JSON.parse(oldData);
      const ingredientIds = Object.keys(ingredients);
      
      console.log(`📦 Migrating ${ingredientIds.length} ingredients...`);
      
      for (const id of ingredientIds) {
        const ingredient = ingredients[id];
        
        try {
          await window.DB.Ingredients.create({
            name: ingredient.name,
            unit: ingredient.unit,
            price_per_unit: ingredient.pricePerUnit || ingredient.price_per_unit || 0
          });
          results.success++;
        } catch (error) {
          console.error(`❌ Failed to migrate ingredient ${ingredient.name}:`, error);
          results.failed++;
          results.errors.push({ ingredient, error: error.message });
        }
      }
      
      console.log(`✅ Ingredients migrated: ${results.success} success, ${results.failed} failed`);
    },

    /**
     * Migrate staff
     */
    async migrateStaff(results) {
      const oldData = localStorage.getItem('restaurant_staff');
      if (!oldData) return;
      
      const staff = JSON.parse(oldData);
      const staffIds = Object.keys(staff);
      
      console.log(`📦 Migrating ${staffIds.length} staff members...`);
      
      for (const id of staffIds) {
        const member = staff[id];
        
        try {
          await window.DB.Staff.create({
            name: member.name,
            role: member.department || member.role || 'Staff',
            salary: member.salary || 0
          });
          results.success++;
        } catch (error) {
          console.error(`❌ Failed to migrate staff ${member.name}:`, error);
          results.failed++;
          results.errors.push({ staff: member, error: error.message });
        }
      }
      
      console.log(`✅ Staff migrated: ${results.success} success, ${results.failed} failed`);
    },

    /**
     * Migrate recipes
     */
    async migrateRecipes(results) {
      const oldData = localStorage.getItem('restaurant_recipes');
      if (!oldData) return;
      
      const recipes = JSON.parse(oldData);
      const recipeIds = Object.keys(recipes);
      
      console.log(`📦 Migrating ${recipeIds.length} recipes...`);
      
      // Get all ingredients to map old IDs to new IDs
      const ingredientsResult = await window.DB.Ingredients.list();
      const ingredientMap = {};
      ingredientsResult.data.forEach(ing => {
        ingredientMap[ing.name.toLowerCase()] = ing.id;
      });
      
      for (const id of recipeIds) {
        const recipe = recipes[id];
        
        try {
          // Map ingredients from old format to new format
          const ingredients = [];
          if (recipe.ingredients) {
            Object.entries(recipe.ingredients).forEach(([oldIngId, quantity]) => {
              // Try to find ingredient by name (stored in old data)
              // This is a best-effort mapping
              const ingName = recipe.ingredientNames?.[oldIngId];
              if (ingName) {
                const newIngId = ingredientMap[ingName.toLowerCase()];
                if (newIngId) {
                  ingredients.push({
                    ingredient_id: newIngId,
                    quantity: quantity
                  });
                }
              }
            });
          }
          
          await window.DB.Recipes.create({
            name: recipe.name,
            category: recipe.category || 'other',
            selling_price: recipe.sellingPrice || recipe.selling_price || 0,
            wastage_percentage: recipe.wastagePercent || recipe.wastage_percentage || 0,
            daily_production: recipe.dailyProduction || recipe.daily_production || 50,
            ingredients: ingredients
          });
          results.success++;
        } catch (error) {
          console.error(`❌ Failed to migrate recipe ${recipe.name}:`, error);
          results.failed++;
          results.errors.push({ recipe, error: error.message });
        }
      }
      
      console.log(`✅ Recipes migrated: ${results.success} success, ${results.failed} failed`);
    },

    /**
     * Migrate settings (overhead, profit margin)
     */
    async migrateSettings() {
      console.log('📦 Migrating settings...');
      
      const updates = {};
      
      // Migrate shop overhead
      const shopOverhead = localStorage.getItem('restaurant_shop_overhead');
      if (shopOverhead) {
        try {
          updates.shop_overhead = JSON.parse(shopOverhead);
        } catch (error) {
          console.error('❌ Failed to parse shop overhead:', error);
        }
      }
      
      // Migrate factory overhead
      const factoryOverhead = localStorage.getItem('restaurant_factory_overhead');
      if (factoryOverhead) {
        try {
          updates.factory_overhead = JSON.parse(factoryOverhead);
        } catch (error) {
          console.error('❌ Failed to parse factory overhead:', error);
        }
      }
      
      // Migrate profit margin
      const profitMargin = localStorage.getItem('restaurant_profitMargin');
      if (profitMargin) {
        try {
          updates.profit_margin = parseFloat(profitMargin);
        } catch (error) {
          console.error('❌ Failed to parse profit margin:', error);
        }
      }
      
      // Save settings if any were found
      if (Object.keys(updates).length > 0) {
        try {
          await window.DB.Organizations.updateSettings(updates);
          console.log('✅ Settings migrated');
        } catch (error) {
          console.error('❌ Failed to migrate settings:', error);
        }
      }
    },

    /**
     * Backup old data before migration
     */
    backupOldData() {
      const backup = {
        ingredients: localStorage.getItem('restaurant_ingredients'),
        recipes: localStorage.getItem('restaurant_recipes'),
        staff: localStorage.getItem('restaurant_staff'),
        shop_overhead: localStorage.getItem('restaurant_shop_overhead'),
        factory_overhead: localStorage.getItem('restaurant_factory_overhead'),
        profitMargin: localStorage.getItem('restaurant_profitMargin'),
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('migration_backup', JSON.stringify(backup));
      console.log('✅ Old data backed up to localStorage.migration_backup');
      
      return backup;
    }
  };

  console.log('✅ Migration utility loaded');
})();
