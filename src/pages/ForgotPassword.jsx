import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useTheme } from "../context/ThemeContext";
import "../styles/auth.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);
    
    if (!email) {
      setMessage("Vui lòng nhập email để lấy lại mật khẩu.");
      return;
    }
    
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
      setIsSuccess(true);
    } catch (err) {
      setMessage("Không thể gửi email. Vui lòng kiểm tra lại email hoặc thử lại sau.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page-wrapper ${isDarkMode ? 'dark' : 'light'}`}>

      <div className={`auth-card ${mounted ? 'mounted' : ''}`}>
        <div className={`glass-card ${isDarkMode ? 'dark' : 'light'}`}>
          {/* Logo */}
          <div className="logo-container text-center">
            <svg
              className="w-16 h-16 mx-auto"
              style={{ color: 'var(--accent-color)' }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
            </svg>
          </div>

          {/* Title */}
          <h2 className={`auth-title ${isDarkMode ? 'dark' : 'light'}`}>
            <span className={`gradient-text ${isDarkMode ? 'dark' : 'light'}`}>Quên mật khẩu</span>
          </h2>

          <p className={`text-center text-muted mb-6 ${isDarkMode ? 'dark' : 'light'}`}>
            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu
          </p>

          {/* Message */}
          {message && (
            <div className={`message ${isSuccess ? 'success' : 'error'} ${isDarkMode ? 'dark' : 'light'}`}>
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-field ${isDarkMode ? 'dark' : 'light'}`}
              autoFocus
              required
            />
            
            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? (
                <span className="loading-container">
                  <span className="spinner"></span>
                  Đang gửi...
                </span>
              ) : (
                "Gửi email đặt lại mật khẩu"
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="back-to-home-container">
            <button
              onClick={() => navigate("/login")}
              className="link-button back-to-home-link"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
