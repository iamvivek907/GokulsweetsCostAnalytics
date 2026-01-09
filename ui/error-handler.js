// Error Handler Module
// Converts technical errors to user-friendly messages

(function() {
  'use strict';

  window.UI = window.UI || {};

  window.UI.ErrorHandler = {
    /**
     * Convert error to user-friendly message
     */
    getUserMessage(error) {
      if (!error) return 'An unknown error occurred';
      
      // Check if error already has a user message
      if (error.userMessage) return error.userMessage;
      
      // Handle specific error codes
      switch (error.code) {
        case 'DUPLICATE':
          return `${error.message}. Would you like to edit the existing one instead?`;
        
        case '23505': // PostgreSQL unique violation
          return this.parseDuplicateError(error);
        
        case '23503': // PostgreSQL foreign key violation
          return 'This item cannot be deleted because it is being used elsewhere. Please remove all references first.';
        
        case '23502': // PostgreSQL not null violation
          return 'Required field is missing. Please fill in all required fields.';
        
        case '23514': // PostgreSQL check constraint violation
          return 'Invalid value provided. Please check your input and try again.';
        
        case 'VERSION_CONFLICT':
          return `This item was modified by another user. Current version: ${error.currentVersion}, Expected: ${error.expectedVersion}. Please reload and try again.`;
        
        case 'PGRST116': // PostgREST no rows returned
          return 'Item not found. It may have been deleted.';
        
        case 'PGRST301': // PostgREST JWT expired
        case '401':
          return 'Your session has expired. Please log in again.';
        
        case '403':
          return 'You do not have permission to perform this action.';
        
        case '404':
          return 'The requested item was not found.';
        
        case '500':
        case 'PGRST500':
          return 'A server error occurred. Please try again in a moment.';
        
        case 'NETWORK_ERROR':
        case 'NetworkError':
          return 'Network connection lost. Please check your internet connection and try again.';
        
        default:
          // Return the error message if it's already user-friendly
          if (error.message && error.message.length < 100 && !error.message.includes('stack')) {
            return error.message;
          }
          return 'An unexpected error occurred. Please try again.';
      }
    },

    /**
     * Parse PostgreSQL duplicate error
     */
    parseDuplicateError(error) {
      const message = error.message || '';
      
      // Extract field name from error message
      const match = message.match(/Key \(([^)]+)\)/);
      if (match) {
        const field = match[1].replace('lower', '').replace(/[()]/g, '').trim();
        return `A ${field} with this name already exists. Please use a different name.`;
      }
      
      return 'This item already exists. Please use a different name.';
    },

    /**
     * Show error to user with toast
     */
    show(error, context = '') {
      const message = this.getUserMessage(error);
      const fullMessage = context ? `${context}: ${message}` : message;
      
      console.error('Error displayed to user:', {
        context,
        originalError: error,
        userMessage: message
      });
      
      if (window.UI && window.UI.Toast) {
        window.UI.Toast.error(fullMessage, 6000);
      } else {
        alert(fullMessage);
      }
    },

    /**
     * Handle error with optional retry callback
     */
    async handleError(error, context, retryCallback = null) {
      this.show(error, context);
      
      // If retry is available and error is retryable, offer retry
      if (retryCallback && this.isRetryable(error)) {
        // Could show a retry button in toast (future enhancement)
        return { retry: retryCallback };
      }
      
      return { retry: null };
    },

    /**
     * Check if error is retryable
     */
    isRetryable(error) {
      if (!error) return false;
      
      const retryableCodes = [
        'NETWORK_ERROR',
        'NetworkError',
        '500',
        'PGRST500',
        '503',
        '504'
      ];
      
      return retryableCodes.includes(error.code) || 
             error.message?.includes('network') ||
             error.message?.includes('timeout');
    },

    /**
     * Wrap async operation with error handling
     */
    async withErrorHandling(operation, context) {
      try {
        return await operation();
      } catch (error) {
        this.show(error, context);
        throw error;
      }
    }
  };

  console.log('✅ UI.ErrorHandler module loaded');
})();
