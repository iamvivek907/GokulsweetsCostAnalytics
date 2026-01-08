// Audit Log Database Operations
// Query and view audit trail for changes

(function() {
  'use strict';

  window.DB = window.DB || {};

  window.DB.Audit = {
    TABLE_NAME: 'audit_log',

    /**
     * Get recent audit logs
     */
    async getRecent(limit = 50) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('organization_id', orgId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    },

    /**
     * Get audit logs for a specific record
     */
    async getByRecordId(tableName, recordId) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('organization_id', orgId)
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return { data: data || [], error: null };
    },

    /**
     * Get audit logs by user
     */
    async getByUser(userId, limit = 50) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    },

    /**
     * Get audit logs by table
     */
    async getByTable(tableName, limit = 50) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('organization_id', orgId)
        .eq('table_name', tableName)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    },

    /**
     * Get audit logs for a time range
     */
    async getByTimeRange(startDate, endDate, limit = 100) {
      const client = window.DB.Base.getClient();
      const orgId = window.DB.Base.getOrganizationId();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('organization_id', orgId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data: data || [], error: null };
    }
  };

  console.log('✅ DB.Audit module loaded');
})();
