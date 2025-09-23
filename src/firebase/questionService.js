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
  limit
} from "firebase/firestore";
import { db } from "./firebase.js";
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
      const startTime = performance.now();
      const questionsSnapshot = await getDocs(questionsQuery);
      const endTime = performance.now();
      
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
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key && key.startsWith('questions_')) {
                sessionStorage.removeItem(key);
              }
            }
          } catch (clearError) {
            console.warn("Could not clear cache storage:", clearError);
          }
        }
      }
      
      return questions;
    } catch (indexError) {
      console.error(
        "Lỗi index Firebase: Truy vấn yêu cầu chỉ mục tổng hợp trên các trường (documentId, stt).", 
        "\nTạo index Firebase bằng cách truy cập:", 
        "\nhttps://console.firebase.google.com/project/_/firestore/indexes"
      );
      console.error(
        "Hoặc nhấp vào URL trong lỗi ở dưới để tạo index tự động:",
        indexError.message
      );
      
      const basicQuery = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where("documentId", "==", documentId),
        limit(10000)
      );
      
      const questionsSnapshot = await getDocs(basicQuery);
      
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
      
      const sortedQuestions = questions.sort((a, b) => (a.stt || 0) - (b.stt || 0));
      
      return sortedQuestions;
    }
  } catch (error) {
    console.error(`Error fetching questions for document :`, error);
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
    
    const questionsSnapshot = await getDocs(questionsQuery);
    
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
          ...docData
        };
        
        if (docData.categoryId) {
          categoryIds.add(docData.categoryId);
        }
      } else {
        documentsMap[docId] = {
          id: docId,
          title: 'Tài liệu không tồn tại',
          categoryId: ''
        };
      }
    });
    
    const categoriesPromises = Array.from(categoryIds).map(catId => 
      getDoc(doc(db, 'categories', catId))
    );
    
    const categorySnapshots = await Promise.all(categoriesPromises);
    
    const categoriesMap = {};
    categorySnapshots.forEach((catSnap) => {
      if (catSnap.exists()) {
        const catData = catSnap.data();
        categoriesMap[catSnap.id] = {
          id: catSnap.id,
          ...catData
        };
      }
    });
    
    const questionsWithDocInfo = questionsArray.map(question => {
      if (!question.documentId || !documentsMap[question.documentId]) {
        return {
          ...question,
          documentTitle: 'Không có tài liệu',
          categoryId: '',
          categoryTitle: 'Không có danh mục',
          categoryLogo: null
        };
      }
      
      const docInfo = documentsMap[question.documentId];
      const catInfo = docInfo.categoryId ? categoriesMap[docInfo.categoryId] : null;
      
      return {
        ...question,
        documentTitle: docInfo.title || 'Không có tiêu đề',
        categoryId: docInfo.categoryId || '',
        categoryTitle: catInfo ? catInfo.title : 'Không có danh mục',
        categoryLogo: catInfo ? catInfo.logo : null
      };
    });
    return questionsWithDocInfo;
  } catch (error) {
    console.error("Error in getAllQuestionsWithDocumentInfo:", error);
    throw error;
  }
};

export const addQuestion = async (questionData) => {
  try {
    const questionsQuery = query(
      collection(db, COLLECTIONS.QUESTIONS),
      where("documentId", "==", questionData.documentId)
    );
    const questionsSnapshot = await getDocs(questionsQuery);
    let maxStt = 0;
    questionsSnapshot.docs.forEach(doc => {
      const stt = doc.data().stt || 0;
      if (stt > maxStt) maxStt = stt;
    });
    const newQuestion = {
      ...questionData,
      stt: maxStt + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const questionRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), newQuestion);
    return {
      id: questionRef.id,
      ...newQuestion
    };
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
};

export const updateQuestion = async (questionId, questionData) => {
  try {
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
    const updatedQuestion = {
      ...questionData,
      updatedAt: new Date()
    };
    await updateDoc(questionRef, updatedQuestion);
    return {
      id: questionId,
      ...updatedQuestion
    };
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, questionId));
    return {
      success: true,
      message: "Đã xóa câu hỏi thành công"
    };
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

export const getLimitedQuestionsWithDocumentInfo = async (documentId) => {
  try {
    const questionsSnapshot = await getDocs(
      query(
        collection(db, 'questions'),
        where('documentId', '==', documentId),
        orderBy('stt', 'asc') 
      )
    );
    if (questionsSnapshot.empty) {
      return [];
    }
    const questions = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    const documentInfo = await getDocumentInfo(documentId);
    const questionsWithInfo = questions.map(question => ({
      ...question,
      documentTitle: documentInfo?.title || '',
      categoryId: documentInfo?.categoryId || '',
      categoryTitle: documentInfo?.categoryTitle || '',
      categoryLogo: documentInfo?.categoryLogo || null
    }));
    return questionsWithInfo.slice(0, Math.ceil(questionsWithInfo.length / 2));
  } catch (error) {
    console.error("Error getting limited questions with document info:", error);
    throw error;
  }
};

async function getDocumentInfo(documentId) {
  try {
    const documentDoc = await getDoc(doc(db, 'documents', documentId));
    if (!documentDoc.exists()) {
      return null;
    }
    const documentData = documentDoc.data();
    const categoryDoc = await getDoc(doc(db, 'categories', documentData.categoryId));
    if (!categoryDoc.exists()) {
      return {
        ...documentData,
        categoryTitle: '',
        categoryLogo: null
      };
    }
    const categoryData = categoryDoc.data();
    return {
      ...documentData,
      categoryTitle: categoryData.title || '',
      categoryLogo: categoryData.logo || null
    };
  } catch (error) {
    console.error("Error getting document info:", error);
    return null;
  }
};