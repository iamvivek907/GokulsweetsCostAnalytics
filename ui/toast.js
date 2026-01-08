// Toast Notification System
// Displays user-friendly notifications for various events

(function() {
  'use strict';

  window.UI = window.UI || {};

  // Toast container styles
  const TOAST_CONTAINER_STYLES = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
    pointer-events: none;
  `;

  const TOAST_STYLES = `
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
    min-width: 300px;
  `;

  window.UI.Toast = {
    container: null,
    toasts: [],

    /**
     * Initialize toast container
     */
    init() {
      if (this.container) return;
      
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = TOAST_CONTAINER_STYLES;
      document.body.appendChild(this.container);
      
      // Add animation styles
      if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(400px);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    },

    /**
     * Show a toast notification
     */
    show(message, type = 'info', duration = 4000) {
      this.init();
      
      const toast = document.createElement('div');
      toast.style.cssText = TOAST_STYLES;
      
      // Set border color based on type
      const colors = {
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-primary)'
      };
      toast.style.borderLeftColor = colors[type] || colors.info;
      toast.style.borderLeftWidth = '4px';
      
      // Icon based on type
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      
      toast.innerHTML = `
        <span style="font-size: 20px;">${icons[type] || icons.info}</span>
        <span style="flex: 1; color: var(--color-text); font-size: 14px;">${this.escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--color-text-secondary); cursor: pointer; font-size: 18px; padding: 0; margin-left: 10px;">×</button>
      `;
      
      this.container.appendChild(toast);
      this.toasts.push(toast);
      
      // Auto-remove after duration
      setTimeout(() => {
        this.remove(toast);
      }, duration);
      
      return toast;
    },

    /**
     * Show success toast
     */
    success(message, duration) {
      return this.show(message, 'success', duration);
    },

    /**
     * Show error toast
     */
    error(message, duration) {
      return this.show(message, 'error', duration);
    },

    /**
     * Show warning toast
     */
    warning(message, duration) {
      return this.show(message, 'warning', duration);
    },

    /**
     * Show info toast
     */
    info(message, duration) {
      return this.show(message, 'info', duration);
    },

    /**
     * Remove a toast
     */
    remove(toast) {
      if (!toast || !toast.parentElement) return;
      
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
        const index = this.toasts.indexOf(toast);
        if (index > -1) {
          this.toasts.splice(index, 1);
        }
      }, 300);
    },

    /**
     * Clear all toasts
     */
    clearAll() {
      this.toasts.forEach(toast => this.remove(toast));
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  console.log('✅ UI.Toast module loaded');
})();
