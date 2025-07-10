import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult 
} from 'firebase/auth';
import { saveUserToFirestore } from '../firebase/firestoreService';

const GoogleAuth = ({ isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          const user = result.user;
          
          await saveUserToFirestore(user.uid, {
            displayName: user.displayName,
            email: user.email,
            phoneNumber: user.phoneNumber || '',
            photoURL: user.photoURL,
            role: 'fuser',
            emailVerified: user.emailVerified,
            lastLogin: new Date()
          });
          
          navigate('/'); 
        }
      } catch (error) {
        console.error('Lỗi khi xử lý kết quả chuyển hướng:', error);
        setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    
    checkRedirectResult();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        await saveUserToFirestore(user.uid, {
          displayName: user.displayName,
          email: user.email,
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL,
          role: 'fuser', 
          emailVerified: user.emailVerified,
          lastLogin: new Date()
        });
        
        navigate('/'); 
      } catch (popupError) {
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error('Lỗi đăng nhập Google:', error);
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className={`px-4 py-2 rounded border mb-3 text-sm ${
          isDarkMode 
            ? 'bg-red-900/30 border-red-800 text-red-300' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          <span>{error}</span>
        </div>
      )}
      
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className={`w-full flex items-center justify-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
          isDarkMode 
            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
          </g>
        </svg>
        Google
      </button>
    </>
  );
};

export default GoogleAuth;
