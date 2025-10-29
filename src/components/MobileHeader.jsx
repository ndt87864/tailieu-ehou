import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme, THEME_COLORS } from '../context/ThemeContext';
import { useUserRole } from '../context/UserRoleContext';
import { useSidebar } from '../context/SidebarContext';
import { auth } from '../firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const ThemeColorPicker = ({ isOpen, onClose, isDarkMode }) => {
  const { themeColor, changeThemeColor, toggleDarkMode, THEME_COLORS } = useTheme();
  const [user] = useAuthState(auth);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const pickerRef = useRef(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle theme color change with status indicator
  const handleThemeColorChange = async (color) => {
    if (user) {
      setSaveStatus('saving');
      try {
        await changeThemeColor(color);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (error) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } else {
      // Just change locally if not logged in
      changeThemeColor(color);
    }
  };

  // Handle dark mode toggle with status indicator
  const handleDarkModeToggle = async () => {
    if (user) {
      setSaveStatus('saving');
      try {
        await toggleDarkMode();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (error) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } else {
      // Just toggle locally if not logged in
      toggleDarkMode();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div 
        ref={pickerRef}
        className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-xl p-4 max-w-sm w-[90%] mx-auto border-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
        style={{ backdropFilter: 'blur(0px)', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Tùy chỉnh giao diện</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Save status indicator */}
        {saveStatus && (
          <div className={`mb-4 p-2 text-sm rounded-md ${
            saveStatus === 'saving' 
              ? isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
              : saveStatus === 'saved'
                ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
                : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
          }`}>
            {saveStatus === 'saving' && 'Đang lưu cài đặt...'}
            {saveStatus === 'saved' && 'Đã lưu cài đặt thành công'}
            {saveStatus === 'error' && 'Lỗi khi lưu cài đặt'}
          </div>
        )}
        
        {/* Chế độ sáng/tối */}
        <div className="mb-5 border-b pb-4">
          <h4 className="text-sm font-medium mb-3">Chế độ sáng/tối</h4>
          <button 
            onClick={handleDarkModeToggle}
            className={`w-full flex items-center justify-between p-3 rounded-md 
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200'
            } transition-colors`}
          >
            <div className="flex items-center">
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              <span>{isDarkMode ? 'Chế độ tối' : 'Chế độ sáng'}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              isDarkMode 
                ? 'bg-gray-600 text-gray-300' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {isDarkMode ? 'Đang bật' : 'Đang bật'}
            </span>
          </button>
        </div>
        
        {/* Màu chủ đề */}
        <div>
          <h4 className="text-sm font-medium mb-3">Màu chủ đề</h4>
          <p className={`mb-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Chọn màu chủ đề cho ứng dụng
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            {/* Màu mặc định */}
            <div 
              className={`theme-color-option theme-color-default ${themeColor === THEME_COLORS.DEFAULT ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.DEFAULT)}
              title="Mặc định"
            ></div>
            
            {/* Màu xanh */}
            <div 
              className={`theme-color-option theme-color-blue ${themeColor === THEME_COLORS.BLUE ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.BLUE)}
              title="Xanh dương"
            ></div>
            
            {/* Màu đỏ */}
            <div 
              className={`theme-color-option theme-color-red ${themeColor === THEME_COLORS.RED ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.RED)}
              title="Đỏ"
            ></div>
            
            {/* Màu tím */}
            <div 
              className={`theme-color-option theme-color-purple ${themeColor === THEME_COLORS.PURPLE ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.PURPLE)}
              title="Tím"
            ></div>
            
            {/* Màu vàng */}
            <div 
              className={`theme-color-option theme-color-yellow ${themeColor === THEME_COLORS.YELLOW ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.YELLOW)}
              title="Vàng"
            ></div>
            
            {/* Màu nâu */}
            <div 
              className={`theme-color-option theme-color-brown ${themeColor === THEME_COLORS.BROWN ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.BROWN)}
              title="Nâu"
            ></div>
            
            {/* Màu đen */}
            <div 
              className={`theme-color-option theme-color-black ${themeColor === THEME_COLORS.BLACK ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.BLACK)}
              title="Đen"
            ></div>
            
            {/* Màu trắng */}
            <div 
              className={`theme-color-option theme-color-white ${themeColor === THEME_COLORS.WHITE ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.WHITE)}
              title="Trắng"
            ></div>
          </div>
        </div>
        
        <div className={`p-3 rounded-md text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
          <p className="mb-2">
            <strong>Lưu ý:</strong> Thay đổi màu chủ đề sẽ chỉ có hiệu lực khi ở chế độ sáng.
          </p>
          {user ? (
            <p className="text-xs">Cài đặt của bạn sẽ được lưu và đồng bộ trên tất cả thiết bị.</p>
          ) : (
            <p className="text-xs">Đăng nhập để lưu cài đặt giao diện của bạn.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Utility function to get consistent header/sidebar background color
const getConsistentThemeColor = (isDarkMode, themeColor) => {
  if (isDarkMode) {
    return 'bg-gray-800'; // Unified dark mode color
  } else {
    switch (themeColor) {
      case THEME_COLORS.DEFAULT:
        return 'bg-green-600';
      case THEME_COLORS.BLUE:
        return 'bg-blue-600';
      case THEME_COLORS.RED:
        return 'bg-red-600';
      case THEME_COLORS.PURPLE:
        return 'bg-purple-600';
      case THEME_COLORS.YELLOW:
        return 'bg-yellow-600'; // Fixed yellow color
      case THEME_COLORS.BROWN:
        return 'bg-amber-700'; // Fixed brown color
      case THEME_COLORS.BLACK:
        return 'bg-gray-800';
      case THEME_COLORS.WHITE:
        return 'bg-gray-100'; // Lightened to match sidebar
      default:
        return 'bg-green-600';
    }
  }
};

// FIXED: Create a new common function to get consistent header colors
// This function must return the EXACT same colors used in the sidebar
const getMobileHeaderThemeColor = (isDarkMode, themeColor) => {
  if (isDarkMode) {
    return 'bg-gray-800'; // Always dark gray in dark mode
  }
  
  switch (themeColor) {
    case THEME_COLORS.DEFAULT:
      return 'theme-color-default'; // Using exact hex color #118d05 for default theme
    case THEME_COLORS.BLUE:
      return 'bg-blue-600';
    case THEME_COLORS.RED:
      return 'bg-red-600';
    case THEME_COLORS.PURPLE:
      return 'bg-purple-600';
    case THEME_COLORS.YELLOW:
      return 'bg-yellow-600'; // Fixed yellow color
    case THEME_COLORS.BROWN:
      return 'bg-amber-600'; // Fixed brown color
    case THEME_COLORS.BLACK:
      return 'bg-gray-900';
    case THEME_COLORS.WHITE:
      return 'bg-gray-100';
    default:
      return 'theme-color-default'; // Default also uses the exact hex color
  }
};

// NEW: Utility function to determine text color based on theme
const getHeaderTextColor = (isDarkMode, themeColor) => {
  if (isDarkMode) {
    return 'text-white';
  } else {
    // Use black text for white and brown themes, white text for all others
    switch (themeColor) {
      case THEME_COLORS.WHITE:
      case THEME_COLORS.BROWN:
        return 'text-black';
      default:
        return 'text-white';
    }
  }
};

export const HomeMobileHeader = ({ title }) => {
  const { isDarkMode, toggleDarkMode, themeColor } = useTheme();
  const { isAdmin } = useUserRole();
  const { showSidebar } = useSidebar();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    auth.signOut();
    setIsDropdownOpen(false);
  };

  const handleAccountClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };
  
  const handleThemeClick = () => {
    setIsDropdownOpen(false);
    setIsThemePickerOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);  

  // Use the consistent theme color function
  const headerBgColor = getMobileHeaderThemeColor(isDarkMode, themeColor);
  const headerTextColor = getHeaderTextColor(isDarkMode, themeColor);

  return (
    <header className={`${headerBgColor} ${headerTextColor} px-4 py-3 flex items-center justify-between shadow-md`}>
      <div className="flex items-center gap-2">
        <div className="p-1">
          <svg className={`w-5 h-5 ${headerTextColor}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
          </svg>
        </div>
        <span className="font-medium">{title || 'Tài liệu HOU'}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Nút tùy chỉnh giao diện luôn hiển thị */}
        <button
          onClick={() => setIsThemePickerOpen(true)}
          className={`${headerTextColor} p-1 rounded-full hover:bg-black/10 transition-colors`}
          aria-label="Tùy chỉnh giao diện"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </button>
        
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`${headerTextColor} px-2 py-1 rounded-full hover:bg-black/10 transition-colors flex items-center gap-1`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{user.displayName ? user.displayName.split(' ')[0] : 'Tài khoản'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div 
                className={`absolute right-0 mt-2 w-48 py-1 rounded-md shadow-lg z-10 border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                style={{ backdropFilter: 'blur(0px)', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
              >
                <button
                  onClick={handleAccountClick}
                  className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Tài khoản của tôi
                </button>
                
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className={`${headerTextColor} px-2 py-1 rounded-full hover:bg-black/10 transition-colors flex items-center gap-1`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Đăng nhập</span>
          </button>
        )}
      </div>
      <ThemeColorPicker 
        isOpen={isThemePickerOpen} 
        onClose={() => setIsThemePickerOpen(false)} 
        isDarkMode={isDarkMode} 
      />
    </header>
  );
};

export const DocumentMobileHeader = ({ 
  selectedCategory, 
  selectedDocument, 
  setIsSidebarOpen 
}) => {
  const { isDarkMode, toggleDarkMode, themeColor } = useTheme();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  const handleAccountClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };
  
  const handleThemeClick = () => {
    setIsDropdownOpen(false);
    setIsThemePickerOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); 

  // Use the consistent theme color function
  const headerBgColor = getMobileHeaderThemeColor(isDarkMode, themeColor);
  const headerTextColor = getHeaderTextColor(isDarkMode, themeColor);

  return (
    <header className={`${headerBgColor} ${headerTextColor} px-4 py-3 flex flex-col shadow-md sticky top-0 z-10`}>
      <div className="flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <div className="p-1 flex-shrink-0">
            <svg className={`w-5 h-5 ${headerTextColor}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
            </svg>
          </div>
          <span className="font-medium truncate max-w-[140px]">
            {selectedCategory?.title || 'Tài liệu HOU'}
          </span>
        </Link>
        
        <div className="flex items-center">
          {/* Theme customization button */}
          <button
            onClick={() => setIsThemePickerOpen(true)}
            className={`p-2 rounded-full hover:bg-black/10 transition-colors`}
            aria-label="Tùy chỉnh giao diện"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`${headerTextColor} h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
          
          {/* User dropdown or login button */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`${headerTextColor} px-2 py-1 rounded-full hover:bg-black/10 transition-colors flex items-center gap-1 mr-2`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="text-sm max-w-[80px] truncate">{user.displayName ? user.displayName.split(' ')[0] : 'Tài khoản'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              {/* User dropdown menu - improved positioning and styling */}
              {isDropdownOpen && (
                <div 
                  className={`absolute right-0 mt-2 w-48 py-1 rounded-md shadow-lg z-20 border ${
                    isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  <button
                    onClick={handleAccountClick}
                    className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Tài khoản của tôi
                  </button>
                  
                  <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} my-1`}></div>
                  
                  <button
                    onClick={handleLogout}
                    className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className={`${headerTextColor} px-2 py-1 rounded-full hover:bg-black/10 transition-colors flex items-center gap-1 mr-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Đăng nhập</span>
            </button>
          )}
          
          {/* Menu toggle button */}
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className={`${headerTextColor} flex-shrink-0 p-2 rounded-full hover:bg-black/10 transition-colors`}
            aria-label="Mở menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Document title with improved truncation */}
      {selectedDocument && (
        <div className={`ml-7 mt-1 text-sm ${headerTextColor} opacity-90 truncate max-w-full pr-8`}>
          {selectedDocument?.title}
        </div>
      )}
      
      {/* Theme picker */}
      <ThemeColorPicker 
        isOpen={isThemePickerOpen} 
        onClose={() => setIsThemePickerOpen(false)} 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    </header>
  );
};

export default {
  HomeMobileHeader,
  DocumentMobileHeader
};