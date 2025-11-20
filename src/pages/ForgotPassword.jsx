import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useTheme } from "../context/ThemeContext";

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
    <div className="auth-page-wrapper">
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .auth-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          position: relative;
          overflow: hidden;
          background: ${isDarkMode 
            ? 'linear-gradient(-45deg, #1a1a1a, #2d2d2d, #1a1a1a, #0a0a0a)' 
            : 'linear-gradient(-45deg, rgba(var(--accent-color-rgb), 0.05), rgba(var(--accent-color-rgb), 0.15), rgba(var(--accent-color-rgb), 0.1), rgba(var(--accent-color-rgb), 0.05))'};
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        .auth-card {
          animation: ${mounted ? 'fadeInUp 0.6s ease-out' : 'none'};
          max-width: 28rem;
          width: 100%;
          position: relative;
          z-index: 10;
        }

        .glass-card {
          background: ${isDarkMode 
            ? 'rgba(31, 41, 55, 0.8)' 
            : 'rgba(255, 255, 255, 0.9)'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 1.5rem;
          border: 1px solid ${isDarkMode 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)'};
          box-shadow: ${isDarkMode
            ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.15)'};
          padding: 2.5rem;
        }

        .logo-container {
          animation: float 3s ease-in-out infinite;
          margin-bottom: 1.5rem;
        }

        .gradient-text {
          background: ${isDarkMode
            ? 'linear-gradient(135deg, var(--accent-color-light), var(--accent-color))'
            : 'linear-gradient(135deg, var(--accent-color), var(--accent-color-dark))'};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .input-field {
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          background: ${isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.8)'};
          color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
          font-size: 0.95rem;
          transition: all 0.3s ease;
          outline: none;
          margin-bottom: 1.5rem;
        }

        .input-field:focus {
          border-color: var(--accent-color);
          background: ${isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(255, 255, 255, 1)'};
          box-shadow: 0 0 0 3px ${isDarkMode 
            ? 'rgba(var(--accent-color-rgb), 0.2)' 
            : 'rgba(var(--accent-color-rgb), 0.1)'};
          transform: translateY(-2px);
        }

        .input-field::placeholder {
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }

        .primary-button {
          width: 100%;
          padding: 0.875rem 1.5rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, var(--accent-color-light), var(--accent-color-dark));
          color: white;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(var(--accent-color-rgb), 0.3);
        }

        .primary-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .primary-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .primary-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .message {
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          animation: fadeInUp 0.3s ease-out;
          text-align: center;
        }

        .message.success {
          background: ${isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(220, 252, 231, 0.9)'};
          border: 1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.5)' : '#86efac'};
          color: ${isDarkMode ? '#86efac' : '#16a34a'};
        }

        .message.error {
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(254, 226, 226, 0.9)'};
          border: 1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.5)' : '#fca5a5'};
          color: ${isDarkMode ? '#fca5a5' : '#dc2626'};
        }

        .link-button {
          background: none;
          border: none;
          color: var(--accent-color);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .link-button:hover {
          color: var(--accent-color-dark);
          text-decoration: underline;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .text-muted {
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }

        .text-center {
          text-align: center;
        }

        .mb-6 { margin-bottom: 1.5rem; }
        .mt-6 { margin-top: 1.5rem; }
      `}</style>

      <div className="auth-card">
        <div className="glass-card">
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
          <h2 className="text-center mb-6" style={{ 
            fontSize: '1.875rem', 
            fontWeight: '800',
            color: isDarkMode ? '#f9fafb' : '#111827'
          }}>
            <span className="gradient-text">Quên mật khẩu</span>
          </h2>

          <p className="text-center text-muted mb-6" style={{ fontSize: '0.875rem' }}>
            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu
          </p>

          {/* Message */}
          {message && (
            <div className={`message ${isSuccess ? 'success' : 'error'}`}>
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
              className="input-field"
              autoFocus
              required
            />
            
            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner"></span>
                  Đang gửi...
                </span>
              ) : (
                "Gửi email đặt lại mật khẩu"
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/login")}
              className="link-button"
              style={{ fontSize: '0.875rem' }}
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
