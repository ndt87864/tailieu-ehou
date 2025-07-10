import React, { useRef, useEffect, useState } from 'react';
import { useTheme, THEME_COLORS } from '../context/ThemeContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebase';

const ThemeColorPicker = ({ isOpen, onClose }) => {
  const { isDarkMode, themeColor, changeThemeColor, toggleDarkMode, THEME_COLORS } = useTheme();
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
    setSaveStatus('saving');
    try {
      await changeThemeColor(color);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving theme color:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Handle dark mode toggle with status indicator
  const handleDarkModeToggle = async () => {
    setSaveStatus('saving');
    try {
      await toggleDarkMode();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
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
            className={`w-full flex items-center justify-between p-3 rounded-md ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
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
            {/* Màu mặc định - cập nhật lớp CSS để phản ánh màu xanh emerald mới */}
            <div 
              className={`theme-color-option theme-emerald ${themeColor === THEME_COLORS.DEFAULT ? 'active' : ''}`}
              onClick={() => handleThemeColorChange(THEME_COLORS.DEFAULT)}
              title="Xanh Emerald"
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

export default ThemeColorPicker;