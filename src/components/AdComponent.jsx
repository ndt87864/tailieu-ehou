import React, { useEffect, useRef } from 'react';
import { refreshAds } from '../utils/adSenseManager';

const AdComponent = ({ format = 'auto', slot = '3086001754', className = '' }) => {
  const adRef = useRef(null);
  const uniqueId = useRef(`ad-${Math.random().toString(36).substring(2, 15)}`);
  
  useEffect(() => {
    if (adRef.current) {
      // Delay to ensure DOM is ready
      setTimeout(refreshAds, 100);
    }
    
    return () => {
      // Clean up if needed
    };
  }, []);

  return (    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4282799215996734"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        id={uniqueId.current}
      />
    </div>
  );
};

export default AdComponent;
