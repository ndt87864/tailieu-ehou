import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useUserRole } from '../context/UserRoleContext';

const ZaloContact = () => {
  const { isDarkMode } = useTheme();
  const { isAdmin } = useUserRole();
  const [visible, setVisible] = useState(true);
  const location = useLocation();
  
  // Reset visibility when page changes
  useEffect(() => {
    setVisible(true);
  }, [location.pathname]);
  
  // Don't render for admin users
  if (isAdmin) return null;

  // Don't render on the editor page to avoid overlay during editing
  if (typeof window !== 'undefined' && location && location.pathname && location.pathname.startsWith('/editor')) {
    return null;
  }

  if (!visible) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <div className={`flex items-center p-2 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-2`}>
        <a 
          href="https://zalo.me/0915918742" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center"
          aria-label="Liên hệ qua Zalo"
        >
          {/* Zalo Logo from Google Play Store */}
          <div className="rounded-full overflow-hidden w-10 h-10 mr-2 flex-shrink-0">
            <img 
              src="https://play-lh.googleusercontent.com/rFIOt4fDSCgJh_FkHU2qP8YiZUUhfVoKoNfQFbPEM-Wl8zuyuwn7vzkEx_XMh5B6FfO3=w480-h960-rw" 
              alt="Zalo logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </a>
        {/* Close button */}
        <button 
          onClick={() => setVisible(false)} 
          className={`ml-2 p-1 rounded-full hover:bg-gray-200 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500'}`}
          aria-label="Đóng"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ZaloContact;
