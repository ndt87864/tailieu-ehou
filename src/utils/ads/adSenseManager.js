/**
 * Properly manage AdSense initialization to avoid duplicate ads error
 */

// Flag to track if initialization has been attempted
let initializing = false;
let initialized = false;

// Store existing ad elements to avoid duplicates
const processedAds = new Set();

/**
 * Initialize AdSense once
 */
export const initializeAdSense = () => {
  if (initializing || initialized) return;
  initializing = true;
  
  try {    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({
      google_ad_client: "ca-pub-4282799215996734",
      enable_page_level_ads: true
    });
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize AdSense:', error);
  } finally {
    initializing = false;
  }
};

/**
 * Process ad elements that haven't been processed yet
 */
export const refreshAds = () => {
  if (!window.adsbygoogle) return;
  
  try {
    // Get all ad elements that haven't been initialized
    const adElements = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status="done"])');
    
    if (adElements.length === 0) return;
    
    adElements.forEach(ad => {
      // Check if we've already processed this element
      if (processedAds.has(ad)) return;
      
      // Mark as processed to avoid duplicate pushes
      processedAds.add(ad);
      
      // Clear any existing attributes
      if (ad.hasAttribute('data-adsbygoogle-status')) {
        ad.removeAttribute('data-adsbygoogle-status');
      }
      
      // Push new ad
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn('Failed to push ad:', error);
      }
    });
  } catch (error) {
    console.error('Error refreshing ads:', error);
  }
};

export default {
  initializeAdSense,
  refreshAds
};
