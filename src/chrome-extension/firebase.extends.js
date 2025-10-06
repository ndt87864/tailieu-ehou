// Firebase cấu hình riêng cho Chrome Extension (extends)
// Import từ CDN - sẽ được load từ popup.html

const extendsFirebaseConfig = {
  apiKey: "AIzaSyADDnlNwrgxweNLQomLXJiaTQFOWMTVggE",
  authDomain: "tai-lieu-extends.firebaseapp.com",
  projectId: "tai-lieu-extends",
  storageBucket: "tai-lieu-extends.firebasestorage.app",
  messagingSenderId: "917264262253",
  appId: "1:917264262253:web:9cc9602f391a3583818b64",
  measurementId: "G-P6R68G2CQS"
};

// Đợi Firebase được load từ CDN
let extendsApp, extendsDb, extendsAnalytics;

function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase chưa được load. Vui lòng đảm bảo Firebase SDK đã được load từ CDN.');
  }
  
  // Khởi tạo app Firebase riêng cho extends
  extendsApp = firebase.initializeApp(extendsFirebaseConfig, "extendsApp");
  extendsDb = firebase.firestore(extendsApp);
  
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