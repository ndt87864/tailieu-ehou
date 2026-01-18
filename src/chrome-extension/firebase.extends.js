// Firebase cấu hình riêng cho Chrome Extension (extends)
// Import từ CDN - sẽ được load từ popup.html

const extendsFirebaseConfig = {
  apiKey: "AIzaSyC-DxnK6X321PAgAh7xhAi1f09XrBKYE7Y",
  authDomain: "tailieu-ehou.firebaseapp.com",
  projectId: "tailieu-ehou",
  storageBucket: "tailieu-ehou.firebasestorage.app",
  messagingSenderId: "421842163067",
  appId: "1:421842163067:web:38b7cf529b97dece2a59de",
  measurementId: "G-25J5Q3KG5L"
};

// Đợi Firebase được load từ CDN
let extendsApp, extendsDb, extendsAnalytics;

function initializeFirebase() {
  
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase chưa được load. Vui lòng đảm bảo Firebase SDK đã được load từ CDN.');
  }
  
  console.log('🔧 Config:', {
    projectId: extendsFirebaseConfig.projectId,
    authDomain: extendsFirebaseConfig.authDomain,
    apiKey: extendsFirebaseConfig.apiKey.substring(0, 15) + '...'
  });
  
  // Khởi tạo app Firebase riêng cho extends
  extendsApp = firebase.initializeApp(extendsFirebaseConfig, "extendsApp");
  extendsDb = firebase.firestore(extendsApp);
  extendsAnalytics = null;
  
  return { extendsApp, extendsDb, extendsAnalytics };
}

// Không dùng export, sử dụng global scope
window.extendsApp = extendsApp;
window.extendsDb = extendsDb;
window.extendsAnalytics = extendsAnalytics;
window.initializeFirebase = initializeFirebase;
window.extendsFirebaseConfig = extendsFirebaseConfig;