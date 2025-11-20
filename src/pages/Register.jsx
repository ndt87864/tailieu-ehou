import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { saveUserToFirestore } from '../firebase/firestoreService';
import GoogleAuth from './GoogleAuth';
import "../styles/auth.css";

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
            Tạo <span className={`gradient-text ${isDarkMode ? 'dark' : 'light'}`}>tài khoản mới</span>
          </h2>

          <p className={`text-center text-muted ${isDarkMode ? 'dark' : 'light'}`}>
            Đã có tài khoản?{" "}
            <button onClick={() => navigate('/login')} className="link-button">
              Đăng nhập
            </button>
          </p>

          {/* Error Message */}
          {error && (
            <div className={`error-message ${isDarkMode ? 'dark' : 'light'}`}>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={`success-message ${isDarkMode ? 'dark' : 'light'}`}>
              Đăng ký thành công! Đang chuyển hướng...
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleRegister}>
            <div className={`input-group staggered ${mounted ? 'mounted' : ''}`}>
              <input
                id="full-name"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`input-field ${isDarkMode ? 'dark' : 'light'}`}
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
                className={`input-field ${isDarkMode ? 'dark' : 'light'}`}
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
                className={`input-field ${isDarkMode ? 'dark' : 'light'}`}
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
                className={`input-field ${isDarkMode ? 'dark' : 'light'}`}
                placeholder="Mật khẩu (6-12 ký tự)"
              />
              <button
                type="button"
                className={`password-toggle ${isDarkMode ? 'dark' : 'light'}`}
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
                className={`input-field ${isDarkMode ? 'dark' : 'light'}`}
                placeholder="Xác nhận mật khẩu"
              />
              <button
                type="button"
                className={`password-toggle ${isDarkMode ? 'dark' : 'light'}`}
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
              className="primary-button register-button"
            >
              {loading ? (
                <span className="loading-container">
                  <span className="spinner"></span>
                  Đang xử lý...
                </span>
              ) : (
                "Đăng ký"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={`divider ${isDarkMode ? 'dark' : 'light'}`}>
            <span>Hoặc tiếp tục với</span>
          </div>

          {/* Google Auth */}
          <GoogleAuth isDarkMode={isDarkMode} />

          {/* Back to Home */}
          <div className="back-to-home-container">
            <button
              onClick={() => navigate('/')}
              className="link-button back-to-home-link"
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
