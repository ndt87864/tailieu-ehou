import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { redirectToPrimaryDomain, initUpdateChecker } from './utils/cacheManager';
import setupUrlMonitoring from './utils/preventRedirection';

// Clean up URL query parameters
setupUrlMonitoring();

// Trước khi render ứng dụng, kiểm tra và chuyển hướng domain nếu cần
if (redirectToPrimaryDomain()) {
  // Nếu đã chuyển hướng, dừng việc render ứng dụng
  console.log('Đang chuyển hướng sang domain chính...');
} else {
  // Nếu không cần chuyển hướng, render ứng dụng và bắt đầu kiểm tra cập nhật
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
            <ToastContainer 
              position="bottom-right"
              autoClose={3000}
              pauseOnHover
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );

  // Khởi tạo hệ thống kiểm tra cập nhật sau khi đã render ứng dụng
  setTimeout(initUpdateChecker, 2000);
}