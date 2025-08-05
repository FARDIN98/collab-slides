/**
 * Centralized error handling utility
 * Provides consistent error logging and user-friendly error messages
 */

export const logError = (context, error) => {
  // Only log in development environment
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]:`, error)
  }
  
  // In production, you might want to send errors to a logging service
  // Example: sendToLoggingService(context, error)
}

export const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

export const handleAsyncError = (context) => (error) => {
  logError(context, error)
  throw error
}