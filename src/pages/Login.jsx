import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import {
  loginWithEmailPassword,
  loginWithGoogle,
} from "../firebase/authService";
import { useTheme } from "../context/ThemeContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, authLoading, authError] = useAuthState(auth);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authError) {
      console.error("Auth state error:", authError);
    }
  }, [authError]);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const loggedOut = queryParams.get("logged_out");

    if (loggedOut === "current_device") {
      setError("Bạn đã đăng xuất khỏi thiết bị này.");
    } else if (loggedOut === "all_devices") {
      setError("Bạn đã đăng xuất khỏi tất cả thiết bị.");
    }
  }, []);

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await loginWithEmailPassword(email, password);

      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await loginWithGoogle();

      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Unexpected error during Google login:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại sau.");
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
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

        .input-group {
          position: relative;
          margin-bottom: 1.5rem;
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

        .google-button {
          width: 100%;
          padding: 0.875rem 1.5rem;
          border-radius: 0.75rem;
          border: 2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          background: ${isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.9)'};
          color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .google-button:hover:not(:disabled) {
          border-color: var(--accent-color);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .google-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(254, 226, 226, 0.9)'};
          border: 1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.5)' : '#fca5a5'};
          color: ${isDarkMode ? '#fca5a5' : '#dc2626'};
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          animation: fadeInUp 0.3s ease-out;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        }

        .divider span {
          padding: 0 1rem;
          font-size: 0.875rem;
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

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: var(--accent-color);
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
        .mt-4 { margin-top: 1rem; }
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
            Đăng nhập vào <span className="gradient-text">tài khoản</span>
          </h2>

          <p className="text-center text-muted" style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>
            Chưa có tài khoản?{" "}
            <button onClick={() => navigate("/register")} className="link-button">
              Đăng ký ngay
            </button>
          </p>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleEmailLogin}>
            <div className="input-group">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Địa chỉ email"
              />
            </div>

            <div className="input-group">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mật khẩu"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="link-button"
                style={{ fontSize: '0.875rem' }}
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner"></span>
                  Đang xử lý...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>Hoặc tiếp tục với</span>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="google-button"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            <span>Google</span>
          </button>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/")}
              className="link-button"
              style={{ fontSize: '0.875rem' }}
            >
              ← Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
