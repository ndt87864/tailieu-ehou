
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - Updated from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDj_FhdiYG8sgrqzSBlf9SrGF8FQR4fCI4",
  authDomain: "tailieu-89ca9.firebaseapp.com",
  projectId: "tailieu-89ca9",
  storageBucket: "tailieu-89ca9.firebasestorage.app",
  messagingSenderId: "739034600322",
  appId: "1:739034600322:web:771c49578c29c8cabe359b",
  measurementId: "G-4KTZWXH5KE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with error handling
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enhanced connection management
let isFirestoreInitialized = false;

const initializeFirestoreConnection = async () => {
  if (isFirestoreInitialized) return;
  
  try {
    // Enable network if needed
    await enableNetwork(db);
    isFirestoreInitialized = true;
  } catch (error) {
    console.warn('Firestore network enable failed:', error);
    // Try to disable and re-enable network
    try {
      await disableNetwork(db);
      setTimeout(async () => {
        await enableNetwork(db);
        isFirestoreInitialized = true;
      }, 1000);
    } catch (retryError) {
      console.error('Firestore connection retry failed:', retryError);
    }
  }
};

// Initialize connection on load
initializeFirestoreConnection();

// Function to get auth instance (required by some components)
const getAuthInstance = () => {
  return auth;
};

// Function to reinitialize Firebase services if needed
let initialized = false;
const reinitializeFirebase = async () => {
  if (initialized) return { app, auth, db, storage };

  try {
    await initializeFirestoreConnection();
    initialized = true;
    return { app, auth, db, storage };
  } catch (error) {
    console.error('Firebase reinitialization failed:', error);
    return { app, auth, db, storage };
  }
};

// Simple retry mechanism for backward compatibility
const retryFirestoreOperation = async (operation, maxRetries = 3) => {
  // Import error handler dynamically to avoid circular dependency
  const { retryFirestoreOperationWithErrorHandling } = await import('./errorHandler.js');
  return await retryFirestoreOperationWithErrorHandling(operation, maxRetries);
};

// Export the Firebase services and functions
export { 
  app, 
  auth, 
  db, 
  storage, 
  reinitializeFirebase, 
  getAuthInstance,
  initializeFirestoreConnection,
  retryFirestoreOperation 
};
