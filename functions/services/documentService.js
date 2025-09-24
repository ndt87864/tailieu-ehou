const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Lấy tất cả documents kèm số lượng questions
 */
async function getDocumentsWithQuestionCount() {
  try {
    const snapshot = await db.collection('documents').orderBy('title').get();
    
    const documents = [];
    for (const doc of snapshot.docs) {
      const documentData = {
        id: doc.id,
        ...doc.data()
      };
      
      // Đếm số lượng questions cho document này
      const questionsSnapshot = await db.collection('questions')
        .where('documentId', '==', doc.id)
        .get();
      
      documentData.questionCount = questionsSnapshot.size;
      documents.push(documentData);
    }
    
    return documents;
  } catch (error) {
    console.error('Error getting documents with question count:', error);
    throw error;
  }
}

/**
 * Lấy documents theo categoryId
 */
async function getDocumentsByCategory(categoryId) {
  try {
    const snapshot = await db.collection('documents')
      .where('categoryId', '==', categoryId)
      .orderBy('title')
      .get();
    
    const documents = [];
    for (const doc of snapshot.docs) {
      const documentData = {
        id: doc.id,
        ...doc.data()
      };
      
      // Đếm số lượng questions cho document này
      const questionsSnapshot = await db.collection('questions')
        .where('documentId', '==', doc.id)
        .get();
      
      documentData.questionCount = questionsSnapshot.size;
      documents.push(documentData);
    }
    
    return documents;
  } catch (error) {
    console.error('Error getting documents by category:', error);
    throw error;
  }
}

module.exports = {
  getDocumentsWithQuestionCount,
  getDocumentsByCategory
};