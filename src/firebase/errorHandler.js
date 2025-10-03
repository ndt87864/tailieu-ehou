/**
 * Firebase Error Handler and Connection Manager
 * Xử lý các lỗi Firestore và quản lý kết nối
 */

import { enableNetwork, disableNetwork, terminate, clearIndexedDbPersistence, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';

// Error codes that require retry
const RETRYABLE_ERROR_CODES = [
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'cancelled',
  'unknown'
];

// Network status tracking
let isNetworkEnabled = true;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 5;

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  if (!error || !error.code) return false;
  return RETRYABLE_ERROR_CODES.includes(error.code);
};

/**
 * Handle Firestore network errors and reconnection
 */
export const handleFirestoreError = async (error) => {
  console.warn('Firestore error detected:', error);
  
  if (!error || !error.code) return false;
  
  // Handle specific error cases
  switch (error.code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'cancelled':
      return await reconnectFirestore();
      
    case 'resource-exhausted':
      console.warn('Firestore quota exceeded, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
      
    case 'permission-denied':
    case 'unauthenticated':
      console.error('Authentication/permission error:', error.message);
      return false;
      
    case 'failed-precondition':
    case 'invalid-argument':
      console.error('Invalid operation:', error.message);
      return false;
      
    default:
      if (isRetryableError(error)) {
        return await reconnectFirestore();
      }
      return false;
  }
};

/**
 * Reconnect Firestore connection
 */
export const reconnectFirestore = async () => {
  if (connectionRetries >= MAX_CONNECTION_RETRIES) {
    console.error('Max connection retries reached');
    return false;
  }
  
  connectionRetries++;
  console.log(`Attempting Firestore reconnection (${connectionRetries}/${MAX_CONNECTION_RETRIES})`);
  
  try {
    if (isNetworkEnabled) {
      await disableNetwork(db);
      isNetworkEnabled = false;
    }
    
    // Wait before reconnecting
    const delay = Math.min(1000 * Math.pow(2, connectionRetries - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await enableNetwork(db);
    isNetworkEnabled = true;
    
    console.log('Firestore reconnection successful');
    connectionRetries = 0;
    return true;
    
  } catch (reconnectError) {
    console.error('Firestore reconnection failed:', reconnectError);
    return false;
  }
};

/**
 * Clear Firestore cache and restart connection
 */
export const clearFirestoreCache = async () => {
  try {
    console.log('Clearing Firestore cache...');
    
    if (isNetworkEnabled) {
      await disableNetwork(db);
      isNetworkEnabled = false;
    }
    
    await terminate(db);
    
    try {
      await clearIndexedDbPersistence(db);
      console.log('IndexedDB persistence cleared');
    } catch (clearError) {
      console.warn('Could not clear IndexedDB:', clearError);
    }
    
    await enableNetwork(db);
    isNetworkEnabled = true;
    
    console.log('Firestore cache cleared and connection restored');
    return true;
    
  } catch (error) {
    console.error('Failed to clear Firestore cache:', error);
    return false;
  }
};

/**
 * Enhanced retry mechanism with error handling
 */
export const retryFirestoreOperationWithErrorHandling = async (operation, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Firestore operation attempt ${attempt}/${maxRetries}`);
      return await operation();
      
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error);
      
      // Check if we should retry
      const shouldRetry = isRetryableError(error);
      
      if (!shouldRetry || attempt === maxRetries) {
        console.error(`Operation failed after ${attempt} attempts:`, error);
        throw error;
      }
      
      // Try to handle the error and reconnect
      const recovered = await handleFirestoreError(error);
      
      if (!recovered && attempt < maxRetries) {
        console.log('Recovery failed, but will try again...');
      }
      
      // Wait before next attempt with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Monitor Firestore connection health
 */
export const monitorFirestoreConnection = () => {
  let connectionHealthy = true;
  
  const checkConnection = async () => {
    try {
      // Simple health check - try to read from a lightweight collection
      const testQuery = doc(db, 'health-check', 'test');
      await getDoc(testQuery);
      
      if (!connectionHealthy) {
        console.log('Firestore connection restored');
        connectionHealthy = true;
        connectionRetries = 0;
      }
      
    } catch (error) {
      if (connectionHealthy) {
        console.warn('Firestore connection issues detected');
        connectionHealthy = false;
      }
      
      await handleFirestoreError(error);
    }
  };
  
  // Check connection every 30 seconds
  setInterval(checkConnection, 30000);
  
  return checkConnection;
};

/**
 * Get current connection status
 */
export const getFirestoreConnectionStatus = () => {
  return {
    isNetworkEnabled,
    connectionRetries,
    maxRetries: MAX_CONNECTION_RETRIES
  };
};