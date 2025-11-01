import React, { useEffect } from "react";
import { initializeAdSense } from "../../utils/ads/adSenseManager";

const AdSenseScript = () => {
  useEffect(() => {
    // Only load script if it doesn't exist yet
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4282799215996734";

      script.onload = () => {
        // Add a delay before initialization to ensure script is fully loaded
        setTimeout(initializeAdSense, 200);
      };

      document.head.appendChild(script);
    } else {
      // If script already exists, just initialize
      initializeAdSense();
    }

    // Clean up function
    return () => {
      // Nothing to clean up here
    };
  }, []);

  return null; // This component doesn't render anything
};

export default AdSenseScript;
