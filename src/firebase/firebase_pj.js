import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase config for the "pj" project (provided by user)
const firebasePJConfig = {
  apiKey: "AIzaSyARhakxzXT5gopEc8OgS4iXzzIuxo74KUc",
  authDomain: "tailieu-ehou-3.firebaseapp.com",
  projectId: "tailieu-ehou-3",
  storageBucket: "tailieu-ehou-3.firebasestorage.app",
  messagingSenderId: "128824060357",
  appId: "1:128824060357:web:13f5d68901096f560443ac",
  measurementId: "G-W1R7NTY2ZL"
};

// Create a named app to avoid colliding with the default app
const appPJ = initializeApp(firebasePJConfig, 'pj');
const dbPJ = getFirestore(appPJ);

export { appPJ as app, dbPJ as db };
