import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  getAuth
} from 'firebase/auth';
import { auth } from './firebase';
import { saveUserToFirestore, setUserOffline } from './firestoreService';

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Firebase user object
 */
export const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Login with Google
 * @returns {Promise<Object>} Firebase user object
 */
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Save user data to Firestore
    if (result.user) {
      await saveUserToFirestore(result.user.uid, {
        displayName: result.user.displayName,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber || '',
        photoURL: result.user.photoURL,
        role: 'fuser', // Default role
        emailVerified: result.user.emailVerified,
        lastLogin: new Date()
      });
    }
    
    return result.user;
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

/**
 * Register a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} Firebase user object
 */
export const registerWithEmailPassword = async (email, password, displayName) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Save user data to Firestore
    await saveUserToFirestore(user.uid, {
      displayName: displayName || '',
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      photoURL: user.photoURL || '',
      role: 'fuser', // Default role
      emailVerified: user.emailVerified,
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    return user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

/**
 * Logout the current user
 * @returns {Promise<boolean>} Success status
 */
export const logoutUser = async () => {
  try {
    // Update user status to offline before signing out
    if (auth.currentUser) {
      await setUserOffline(auth.currentUser.uid);
    }
    
    // Sign out the user
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<boolean>} Success status
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Password reset error:", error);
    throw error;
  }
};

/**
 * Get the current authenticated user
 * @returns {Object|null} Firebase user object or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

export default {
  loginWithEmailPassword,
  loginWithGoogle,
  registerWithEmailPassword,
  logoutUser,
  resetPassword,
  getCurrentUser
};