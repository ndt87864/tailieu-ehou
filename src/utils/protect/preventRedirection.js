/**
 * Utility to prevent unwanted URL redirections
 */

// Keep track of the last clean URL without query parameters
let lastCleanUrl = window.location.pathname;

/**
 * Check and clean unwanted query parameters
 */
export const cleanupUrlParams = () => {
  const currentUrl = window.location.href;
  const url = new URL(currentUrl);
  
  // Check for timestamp parameter ?t=
  if (url.searchParams.has('t')) {
    console.log('Detected timestamp parameter, removing...');
    url.searchParams.delete('t');
    
    // Replace URL without reloading page
    window.history.replaceState({}, '', url.toString());
    return true;
  }
  
  return false;
};

/**
 * Monitor and prevent URL manipulation
 */
export const setupUrlMonitoring = () => {
  // Clean any initial URL parameters
  cleanupUrlParams();
  
  // Setup watcher for any URL changes
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  
  // Override history.pushState
  window.history.pushState = function(...args) {
    // Call original function
    originalPushState.apply(this, args);
    
    // Then clean up the URL if needed
    cleanupUrlParams();
  };
  
  // Override history.replaceState
  window.history.replaceState = function(...args) {
    // Call original function
    originalReplaceState.apply(this, args);
    
    // Then clean up the URL if needed
    cleanupUrlParams();
  };
  
  // Setup popstate event listener (for back/forward navigation)
  window.addEventListener('popstate', () => {
    cleanupUrlParams();
  });
};

export default setupUrlMonitoring;
