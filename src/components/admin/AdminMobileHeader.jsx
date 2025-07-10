import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const AdminMobileHeader = ({ title, setIsSidebarOpen, setIsThemePickerOpen }) => {
  const { isDarkMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-30 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white'} border-b px-4 py-3 flex items-center justify-between ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            aria-label="Mở menu"
          >
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-2 text-lg font-medium">{title}</h1>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={() => setIsThemePickerOpen(true)}
            className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            aria-label="Thay đổi giao diện"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        </div>
        {isMenuOpen && (
          <div className={`absolute top-full right-0 mt-2 w-48 rounded-md shadow-lg ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
            {/* ...menu items... */}
          </div>
        )}
      </header>
      
      <div className="h-14"></div>
    </>
  );
};

export default AdminMobileHeader;
