// Staff Database Operations
// Handles CRUD operations for staff members

(function() {
  'use strict';

  window.DB = window.DB || {};

  window.DB.Staff = {
    TABLE_NAME: 'staff',

    /**
     * Create a new staff member
     */
    async create(staffData) {
      const { name, role, salary } = staffData;
      
      // Validate required fields
      if (!name || !role || salary === undefined) {
        throw new Error('Name, role, and salary are required');
      }
      
      // Check for duplicate name (case-insensitive)
      const isDuplicate = await window.DB.Base.checkDuplicate(this.TABLE_NAME, name);
      if (isDuplicate) {
        const error = new Error(`Staff member "${name}" already exists`);
        error.code = 'DUPLICATE';
        error.field = 'name';
        throw error;
      }
      
      // Create staff member
      const result = await window.DB.Base.create(this.TABLE_NAME, {
        name: name.trim(),
        role: role.trim(),
        salary: parseFloat(salary)
      });
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`✅ Staff member "${name}" added`, 'success');
      }
      
      return result;
    },

    /**
     * Get staff member by ID
     */
    async getById(id) {
      return await window.DB.Base.getById(this.TABLE_NAME, id);
    },

    /**
     * List all staff members
     */
    async list() {
      return await window.DB.Base.list(this.TABLE_NAME);
    },

    /**
     * Update a staff member
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
          const error = new Error(`Staff member "${updates.name}" already exists`);
          error.code = 'DUPLICATE';
          error.field = 'name';
          throw error;
        }
        updates.name = updates.name.trim();
      }
      
      // Parse numeric fields
      if (updates.role) {
        updates.role = updates.role.trim();
      }
      if (updates.salary !== undefined) {
        updates.salary = parseFloat(updates.salary);
      }
      
      const result = await window.DB.Base.update(
        this.TABLE_NAME, 
        id, 
        updates, 
        expectedVersion
      );
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`✅ Staff member updated`, 'success');
      }
      
      return result;
    },

    /**
     * Delete a staff member
     */
    async delete(id) {
      const result = await window.DB.Base.delete(this.TABLE_NAME, id);
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`🗑️ Staff member deleted`, 'success');
      }
      
      return result;
    },

    /**
     * Get total payroll
     */
    async getTotalPayroll() {
      const { data, error } = await this.list();
      if (error) throw error;
      
      const total = data.reduce((sum, staff) => sum + parseFloat(staff.salary), 0);
      return { total, count: data.length };
    },

    /**
     * Search staff by name
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

  console.log('✅ DB.Staff module loaded');
})();
