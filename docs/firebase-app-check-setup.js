// Cấu hình Firebase App Check cho Chrome Extension
// Thêm vào popup-firestore.js

async function initializeFirebaseWithAppCheck() {
  try {
    console.log('🚀 Initializing Firebase with App Check...');
    
    // Initialize Firebase
    if (!firebase.apps || !firebase.apps.find(app => app.name === 'extendsApp')) {
      const config = {
        apiKey: "AIzaSyDj_FhdiYG8sgrqzSBlf9SrGF8FQR4fCI4",
        authDomain: "tailieu-89ca9.firebaseapp.com",
        projectId: "tailieu-89ca9",
        storageBucket: "tailieu-89ca9.firebasestorage.app",
        messagingSenderId: "739034600322",
        appId: "1:739034600322:web:771c49578c29c8cabe359b",
        measurementId: "G-4KTZWXH5KE"
      };
      
      const app = firebase.initializeApp(config, "extendsApp");
      
      // Initialize App Check with reCAPTCHA (for web/extension)
      // Lưu ý: Cần đăng ký site key từ Firebase Console
      try {
        const appCheck = firebase.appCheck();
        appCheck.activate(
          'YOUR_RECAPTCHA_V3_SITE_KEY', // Lấy từ Firebase Console
          true // Auto-refresh token
        );
        console.log('✅ App Check initialized');
      } catch (error) {
        console.warn('⚠️ App Check not initialized:', error.message);
      }
      
      console.log('✅ Firebase initialized with project:', config.projectId);
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}
