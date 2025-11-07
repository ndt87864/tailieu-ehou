/**
 * Utility functions to handle domain redirection and URL handling
 */

// Firebase domains that should redirect to custom domain
const FIREBASE_DOMAINS = [
  'tailieu-89ca9.web.app',
  'tailieuehou.web.app',
  'tailieuehou.firebaseapp.com'
];

// The target custom domain
const CUSTOM_DOMAIN = 'tailieuehou.id.vn';

/**
 * Redirect from Firebase domains to custom domain
 * @returns {boolean} True if redirect was performed
 */
export const redirectToCustomDomain = () => {
  const hostname = window.location.hostname;
  
  // if (FIREBASE_DOMAINS.includes(hostname) && hostname !== CUSTOM_DOMAIN) {
  //   // Use window.location.replace for cleaner redirects (no entry in browser history)
  //   window.location.replace(`https://${CUSTOM_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`);
  //   return true; // Redirect was performed
  // }
  
  return false; // No redirect needed
};

/**
 * Get the base URL for the current domain
 * @returns {string} Base URL for current domain
 */
export const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // If in development mode
  if (import.meta.env.DEV) {
    return '';
  }
  
  // If we're on the custom domain
  if (hostname === CUSTOM_DOMAIN) {
    return '';
  }
  
  // For any other domain
  return '';
};

/**
 * Convert a relative URL to an absolute URL for the current domain
 * @param {string} path - The relative path
 * @returns {string} The absolute URL
 */
export const getAbsoluteUrl = (path) => {
  if (path.startsWith('http')) return path;
  
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${base}${cleanPath}`;
};

/**
 * Check if the current domain is the custom domain
 * @returns {boolean} True if current domain is the custom domain
 */
// export const isCustomDomain = () => {
//   if (typeof window === 'undefined') return false;
  
//   return window.location.hostname === CUSTOM_DOMAIN;
// };
