// Base Database Operations Module
// Provides CRUD operations with retry logic, error handling, and data persistence

(function() {
  'use strict';

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000; // Start with 1 second
  const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

  window.DB = window.DB || {};

  window.DB.Base = {
    /**
     * Execute a database operation with retry logic and exponential backoff
     */
    async executeWithRetry(operation, operationName = 'Database operation') {
      let lastError = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`🔄 ${operationName} (attempt ${attempt}/${MAX_RETRIES})`);
          const result = await operation();
          
          if (result.error) {
            throw result.error;
          }
          
          console.log(`✅ ${operationName} succeeded`);
          return result;
        } catch (error) {
          lastError = error;
          console.error(`❌ ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}):`, error);
          
          // Don't retry on certain errors
          if (this.isNonRetryableError(error)) {
            console.log('⚠️ Non-retryable error, aborting');
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }
      
      // All retries failed
      console.error(`❌ ${operationName} failed after ${MAX_RETRIES} attempts`);
      throw lastError;
    },

    /**
     * Check if an error should not be retried
     */
    isNonRetryableError(error) {
      if (!error) return false;
      
      const nonRetryableCodes = [
        '23505', // unique_violation
        '23503', // foreign_key_violation
        '23502', // not_null_violation
        '23514', // check_violation
        '42P01', // undefined_table
        '42703', // undefined_column
        'PGRST204', // No rows found (not really an error for some cases)
      ];
      
      return nonRetryableCodes.includes(error.code);
    },

    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Get the current organization ID
     */
    getOrganizationId() {
      // For now, always use default org
      // Future: Support multiple organizations
      return DEFAULT_ORG_ID;
    },

    /**
     * Get Supabase client
     */
    getClient() {
      if (!window.SupabaseSync || !window.SupabaseSync.client) {
        throw new Error('Supabase client not initialized');
      }
      return window.SupabaseSync.client;
    },

    /**
     * Get current user
     */
    getCurrentUser() {
      if (!window.Auth || !window.Auth.currentUser) {
        throw new Error('User not authenticated');
      }
      return window.Auth.currentUser;
    },

    /**
     * Check if name is duplicate (case-insensitive)
     */
    async checkDuplicate(tableName, name, excludeId = null) {
      const client = this.getClient();
      const orgId = this.getOrganizationId();
      
      let query = client
        .from(tableName)
        .select('id, name')
        .eq('organization_id', orgId)
        .ilike('name', name);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data !== null;
    },

    /**
     * Generic CREATE operation
     */
    async create(tableName, data) {
      const client = this.getClient();
      const user = this.getCurrentUser();
      const orgId = this.getOrganizationId();
      
      // Add organization_id and created_by
      const recordData = {
        ...data,
        organization_id: orgId,
        created_by: user.id
      };
      
      return await this.executeWithRetry(
        async () => {
          const { data: result, error } = await client
            .from(tableName)
            .insert(recordData)
            .select()
            .single();
          
          if (error) throw error;
          return { data: result, error: null };
        },
        `Create ${tableName}`
      );
    },

    /**
     * Generic READ operation (single record)
     */
    async getById(tableName, id) {
      const client = this.getClient();
      const orgId = this.getOrganizationId();
      
      return await this.executeWithRetry(
        async () => {
          const { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();
          
          if (error) throw error;
          return { data, error: null };
        },
        `Get ${tableName} by ID`
      );
    },

    /**
     * Generic LIST operation
     */
    async list(tableName, filters = {}) {
      const client = this.getClient();
      const orgId = this.getOrganizationId();
      
      return await this.executeWithRetry(
        async () => {
          let query = client
            .from(tableName)
            .select('*')
            .eq('organization_id', orgId);
          
          // Apply additional filters
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          
          // Order by created_at descending
          query = query.order('created_at', { ascending: false });
          
          const { data, error } = await query;
          
          if (error) throw error;
          return { data: data || [], error: null };
        },
        `List ${tableName}`
      );
    },

    /**
     * Generic UPDATE operation with optimistic locking
     */
    async update(tableName, id, data, expectedVersion = null) {
      const client = this.getClient();
      const orgId = this.getOrganizationId();
      
      return await this.executeWithRetry(
        async () => {
          // If version is provided, check for conflicts
          if (expectedVersion !== null) {
            const { data: current } = await client
              .from(tableName)
              .select('version')
              .eq('id', id)
              .eq('organization_id', orgId)
              .single();
            
            if (current && current.version !== expectedVersion) {
              const error = new Error('Version conflict detected');
              error.code = 'VERSION_CONFLICT';
              error.expectedVersion = expectedVersion;
              error.currentVersion = current.version;
              throw error;
            }
          }
          
          // Perform update
          const { data: result, error } = await client
            .from(tableName)
            .update(data)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();
          
          if (error) throw error;
          return { data: result, error: null };
        },
        `Update ${tableName}`
      );
    },

    /**
     * Generic DELETE operation
     */
    async delete(tableName, id) {
      const client = this.getClient();
      const orgId = this.getOrganizationId();
      
      return await this.executeWithRetry(
        async () => {
          const { data, error } = await client
            .from(tableName)
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();
          
          if (error) throw error;
          return { data, error: null };
        },
        `Delete ${tableName}`
      );
    },

    /**
     * Execute in transaction (Supabase RPC wrapper)
     */
    async executeTransaction(operations) {
      // Note: Supabase doesn't directly support transactions from client
      // This is a sequential execution with rollback on failure
      const results = [];
      const rollbackOps = [];
      
      try {
        for (const op of operations) {
          const result = await op.execute();
          results.push(result);
          
          if (op.rollback) {
            rollbackOps.push(op.rollback);
          }
        }
        
        return { success: true, results };
      } catch (error) {
        console.error('❌ Transaction failed, attempting rollback:', error);
        
        // Attempt rollback in reverse order
        for (let i = rollbackOps.length - 1; i >= 0; i--) {
          try {
            await rollbackOps[i]();
          } catch (rollbackError) {
            console.error('❌ Rollback operation failed:', rollbackError);
          }
        }
        
        throw error;
      }
    }
  };

  console.log('✅ DB.Base module loaded');
})();
