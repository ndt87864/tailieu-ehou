import React, { useState } from 'react';
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
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Define email regex as a proper RegExp object
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Fix the isValidEmail function to ensure it uses RegExp.test() properly
  const isValidEmail = (email) => {
    if (!email) return false;
    return emailRegex.test(email);
  };

  // Fix the phone regex definition - it might currently be a string instead of a RegExp object
  const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;

  // Fix the isValidPhone function
  const isValidPhone = (phone) => {
    if (!phone) return false;
    return phoneRegex.test(phone);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    // Email validation
    if (!isValidEmail(email)) {
      setError('Email không hợp lệ. Vui lòng nhập đúng định dạng email.');
      setLoading(false);
      return;
    }
    
    // Validate phone number before proceeding
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
        email: email,        phoneNumber: phone,
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

  const inputClasses = `appearance-none rounded-md relative block w-full px-3 py-2 border ${
    isDarkMode 
      ? 'border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500' 
      : 'border-gray-300 placeholder-gray-500 focus:ring-green-600 focus:border-green-600'
  } focus:outline-none focus:ring-2 focus:z-10 sm:text-sm transition-colors`;

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <div className={`max-w-md w-full space-y-6 p-8 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800 shadow-gray-900/50' : 'bg-white shadow-gray-200/50'}`}>
        <div>
          <div className="flex justify-center">
            <svg className={`w-12 h-12 ${isDarkMode ? 'text-green-500' : 'text-green-600'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
            </svg>
          </div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Tạo tài khoản mới
          </h2>
          <p className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Đã có tài khoản?{' '}
            <button 
              onClick={() => navigate('/login')}
              className={`font-medium transition-colors ${isDarkMode ? 'text-green-500 hover:text-green-400' : 'text-green-600 hover:text-green-500'}`}
            >
              Đăng nhập
            </button>
          </p>
        </div>
        
        
        {/* Thông báo lỗi */}
        {error && (
          <div className={`px-4 py-3 rounded border ${
            isDarkMode 
              ? 'bg-red-900/30 border-red-800 text-red-300' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <span>{error}</span>
          </div>
        )}
        
        {/* Thông báo thành công */}
        {success && (
          <div className={`px-4 py-3 rounded border ${
            isDarkMode 
              ? 'bg-green-900/30 border-green-800 text-green-300' 
              : 'bg-green-100 border-green-400 text-green-700'
          }`}>
            <span>Đăng ký thành công! Đang chuyển hướng...</span>
          </div>
        )}
        
        <form className="mt-4 space-y-4" onSubmit={handleRegister}>
          <div className="rounded-md space-y-4">
            {/* Họ và tên field */}
            <div>
              <label htmlFor="full-name" className="sr-only">Họ và tên</label>
              <input
                id="full-name"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClasses}
                placeholder="Họ và tên"
              />
            </div>
            
            {/* Email field */}
            <div>
              <label htmlFor="email-address" className="sr-only">E-mail</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="E-mail"
              />
            </div>
            
            {/* Số điện thoại field */}
            <div>
              <label htmlFor="phone-number" className="sr-only">Số điện thoại</label>
              <input
                id="phone-number"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClasses}
                placeholder="Số điện thoại"
              />
            </div>
            
            {/* Password field */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">Mật khẩu</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
                placeholder="Mật khẩu"
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Confirm Password field */}
            <div className="relative">
              <label htmlFor="confirm-password" className="sr-only">Xác nhận mật khẩu</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClasses}
                placeholder="Xác nhận mật khẩu"
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
                isDarkMode 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                  : 'bg-green-700 hover:bg-green-800 focus:ring-green-600'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
             >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </div>
        </form>
        
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'}`}>
                Hoặc tiếp tục với
              </span>
            </div>
          </div>

          <div className="mt-4">
            <GoogleAuth isDarkMode={isDarkMode} />
          </div>
        </div>
        
        {/* Nút quay lại trang chủ */}
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center text-sm transition-colors 
                ${isDarkMode ? 'text-gray-400 hover:text-gray-300' 
                : 'text-gray-600 hover:text-gray-800'}`}>
                Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
