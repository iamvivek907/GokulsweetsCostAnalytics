// Conflict UI Module
// Visual interface for resolving conflicts

(function() {
  'use strict';

  window.UI = window.UI || {};

  window.UI.ConflictUI = {
    modal: null,

    /**
     * Show conflict resolution modal
     */
    show(options) {
      const { localData, remoteData, tableName, recordId, onResolve } = options;
      
      // Create modal if it doesn't exist
      if (!this.modal) {
        this.createModal();
      }
      
      // Populate modal content
      this.populateModal(localData, remoteData, tableName);
      
      // Show modal
      this.modal.classList.add('active');
      
      // Return promise that resolves when user makes a choice
      return new Promise((resolve) => {
        // Setup button handlers
        const useLocalBtn = document.getElementById('conflict-use-local');
        const useRemoteBtn = document.getElementById('conflict-use-remote');
        const mergeBtn = document.getElementById('conflict-merge');
        const cancelBtn = document.getElementById('conflict-cancel');
        
        const cleanup = () => {
          this.modal.classList.remove('active');
          useLocalBtn.removeEventListener('click', handleUseLocal);
          useRemoteBtn.removeEventListener('click', handleUseRemote);
          mergeBtn.removeEventListener('click', handleMerge);
          cancelBtn.removeEventListener('click', handleCancel);
        };
        
        const handleUseLocal = async () => {
          cleanup();
          const result = await onResolve('use_local');
          resolve(result);
        };
        
        const handleUseRemote = async () => {
          cleanup();
          const result = await onResolve('use_remote');
          resolve(result);
        };
        
        const handleMerge = async () => {
          cleanup();
          const result = await onResolve('merge');
          resolve(result);
        };
        
        const handleCancel = () => {
          cleanup();
          resolve(null);
        };
        
        useLocalBtn.addEventListener('click', handleUseLocal);
        useRemoteBtn.addEventListener('click', handleUseRemote);
        mergeBtn.addEventListener('click', handleMerge);
        cancelBtn.addEventListener('click', handleCancel);
      });
    },

    /**
     * Create conflict modal
     */
    createModal() {
      this.modal = document.createElement('div');
      this.modal.id = 'conflict-modal';
      this.modal.className = 'modal';
      this.modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content" style="max-width: 700px;">
          <div class="modal-header">
            <h2 style="font-size: 18px; margin: 0;">⚠️ Conflict Detected</h2>
          </div>
          <div class="modal-body" id="conflict-modal-body">
            <p style="margin-bottom: 20px; color: var(--color-text-secondary);">
              This item was modified by another user while you were editing. Please choose how to resolve the conflict:
            </p>
            <div id="conflict-comparison" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <!-- Comparison will be injected here -->
            </div>
          </div>
          <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="conflict-cancel" class="btn btn-secondary">Cancel</button>
            <button id="conflict-use-remote" class="btn btn-secondary">Use Their Version</button>
            <button id="conflict-use-local" class="btn btn-primary">Use My Version</button>
            <button id="conflict-merge" class="btn btn-primary">Smart Merge</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(this.modal);
    },

    /**
     * Populate modal with comparison data
     */
    populateModal(localData, remoteData, tableName) {
      const comparisonDiv = document.getElementById('conflict-comparison');
      if (!comparisonDiv) return;
      
      // Get fields to compare (exclude metadata)
      const excludeFields = ['id', 'created_at', 'updated_at', 'version', 'organization_id', 'created_by'];
      const fields = Object.keys(localData).filter(key => !excludeFields.includes(key));
      
      comparisonDiv.innerHTML = `
        <div style="background: var(--color-surface-light); padding: 15px; border-radius: var(--radius);">
          <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--color-primary);">Your Version</h3>
          ${fields.map(field => `
            <div style="margin-bottom: 10px;">
              <div style="font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px;">
                ${field.replace(/_/g, ' ')}
              </div>
              <div style="font-size: 14px; color: var(--color-text);">
                ${this.formatValue(localData[field])}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="background: var(--color-surface-light); padding: 15px; border-radius: var(--radius);">
          <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--color-warning);">Their Version</h3>
          ${fields.map(field => {
            const isDifferent = localData[field] !== remoteData[field];
            return `
              <div style="margin-bottom: 10px; ${isDifferent ? 'border-left: 3px solid var(--color-warning); padding-left: 8px;' : ''}">
                <div style="font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 4px;">
                  ${field.replace(/_/g, ' ')}
                </div>
                <div style="font-size: 14px; color: var(--color-text);">
                  ${this.formatValue(remoteData[field])}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    /**
     * Format value for display
     */
    formatValue(value) {
      if (value === null || value === undefined) return '—';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (Array.isArray(value)) return `[${value.length} items]`;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },

    /**
     * Hide modal
     */
    hide() {
      if (this.modal) {
        this.modal.classList.remove('active');
      }
    }
  };

  console.log('✅ UI.ConflictUI module loaded');
})();
