import { 
  COLLECTIONS,
  getAllCategories,
  getAllCategoriesWithDocuments,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoryById
} from './categoryService.js';

import {
  getDocumentsByCategory,
  getDocumentsWithQuestionCount,
  deleteDocument,
  addDocument,
  updateDocument,
  incrementDocumentViewCount
} from './documentService.js';

import {
  getQuestionsByDocument,
  getAllQuestionsWithDocumentInfo,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getLimitedQuestionsWithDocumentInfo
} from './questionService.js';

import {
  saveUserThemePreference,
  getUserThemePreference,
  saveUserPreferences,
  getUserPreferences,
  updateUserPreference,
  saveUserToFirestore,
  getUserRole,
  getAllUsers,
  updateUserSubscriptionType,
  updateUserRole,
  deleteUserFromFirestore,
  deleteUserAuthentication,
  loginSession,
  endAllOtherSessions,
  checkAndUpdateDocumentView,
  canViewDocument,
  getViewedDocumentsToday,
  setUserLoggedOut,
  loginWithDeviceId,
  verifyCurrentDevice,
  checkUserAlreadyLoggedIn,
  getUserData,
  checkLoginStatus,
  createUserProfile,
  updateUserData,
  updateUserProfile,
  updateUserPaidCategories,
  getUserStatistics,
  getActiveUsersCount,
  getUserGrowthData,
  updateUserOnlineStatus,
  setUserOffline,
  setUserOnline,
  incrementAnonymousVisitor,
  decrementAnonymousVisitor,
  getAnonymousVisitorCount,
  updateUserExcelPermission,
  updateUserExcelPercentage
} from './userService.js';

// Import Firestore functions for footer management
import { 
  collection, 
  getDocs, 
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase.js";

// Re-export all functions
export {
  // Category Service
  COLLECTIONS,
  getAllCategories,
  getAllCategoriesWithDocuments,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,

  // Document Service
  getDocumentsByCategory,
  getDocumentsWithQuestionCount,
  deleteDocument,
  addDocument,
  updateDocument,
  incrementDocumentViewCount,

  // Question Service
  getQuestionsByDocument,
  getAllQuestionsWithDocumentInfo,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getLimitedQuestionsWithDocumentInfo,

  // User Service
  saveUserThemePreference,
  getUserThemePreference,
  saveUserPreferences,
  getUserPreferences,
  updateUserPreference,
  saveUserToFirestore,
  getUserRole,
  getAllUsers,
  updateUserSubscriptionType,
  updateUserRole,
  deleteUserFromFirestore,
  deleteUserAuthentication,
  loginSession,
  endAllOtherSessions,
  checkAndUpdateDocumentView,
  canViewDocument,
  getViewedDocumentsToday,
  setUserLoggedOut,
  loginWithDeviceId,
  verifyCurrentDevice,
  checkUserAlreadyLoggedIn,
  getUserData,
  checkLoginStatus,
  createUserProfile,
  updateUserData,
  updateUserProfile,
  updateUserPaidCategories,
  getUserStatistics,
  getActiveUsersCount,
  getUserGrowthData,
  updateUserOnlineStatus,
  setUserOffline,
  setUserOnline,
  incrementAnonymousVisitor,
  decrementAnonymousVisitor,
  getAnonymousVisitorCount,
  updateUserExcelPermission,
  updateUserExcelPercentage
};

// Seed data function (kept here as it interacts with multiple collections)
export const seedDataToFirestore = async (sidebarData, titlesData) => {
  try {
    for (let i = 0; i < sidebarData.length; i++) {
      const category = sidebarData[i];
      const categoryRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
        title: category.title,
        stt: i + 1 
      });
      if (category.children && Array.isArray(category.children)) {
        for (let j = 0; j < category.children.length; j++) {
          const subCategory = category.children[j];
          const documentRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
            categoryId: categoryRef.id,
            title: subCategory,
            slug: subCategory.toLowerCase().replace(/\s+/g, '_'),
            stt: j + 1 
          });
          const questions = titlesData[subCategory] || [];
          for (const question of questions) {
            await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
              documentId: documentRef.id,
              stt: question.stt,
              question: question.question,
              answer: question.answer
            });
          }
        }
      }
    }
    return true;
  } catch (error) {
    throw error;
  }
};

// Footer management functions
export const getFooterContent = async () => {
  try {
    const footerDoc = await getDoc(doc(db, 'settings', 'footer'));
    if (footerDoc.exists()) {
      return footerDoc.data();
    }
    return { sections: [] };
  } catch (error) {
    console.error('Error getting footer content:', error);
    throw error;
  }
};

export const updateFooterContent = async (footerData) => {
  try {
    await setDoc(doc(db, 'settings', 'footer'), footerData, { merge: true });
  } catch (error) {
    console.error('Error updating footer content:', error);
    throw error;
  }
};

export const addFooterItem = async (footerItem) => {
  try {
    const footerDoc = await getDoc(doc(db, 'settings', 'footer'));
    let sections = [];
    
    if (footerDoc.exists()) {
      sections = footerDoc.data().sections || [];
    }
    
    sections.push(footerItem);
    await setDoc(doc(db, 'settings', 'footer'), { sections });
  } catch (error) {
    console.error('Error adding footer item:', error);
    throw error;
  }
};

export const deleteFooterItem = async (footerId) => {
  try {
    const footerDoc = await getDoc(doc(db, 'settings', 'footer'));
    if (footerDoc.exists()) {
      const sections = footerDoc.data().sections || [];
      const updatedSections = sections.filter(section => section.id !== footerId);
      await setDoc(doc(db, 'settings', 'footer'), { sections: updatedSections });
    }
  } catch (error) {
    console.error('Error deleting footer item:', error);
    throw error;
  }
};