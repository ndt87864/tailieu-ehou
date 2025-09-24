
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Function to get auth instance (required by some components)
const getAuthInstance = () => {
  return auth;
};

// Function to reinitialize Firebase services if needed
let initialized = false;
const reinitializeFirebase = () => {
  if (initialized) return { app, auth, db, storage };

  // Already initialized, just return the existing instances
  initialized = true;
  return { app, auth, db, storage };
};

// Export the Firebase services and functions
export { app, auth, db, storage, reinitializeFirebase, getAuthInstance };
