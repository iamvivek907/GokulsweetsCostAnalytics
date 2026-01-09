// Save Indicator Module
// Visual feedback for save operations

(function() {
  'use strict';

  window.UI = window.UI || {};

  window.UI.SaveIndicator = {
    indicator: null,
    timeout: null,

    /**
     * Initialize save indicator
     */
    init() {
      if (this.indicator) return;
      
      this.indicator = document.createElement('div');
      this.indicator.id = 'save-indicator';
      this.indicator.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        padding: 8px 16px;
        border-radius: var(--radius);
        font-size: 13px;
        font-weight: 600;
        z-index: 9999;
        display: none;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
      `;
      
      document.body.appendChild(this.indicator);
    },

    /**
     * Show save indicator with status
     */
    show(status, duration = 2000) {
      this.init();
      
      // Clear existing timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      
      // Set content based on status
      switch (status) {
        case 'saving':
          this.indicator.style.background = 'var(--color-primary)';
          this.indicator.style.color = '#fff';
          this.indicator.innerHTML = `
            <div class="spinning">⏳</div>
            <span>Saving...</span>
          `;
          this.indicator.style.display = 'flex';
          // Don't auto-hide for saving
          return;
        
        case 'success':
          this.indicator.style.background = 'var(--color-success)';
          this.indicator.style.color = '#fff';
          this.indicator.innerHTML = `
            <span>✅</span>
            <span>Saved</span>
          `;
          this.indicator.style.display = 'flex';
          break;
        
        case 'error':
          this.indicator.style.background = 'var(--color-error)';
          this.indicator.style.color = '#fff';
          this.indicator.innerHTML = `
            <span>❌</span>
            <span>Save failed</span>
          `;
          this.indicator.style.display = 'flex';
          break;
        
        default:
          this.hide();
          return;
      }
      
      // Auto-hide after duration
      this.timeout = setTimeout(() => this.hide(), duration);
    },

    /**
     * Hide save indicator
     */
    hide() {
      if (this.indicator) {
        this.indicator.style.display = 'none';
      }
    }
  };

  console.log('✅ UI.SaveIndicator module loaded');
})();
