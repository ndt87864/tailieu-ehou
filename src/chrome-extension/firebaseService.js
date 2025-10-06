// Firebase Service cho Chrome Extension - Helper functions để đọc/ghi Firestore
// Sử dụng global firebase từ CDN (compat mode)

// Helper để lấy db instance
function getDb() {
  if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
    throw new Error('Firebase chưa được khởi tạo');
  }
  // Lấy app "extendsApp" 
  const app = firebase.app('extendsApp');
  return firebase.firestore(app);
}

// ==================== CATEGORIES ====================

/**
 * Lấy tất cả categories
 * @returns {Promise<Array>} Danh sách categories
 */
async function getAllCategories() {
  try {
    const db = getDb();
    const querySnapshot = await db.collection('categories').get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

/**
 * Lấy category theo ID
 * @param {string} categoryId 
 * @returns {Promise<Object>} Category data
 */
async function getCategoryById(categoryId) {
  try {
    const db = getDb();
    const docSnap = await db.collection('categories').doc(categoryId).get();
    
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Category not found');
    }
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
}

/**
 * Thêm category mới
 * @param {Object} categoryData - { title: string }
 * @returns {Promise<string>} ID của category mới
 */
async function addCategory(categoryData) {
  try {
    const db = getDb();
    const docRef = await db.collection('categories').add({
      ...categoryData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

// ==================== DOCUMENTS ====================

/**
 * Lấy tất cả documents
 * @returns {Promise<Array>} Danh sách documents
 */
async function getAllDocuments() {
  try {
    const db = getDb();
    const querySnapshot = await db.collection('documents').get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Lấy documents theo category ID
 * @param {string} categoryId 
 * @returns {Promise<Array>} Danh sách documents
 */
async function getDocumentsByCategory(categoryId) {
  try {
    const db = getDb();
    const querySnapshot = await db.collection('documents')
      .where('categoryId', '==', categoryId)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting documents by category:', error);
    throw error;
  }
}

/**
 * Lấy document theo ID
 * @param {string} documentId 
 * @returns {Promise<Object>} Document data
 */
async function getDocumentById(documentId) {
  try {
    const db = getDb();
    const docSnap = await db.collection('documents').doc(documentId).get();
    
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
}

/**
 * Thêm document mới
 * @param {Object} documentData - { title: string, categoryId: string }
 * @returns {Promise<string>} ID của document mới
 */
async function addDocument(documentData) {
  try {
    const db = getDb();
    const docRef = await db.collection('documents').add({
      ...documentData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
}

// ==================== QUESTIONS ====================

/**
 * Lấy tất cả questions
 * @returns {Promise<Array>} Danh sách questions
 */
async function getAllQuestions() {
  try {
    const db = getDb();
    const querySnapshot = await db.collection('questions').get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting questions:', error);
    throw error;
  }
}

/**
 * Lấy questions theo document ID
 * @param {string} documentId 
 * @returns {Promise<Array>} Danh sách questions
 */
async function getQuestionsByDocument(documentId) {
  try {
    const db = getDb();
    const querySnapshot = await db.collection('questions')
      .where('documentId', '==', documentId)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting questions by document:', error);
    throw error;
  }
}

/**
 * Lấy questions theo nhiều document IDs (phù hợp khi có nhiều documents được chọn)
 * Firestore 'in' query giới hạn 10 items, function này sẽ tự động chia nhỏ nếu cần
 * @param {Array<string>} documentIds - Mảng các document IDs
 * @returns {Promise<Array>} Danh sách questions từ tất cả documents
 */
async function getQuestionsByDocuments(documentIds) {
  try {
    if (!documentIds || documentIds.length === 0) {
      return [];
    }
    
    const db = getDb();
    const allQuestions = [];
    
    // Firestore 'in' query giới hạn 10 items, chia thành chunks
    const chunkSize = 10;
    for (let i = 0; i < documentIds.length; i += chunkSize) {
      const chunk = documentIds.slice(i, i + chunkSize);
      const querySnapshot = await db.collection('questions')
        .where('documentId', 'in', chunk)
        .get();
      
      const chunkQuestions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allQuestions.push(...chunkQuestions);
    }
    
    return allQuestions;
  } catch (error) {
    console.error('Error getting questions by documents:', error);
    throw error;
  }
}

/**
 * Tìm kiếm questions theo text (trong question hoặc answer)
 * @param {string} searchText - Text để tìm kiếm
 * @param {string} documentId - (Optional) Giới hạn search trong 1 document
 * @returns {Promise<Array>} Danh sách questions match
 */
async function searchQuestions(searchText, documentId = null) {
  try {
    const db = getDb();
    let questionsRef = db.collection('questions');
    
    // Filter by document if provided
    if (documentId) {
      questionsRef = questionsRef.where('documentId', '==', documentId);
    }
    
    const querySnapshot = await questionsRef.get();
    
    // Client-side filtering (Firestore không support full-text search)
    const searchLower = searchText.toLowerCase();
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(q => {
        const questionText = (q.question || '').toLowerCase();
        const answerText = (q.answer || '').toLowerCase();
        return questionText.includes(searchLower) || answerText.includes(searchLower);
      });
  } catch (error) {
    console.error('Error searching questions:', error);
    throw error;
  }
}

/**
 * Thêm question mới
 * @param {Object} questionData - { question: string, answer: string, documentId: string }
 * @returns {Promise<string>} ID của question mới
 */
async function addQuestion(questionData) {
  try {
    const db = getDb();
    const docRef = await db.collection('questions').add({
      ...questionData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
}

/**
 * Cập nhật question
 * @param {string} questionId 
 * @param {Object} updates - Object chứa các field cần update
 * @returns {Promise<void>}
 */
async function updateQuestion(questionId, updates) {
  try {
    const db = getDb();
    await db.collection('questions').doc(questionId).update({
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
}

/**
 * Xóa question
 * @param {string} questionId 
 * @returns {Promise<void>}
 */
async function deleteQuestion(questionId) {
  try {
    const db = getDb();
    await db.collection('questions').doc(questionId).delete();
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

// ==================== BATCH OPERATIONS ====================

/**
 * Lấy tất cả data (categories, documents, questions) - Hữu ích cho offline mode
 * @returns {Promise<Object>} { categories: [], documents: [], questions: [] }
 */
async function getAllData() {
  try {
    const [categories, documents, questions] = await Promise.all([
      getAllCategories(),
      getAllDocuments(),
      getAllQuestions()
    ]);
    
    return { categories, documents, questions };
  } catch (error) {
    console.error('Error getting all data:', error);
    throw error;
  }
}

/**
 * Lấy data theo category (category + documents + questions)
 * @param {string} categoryId 
 * @returns {Promise<Object>} { category: {}, documents: [], questions: [] }
 */
async function getDataByCategory(categoryId) {
  try {
    const category = await getCategoryById(categoryId);
    const documents = await getDocumentsByCategory(categoryId);
    
    // Lấy tất cả questions cho documents trong category này
    const documentIds = documents.map(doc => doc.id);
    const questions = await getQuestionsByDocuments(documentIds);
    
    return { category, documents, questions };
  } catch (error) {
    console.error('Error getting data by category:', error);
    throw error;
  }
}
