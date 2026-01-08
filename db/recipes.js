// Recipes Database Operations
// Handles CRUD operations for recipes with transaction support for ingredients

(function() {
  'use strict';

  window.DB = window.DB || {};

  window.DB.Recipes = {
    TABLE_NAME: 'recipes',
    JUNCTION_TABLE: 'recipe_ingredients',

    /**
     * Create a new recipe with ingredients
     */
    async create(recipeData) {
      const { name, category, selling_price, wastage_percentage, daily_production, ingredients } = recipeData;
      
      // Validate required fields
      if (!name || !category || selling_price === undefined) {
        throw new Error('Name, category, and selling_price are required');
      }
      
      // Check for duplicate name (case-insensitive)
      const isDuplicate = await window.DB.Base.checkDuplicate(this.TABLE_NAME, name);
      if (isDuplicate) {
        const error = new Error(`Recipe "${name}" already exists`);
        error.code = 'DUPLICATE';
        error.field = 'name';
        throw error;
      }
      
      const client = window.DB.Base.getClient();
      const user = window.DB.Base.getCurrentUser();
      const orgId = window.DB.Base.getOrganizationId();
      
      // Create recipe (transaction-like behavior)
      let createdRecipe = null;
      
      try {
        // Step 1: Create recipe
        const { data: recipe, error: recipeError } = await client
          .from(this.TABLE_NAME)
          .insert({
            name: name.trim(),
            category,
            selling_price: parseFloat(selling_price),
            wastage_percentage: parseFloat(wastage_percentage || 0),
            daily_production: parseInt(daily_production || 50),
            organization_id: orgId,
            created_by: user.id
          })
          .select()
          .single();
        
        if (recipeError) throw recipeError;
        createdRecipe = recipe;
        
        // Step 2: Add ingredients if provided
        if (ingredients && ingredients.length > 0) {
          const ingredientRecords = ingredients.map(ing => ({
            recipe_id: recipe.id,
            ingredient_id: ing.ingredient_id,
            quantity: parseFloat(ing.quantity)
          }));
          
          const { error: ingredientsError } = await client
            .from(this.JUNCTION_TABLE)
            .insert(ingredientRecords);
          
          if (ingredientsError) {
            // Rollback: Delete the recipe
            await client
              .from(this.TABLE_NAME)
              .delete()
              .eq('id', recipe.id);
            throw ingredientsError;
          }
        }
        
        // Show success toast
        if (window.UI && window.UI.Toast) {
          window.UI.Toast.show(`✅ Recipe "${name}" created`, 'success');
        }
        
        return { data: createdRecipe, error: null };
      } catch (error) {
        console.error('❌ Recipe creation failed:', error);
        throw error;
      }
    },

    /**
     * Get recipe by ID with ingredients
     */
    async getById(id) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      // Get recipe
      const { data: recipe, error: recipeError } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();
      
      if (recipeError) throw recipeError;
      
      // Get ingredients
      const { data: ingredients, error: ingredientsError } = await client
        .from(this.JUNCTION_TABLE)
        .select(`
          quantity,
          ingredient:ingredients(*)
        `)
        .eq('recipe_id', id);
      
      if (ingredientsError) throw ingredientsError;
      
      // Format response
      recipe.ingredients = ingredients.map(item => ({
        ...item.ingredient,
        quantity: item.quantity
      }));
      
      return { data: recipe, error: null };
    },

    /**
     * List all recipes with ingredient summary
     */
    async list() {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from('recipe_details')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data: data || [], error: null };
    },

    /**
     * Update a recipe
     */
    async update(id, updates, expectedVersion = null) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      // If name is being updated, check for duplicates
      if (updates.name) {
        const isDuplicate = await window.DB.Base.checkDuplicate(
          this.TABLE_NAME, 
          updates.name, 
          id
        );
        if (isDuplicate) {
          const error = new Error(`Recipe "${updates.name}" already exists`);
          error.code = 'DUPLICATE';
          error.field = 'name';
          throw error;
        }
        updates.name = updates.name.trim();
      }
      
      // Parse numeric fields
      if (updates.selling_price !== undefined) {
        updates.selling_price = parseFloat(updates.selling_price);
      }
      if (updates.wastage_percentage !== undefined) {
        updates.wastage_percentage = parseFloat(updates.wastage_percentage);
      }
      if (updates.daily_production !== undefined) {
        updates.daily_production = parseInt(updates.daily_production);
      }
      
      // Handle ingredients update separately
      const ingredientsUpdate = updates.ingredients;
      delete updates.ingredients;
      
      try {
        // Update recipe metadata
        const result = await window.DB.Base.update(
          this.TABLE_NAME, 
          id, 
          updates, 
          expectedVersion
        );
        
        // Update ingredients if provided
        if (ingredientsUpdate !== undefined) {
          // Delete existing ingredients
          await client
            .from(this.JUNCTION_TABLE)
            .delete()
            .eq('recipe_id', id);
          
          // Add new ingredients
          if (ingredientsUpdate.length > 0) {
            const ingredientRecords = ingredientsUpdate.map(ing => ({
              recipe_id: id,
              ingredient_id: ing.ingredient_id,
              quantity: parseFloat(ing.quantity)
            }));
            
            await client
              .from(this.JUNCTION_TABLE)
              .insert(ingredientRecords);
          }
        }
        
        // Show success toast
        if (window.UI && window.UI.Toast) {
          window.UI.Toast.show(`✅ Recipe updated`, 'success');
        }
        
        return result;
      } catch (error) {
        console.error('❌ Recipe update failed:', error);
        throw error;
      }
    },

    /**
     * Delete a recipe
     */
    async delete(id) {
      const result = await window.DB.Base.delete(this.TABLE_NAME, id);
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`🗑️ Recipe deleted`, 'success');
      }
      
      return result;
    },

    /**
     * Get recipes by category
     */
    async getByCategory(category) {
      return await window.DB.Base.list(this.TABLE_NAME, { category });
    },

    /**
     * Search recipes by name
     */
    async search(searchTerm) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('organization_id', orgId)
        .ilike('name', `%${searchTerm}%`)
        .order('name');
      
      if (error) throw error;
      return { data: data || [], error: null };
    }
  };

  console.log('✅ DB.Recipes module loaded');
})();
