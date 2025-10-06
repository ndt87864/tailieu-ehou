// Firebase cấu hình riêng cho Chrome Extension (extends)
// Import từ CDN - sẽ được load từ popup.html

const extendsFirebaseConfig = {
  apiKey: "AIzaSyDj_FhdiYG8sgrqzSBlf9SrGF8FQR4fCI4",
  authDomain: "tailieu-89ca9.firebaseapp.com",
  projectId: "tailieu-89ca9",
  storageBucket: "tailieu-89ca9.firebasestorage.app",
  messagingSenderId: "739034600322",
  appId: "1:739034600322:web:771c49578c29c8cabe359b",
  measurementId: "G-4KTZWXH5KE"
};

// Đợi Firebase được load từ CDN
let extendsApp, extendsDb, extendsAnalytics;

function initializeFirebase() {
  console.log('🚀 Initializing Firebase...');
  
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK not loaded!');
    throw new Error('Firebase chưa được load. Vui lòng đảm bảo Firebase SDK đã được load từ CDN.');
  }
  
  console.log('✅ Firebase SDK loaded');
  console.log('🔧 Config:', {
    projectId: extendsFirebaseConfig.projectId,
    authDomain: extendsFirebaseConfig.authDomain,
    apiKey: extendsFirebaseConfig.apiKey.substring(0, 15) + '...'
  });
  
  // Khởi tạo app Firebase riêng cho extends
  extendsApp = firebase.initializeApp(extendsFirebaseConfig, "extendsApp");
  extendsDb = firebase.firestore(extendsApp);
  
  console.log('✅ Firebase initialized successfully');
  console.log('📊 App name:', extendsApp.name);
  console.log('📊 Project ID:', extendsApp.options.projectId);
  
  // Analytics (optional)
  try {
    extendsAnalytics = firebase.analytics(extendsApp);
  } catch (e) {
    console.log('Analytics not initialized:', e.message);
  }
  
  return { extendsApp, extendsDb, extendsAnalytics };
}

// Không dùng export, sử dụng global scope
window.extendsApp = extendsApp;
window.extendsDb = extendsDb;
window.extendsAnalytics = extendsAnalytics;
window.initializeFirebase = initializeFirebase;
window.extendsFirebaseConfig = extendsFirebaseConfig;