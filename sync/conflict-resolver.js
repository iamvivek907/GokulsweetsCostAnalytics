// Conflict Resolver Module
// Detects and resolves conflicts in concurrent edits

(function() {
  'use strict';

  window.Sync = window.Sync || {};

  window.Sync.ConflictResolver = {
    /**
     * Detect if there's a version conflict
     */
    detectConflict(localVersion, remoteVersion) {
      return localVersion !== remoteVersion;
    },

    /**
     * Resolve conflict with strategy
     */
    async resolve(strategy, localData, remoteData, tableName, recordId) {
      console.log(`🔄 Resolving conflict using strategy: ${strategy}`);
      
      switch (strategy) {
        case 'use_local':
          return await this.useLocal(localData, tableName, recordId, remoteData.version);
        
        case 'use_remote':
          return this.useRemote(remoteData);
        
        case 'merge':
          return await this.mergeData(localData, remoteData, tableName, recordId);
        
        default:
          throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
      }
    },

    /**
     * Use local version (overwrite remote)
     */
    async useLocal(localData, tableName, recordId, remoteVersion) {
      const moduleN = this.getDBModule(tableName);
      if (!moduleN) {
        throw new Error(`No DB module found for ${tableName}`);
      }
      
      // Force update with remote version
      const result = await moduleN.update(recordId, localData, remoteVersion);
      
      if (window.UI?.Toast) {
        window.UI.Toast.success('✅ Your changes saved');
      }
      
      return result;
    },

    /**
     * Use remote version (discard local)
     */
    useRemote(remoteData) {
      if (window.UI?.Toast) {
        window.UI.Toast.info('✅ Using remote version');
      }
      
      return { data: remoteData, error: null };
    },

    /**
     * Merge local and remote data
     */
    async mergeData(localData, remoteData, tableName, recordId) {
      // Smart merge: combine non-conflicting changes
      const merged = { ...remoteData };
      
      // For each field in local data, check if it differs from remote
      Object.keys(localData).forEach(key => {
        // Skip metadata fields
        if (['id', 'created_at', 'updated_at', 'version', 'organization_id', 'created_by'].includes(key)) {
          return;
        }
        
        // If local value is different from remote, ask user or use smart logic
        if (localData[key] !== remoteData[key]) {
          // For now, prefer local changes for most fields
          // In a real app, you might want to show a UI for field-by-field selection
          merged[key] = localData[key];
        }
      });
      
      // Save merged version
      const moduleName = this.getDBModule(tableName);
      if (!moduleName) {
        throw new Error(`No DB module found for ${tableName}`);
      }
      
      const result = await moduleName.update(recordId, merged, remoteData.version);
      
      if (window.UI?.Toast) {
        window.UI.Toast.success('✅ Changes merged successfully');
      }
      
      return result;
    },

    /**
     * Show conflict resolution UI
     */
    showConflictUI(localData, remoteData, tableName, recordId) {
      if (!window.UI?.ConflictUI) {
        console.error('❌ Conflict UI not available');
        // Fallback: use remote version
        return this.useRemote(remoteData);
      }
      
      return window.UI.ConflictUI.show({
        localData,
        remoteData,
        tableName,
        recordId,
        onResolve: async (strategy) => {
          return await this.resolve(strategy, localData, remoteData, tableName, recordId);
        }
      });
    },

    /**
     * Get DB module for table name
     */
    getDBModule(tableName) {
      // Convert table name to module name (e.g., 'ingredients' -> 'Ingredients')
      const moduleName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
      return window.DB?.[moduleName];
    },

    /**
     * Auto-resolve conflict (last-write-wins with notification)
     */
    autoResolve(localData, remoteData, tableName) {
      // Use remote version (last-write-wins)
      if (window.UI?.Toast) {
        window.UI.Toast.warning(`⚠️ ${tableName} was modified by another user. Using their version.`);
      }
      
      return this.useRemote(remoteData);
    }
  };

  console.log('✅ Sync.ConflictResolver module loaded');
})();
