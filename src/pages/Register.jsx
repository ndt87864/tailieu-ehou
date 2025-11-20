import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { saveUserToFirestore } from '../firebase/firestoreService';
import GoogleAuth from './GoogleAuth';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;

  const isValidEmail = (email) => {
    if (!email) return false;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone) => {
    if (!phone) return false;
    return phoneRegex.test(phone);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    if (!isValidEmail(email)) {
      setError('Email không hợp lệ. Vui lòng nhập đúng định dạng email.');
      setLoading(false);
      return;
    }
    
    if (!isValidPhone(phone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, hoặc 09)');
      setLoading(false);
      return;
    }
    
    try {
      if (!fullName.trim()) {
        throw { code: 'auth/invalid-name', message: 'Vui lòng nhập họ và tên' };
      }
      
      if (!phone.trim()) {
        throw { code: 'auth/invalid-phone', message: 'Vui lòng nhập số điện thoại' };
      }
      
      if (!isValidPhone(phone)) {
        throw { code: 'auth/invalid-phone-format', message: 'Số điện thoại phải có đúng 10 chữ số' };
      }
      
      if (!isValidEmail(email)) {
        throw { code: 'auth/invalid-email-format', message: 'Định dạng email không hợp lệ' };
      }
      if (password.length < 6 || password.length > 12) {
        throw { code: 'auth/invalid-password-length', message: 'Mật khẩu phải có từ 6 đến 12 ký tự' };
      }
      
      if (password !== confirmPassword) {
        throw { code: 'auth/passwords-dont-match', message: 'Mật khẩu xác nhận không khớp' };
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: fullName
      });

      await saveUserToFirestore(userCredential.user.uid, {
        displayName: fullName,
        email: email,
        phoneNumber: phone,
        role: 'fuser', 
        emailVerified: userCredential.user.emailVerified
      });
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/'); 
      }, 1500);
      
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      setError(
        error.code === 'auth/email-already-in-use' ? 'Email đã được sử dụng' :
        error.code === 'auth/weak-password' ? 'Mật khẩu quá yếu' :
        error.code === 'auth/invalid-email' || error.code === 'auth/invalid-email-format' ? 'Định dạng email không hợp lệ' :
        error.code === 'auth/passwords-dont-match' ? error.message :
        error.code === 'auth/invalid-name' ? error.message :
        error.code === 'auth/invalid-phone' ? error.message :
        error.code === 'auth/invalid-password-length' ? error.message :
        error.code === 'auth/invalid-phone-format' ? error.message :
        'Đã có lỗi xảy ra, vui lòng thử lại'
      );
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

        @keyframes slideInStagger {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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
          margin-bottom: 1.25rem;
          animation: ${mounted ? 'slideInStagger 0.5s ease-out backwards' : 'none'};
        }

        .input-group:nth-child(1) { animation-delay: 0.1s; }
        .input-group:nth-child(2) { animation-delay: 0.2s; }
        .input-group:nth-child(3) { animation-delay: 0.3s; }
        .input-group:nth-child(4) { animation-delay: 0.4s; }
        .input-group:nth-child(5) { animation-delay: 0.5s; }

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

        .error-message, .success-message {
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          animation: fadeInUp 0.3s ease-out;
        }

        .error-message {
          background: ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(254, 226, 226, 0.9)'};
          border: 1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.5)' : '#fca5a5'};
          color: ${isDarkMode ? '#fca5a5' : '#dc2626'};
        }

        .success-message {
          background: ${isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(220, 252, 231, 0.9)'};
          border: 1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.5)' : '#86efac'};
          color: ${isDarkMode ? '#86efac' : '#16a34a'};
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
            Tạo <span className="gradient-text">tài khoản mới</span>
          </h2>

          <p className="text-center text-muted" style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>
            Đã có tài khoản?{" "}
            <button onClick={() => navigate('/login')} className="link-button">
              Đăng nhập
            </button>
          </p>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="success-message">
              Đăng ký thành công! Đang chuyển hướng...
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <input
                id="full-name"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Họ và tên"
              />
            </div>

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
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder="Số điện thoại"
              />
            </div>

            <div className="input-group">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mật khẩu (6-12 ký tự)"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="input-group">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Xác nhận mật khẩu"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner"></span>
                  Đang xử lý...
                </span>
              ) : (
                "Đăng ký"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>Hoặc tiếp tục với</span>
          </div>

          {/* Google Auth */}
          <GoogleAuth isDarkMode={isDarkMode} />

          {/* Back to Home */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/')}
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

export default Register;
