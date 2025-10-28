import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase config for the "pj" project (provided by user)
const firebasePJConfig = {
  apiKey: "AIzaSyC-DxnK6X321PAgAh7xhAi1f09XrBKYE7Y",
  authDomain: "tailieu-ehou.firebaseapp.com",
  projectId: "tailieu-ehou",
  storageBucket: "tailieu-ehou.firebasestorage.app",
  messagingSenderId: "421842163067",
  appId: "1:421842163067:web:38b7cf529b97dece2a59de",
  measurementId: "G-25J5Q3KG5L"
};

// Create a named app to avoid colliding with the default app
const appPJ = initializeApp(firebasePJConfig, 'pj');
const dbPJ = getFirestore(appPJ);

export { appPJ as app, dbPJ as db };
