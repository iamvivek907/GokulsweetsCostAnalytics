// Ingredients Database Operations
// Handles CRUD operations for ingredients with duplicate prevention

(function() {
  'use strict';

  window.DB = window.DB || {};

  window.DB.Ingredients = {
    TABLE_NAME: 'ingredients',

    /**
     * Create a new ingredient
     */
    async create(ingredientData) {
      const { name, unit, price_per_unit } = ingredientData;
      
      // Validate required fields
      if (!name || !unit || price_per_unit === undefined) {
        throw new Error('Name, unit, and price_per_unit are required');
      }
      
      // Check for duplicate name (case-insensitive)
      const isDuplicate = await window.DB.Base.checkDuplicate(this.TABLE_NAME, name);
      if (isDuplicate) {
        const error = new Error(`Ingredient "${name}" already exists`);
        error.code = 'DUPLICATE';
        error.field = 'name';
        throw error;
      }
      
      // Create ingredient
      const result = await window.DB.Base.create(this.TABLE_NAME, {
        name: name.trim(),
        unit,
        price_per_unit: parseFloat(price_per_unit)
      });
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`✅ Ingredient "${name}" added`, 'success');
      }
      
      return result;
    },

    /**
     * Get ingredient by ID
     */
    async getById(id) {
      return await window.DB.Base.getById(this.TABLE_NAME, id);
    },

    /**
     * List all ingredients
     */
    async list() {
      return await window.DB.Base.list(this.TABLE_NAME);
    },

    /**
     * Update an ingredient
     */
    async update(id, updates, expectedVersion = null) {
      // If name is being updated, check for duplicates
      if (updates.name) {
        const isDuplicate = await window.DB.Base.checkDuplicate(
          this.TABLE_NAME, 
          updates.name, 
          id
        );
        if (isDuplicate) {
          const error = new Error(`Ingredient "${updates.name}" already exists`);
          error.code = 'DUPLICATE';
          error.field = 'name';
          throw error;
        }
        updates.name = updates.name.trim();
      }
      
      // Parse numeric fields
      if (updates.price_per_unit !== undefined) {
        updates.price_per_unit = parseFloat(updates.price_per_unit);
      }
      
      const result = await window.DB.Base.update(
        this.TABLE_NAME, 
        id, 
        updates, 
        expectedVersion
      );
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`✅ Ingredient updated`, 'success');
      }
      
      return result;
    },

    /**
     * Delete an ingredient
     */
    async delete(id) {
      try {
        const result = await window.DB.Base.delete(this.TABLE_NAME, id);
        
        // Show success toast
        if (window.UI && window.UI.Toast) {
          window.UI.Toast.show(`🗑️ Ingredient deleted`, 'success');
        }
        
        return result;
      } catch (error) {
        // Check if deletion failed due to foreign key constraint
        if (error.code === '23503') {
          error.message = 'Cannot delete ingredient. It is used in one or more recipes.';
          error.userMessage = 'This ingredient is being used in recipes. Please remove it from all recipes first.';
        }
        throw error;
      }
    },

    /**
     * Search ingredients by name
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

  console.log('✅ DB.Ingredients module loaded');
})();
