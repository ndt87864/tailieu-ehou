import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore";
import { db, retryFirestoreOperation } from "./firebase.js";

export const COLLECTIONS = {
  CATEGORIES: "categories",
  DOCUMENTS: "documents",
  QUESTIONS: "questions",
  USER_PREFERENCES: "userPreferences",
  USERS: "users" 
};

// Helper function to check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

export const getQuestionsByDocument = async (documentId) => {
  try {
    if (!documentId) {
      return [];
    }
    
    const cacheKey = `questions_${documentId}`;
    
    // Only use sessionStorage if we're in a browser environment
    if (isBrowser()) {
      try {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      } catch (e) {
        console.error("Error reading cached data:", e);
      }
    }
    
    const questionsQuery = query(
      collection(db, COLLECTIONS.QUESTIONS),
      where("documentId", "==", documentId),
      orderBy("stt", "asc"),
      limit(10000)
    );
    
    try {
      // Use retry mechanism for Firestore operations
      const questionsSnapshot = await retryFirestoreOperation(async () => {
        const startTime = performance.now();
        const snapshot = await getDocs(questionsQuery);
        const endTime = performance.now();
        return snapshot;
      });
        
      if (questionsSnapshot.empty) {
        return [];
      }
      
      const questions = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        question: doc.data().question || '',
        answer: doc.data().answer || '',
        stt: doc.data().stt || 0
      }));
      
      // Only cache in browser environment
      if (isBrowser()) {
        try {
          const dataString = JSON.stringify(questions);
          const dataSize = new Blob([dataString]).size;
          
          if (dataSize > 2 * 1024 * 1024) {
            const metadata = {
              id: documentId,
              count: questions.length,
              isTruncated: true,
              message: 'Data too large for cache',
              timestamp: new Date().getTime()
            };
            sessionStorage.setItem(`${cacheKey}_meta`, JSON.stringify(metadata));
          } else {
            try {
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('questions_') && key !== cacheKey) {
                  sessionStorage.removeItem(key);
                }
              }
            } catch (e) {
              console.warn("Error cleaning old cache:", e);
            }
            
            sessionStorage.setItem(cacheKey, dataString);
          }
        } catch (e) {
          console.error("Error caching questions data:", e);
        }
      }
      
      return questions;
      
    } catch (indexError) {
      console.error(
        "Lỗi index Firebase: Truy vấn yêu cầu chỉ mục tổng hợp trên các trường (documentId, stt).", 
        "\nTạo index Firebase bằng cách truy cập:", 
        "\nhttps://console.firebase.google.com/project/_/firestore/indexes"
      );
      
      // Fallback query without sorting
      try {
        const fallbackQuery = query(
          collection(db, COLLECTIONS.QUESTIONS),
          where("documentId", "==", documentId),
          limit(10000)
        );
        
        const fallbackSnapshot = await retryFirestoreOperation(async () => {
          return await getDocs(fallbackQuery);
        });
        
        if (fallbackSnapshot.empty) {
          return [];
        }
        
        const questions = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          question: doc.data().question || '',
          answer: doc.data().answer || '',
          stt: doc.data().stt || 0
        }));
        
        const sortedQuestions = questions.sort((a, b) => (a.stt || 0) - (b.stt || 0));
        
        return sortedQuestions;
        
      } catch (fallbackError) {
        console.error(`Fallback query also failed for document ${documentId}:`, fallbackError);
        return [];
      }
    }
    
  } catch (error) {
    console.error(`Error fetching questions for document ${documentId}:`, error);
    return [];
  }
};

export const getAllQuestionsWithDocumentInfo = async () => {
  try {
    const questionsQuery = query(
      collection(db, 'questions'),
      orderBy("documentId"),
      limit(10000)
    );
    
    const questionsSnapshot = await retryFirestoreOperation(async () => {
      return await getDocs(questionsQuery);
    });
    
    if (questionsSnapshot.empty) {
      return [];
    }
    
    const questionsArray = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const documentIds = [...new Set(questionsArray
      .filter(q => q.documentId)
      .map(q => q.documentId))];
    
    const documentsPromises = documentIds.map(docId => 
      getDoc(doc(db, 'documents', docId))
    );
    
    const documentSnapshots = await Promise.all(documentsPromises);
    
    const documentsMap = {};
    const categoryIds = new Set();
    
    documentSnapshots.forEach((docSnap, index) => {
      const docId = documentIds[index];
      if (docSnap.exists()) {
        const docData = docSnap.data();
        documentsMap[docId] = {
          id: docId,
          title: docData.title || 'Untitled',
          categoryId: docData.categoryId
        };
        if (docData.categoryId) {
          categoryIds.add(docData.categoryId);
        }
      }
    });
    
    const categoriesPromises = Array.from(categoryIds).map(catId => 
      getDoc(doc(db, 'categories', catId))
    );
    
    const categorySnapshots = await Promise.all(categoriesPromises);
    
    const categoriesMap = {};
    categorySnapshots.forEach((catSnap, index) => {
      const catId = Array.from(categoryIds)[index];
      if (catSnap.exists()) {
        const catData = catSnap.data();
        categoriesMap[catId] = {
          id: catId,
          title: catData.title || 'Untitled Category'
        };
      }
    });
    
    const questionsWithInfo = questionsArray.map(question => {
      const docInfo = documentsMap[question.documentId] || {};
      const catInfo = categoriesMap[docInfo.categoryId] || {};
      
      return {
        ...question,
        documentTitle: docInfo.title || 'Unknown Document',
        categoryId: docInfo.categoryId || '',
        categoryTitle: catInfo.title || 'Unknown Category'
      };
    });
    
    return questionsWithInfo;
  } catch (error) {
    console.error('Error fetching questions with document info:', error);
    return [];
  }
};

export const addQuestion = async (questionData) => {
  try {
    const docRef = await retryFirestoreOperation(async () => {
      return await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
        ...questionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    return { id: docRef.id, ...questionData };
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
};

export const updateQuestion = async (questionId, questionData) => {
  try {
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
    await retryFirestoreOperation(async () => {
      return await updateDoc(questionRef, {
        ...questionData,
        updatedAt: serverTimestamp()
      });
    });
    
    return { id: questionId, ...questionData };
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  try {
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
    await retryFirestoreOperation(async () => {
      return await deleteDoc(questionRef);
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

export const getLimitedQuestionsWithDocumentInfo = async (limitCount = 1000) => {
  try {
    const questionsQuery = query(
      collection(db, 'questions'),
      orderBy("documentId"),
      limit(limitCount)
    );
    
    const questionsSnapshot = await retryFirestoreOperation(async () => {
      return await getDocs(questionsQuery);
    });
    
    if (questionsSnapshot.empty) {
      return [];
    }
    
    const questionsArray = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const documentIds = [...new Set(questionsArray
      .filter(q => q.documentId)
      .map(q => q.documentId))];
    
    const documentsPromises = documentIds.map(docId => 
      getDoc(doc(db, 'documents', docId))
    );
    
    const documentSnapshots = await Promise.all(documentsPromises);
    
    const documentsMap = {};
    const categoryIds = new Set();
    
    documentSnapshots.forEach((docSnap, index) => {
      const docId = documentIds[index];
      if (docSnap.exists()) {
        const docData = docSnap.data();
        documentsMap[docId] = {
          id: docId,
          title: docData.title || 'Untitled',
          categoryId: docData.categoryId
        };
        if (docData.categoryId) {
          categoryIds.add(docData.categoryId);
        }
      }
    });
    
    const categoriesPromises = Array.from(categoryIds).map(catId => 
      getDoc(doc(db, 'categories', catId))
    );
    
    const categorySnapshots = await Promise.all(categoriesPromises);
    
    const categoriesMap = {};
    categorySnapshots.forEach((catSnap, index) => {
      const catId = Array.from(categoryIds)[index];
      if (catSnap.exists()) {
        const catData = catSnap.data();
        categoriesMap[catId] = {
          id: catId,
          title: catData.title || 'Untitled Category'
        };
      }
    });
    
    const questionsWithInfo = questionsArray.map(question => {
      const docInfo = documentsMap[question.documentId] || {};
      const catInfo = categoriesMap[docInfo.categoryId] || {};
      
      return {
        ...question,
        documentTitle: docInfo.title || 'Unknown Document',
        categoryId: docInfo.categoryId || '',
        categoryTitle: catInfo.title || 'Unknown Category'
      };
    });
    
    return questionsWithInfo;
  } catch (error) {
    console.error('Error fetching limited questions with document info:', error);
    return [];
  }
};