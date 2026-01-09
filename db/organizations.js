// Organizations Database Operations
// Handles organization settings and overhead costs

(function() {
  'use strict';

  window.DB = window.DB || {};

  window.DB.Organizations = {
    TABLE_NAME: 'organizations',
    DEFAULT_ORG_ID: '00000000-0000-0000-0000-000000000001',

    /**
     * Get organization settings
     */
    async get() {
      const client = window.DB.Base.getClient();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', this.DEFAULT_ORG_ID)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    },

    /**
     * Update organization settings
     */
    async updateSettings(updates) {
      const client = window.DB.Base.getClient();
      
      const { data, error } = await client
        .from(this.TABLE_NAME)
        .update(updates)
        .eq('id', this.DEFAULT_ORG_ID)
        .select()
        .single();
      
      if (error) throw error;
      
      // Show success toast
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.show(`✅ Settings updated`, 'success');
      }
      
      return { data, error: null };
    },

    /**
     * Update shop overhead costs
     */
    async updateShopOverhead(overhead) {
      return await this.updateSettings({
        shop_overhead: overhead
      });
    },

    /**
     * Update factory overhead costs
     */
    async updateFactoryOverhead(overhead) {
      return await this.updateSettings({
        factory_overhead: overhead
      });
    },

    /**
     * Update profit margin
     */
    async updateProfitMargin(margin) {
      const marginValue = parseFloat(margin);
      
      if (marginValue < 0 || marginValue > 100) {
        throw new Error('Profit margin must be between 0 and 100');
      }
      
      return await this.updateSettings({
        profit_margin: marginValue
      });
    }
  };

  console.log('✅ DB.Organizations module loaded');
})();
