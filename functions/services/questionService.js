const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Lấy tất cả questions kèm thông tin document
 */
async function getAllQuestionsWithDocumentInfo() {
  try {
    const snapshot = await db.collection('questions').get();
    
    const questions = [];
    snapshot.forEach(doc => {
      const questionData = doc.data();
      questions.push({
        id: doc.id,
        questionText: questionData.question,
        correctAnswer: questionData.answer,
        documentId: questionData.documentId,
        question: questionData.question,
        answer: questionData.answer
      });
    });
    
    return questions;
  } catch (error) {
    console.error('Error getting all questions:', error);
    throw error;
  }
}

/**
 * Lấy questions theo documentId
 */
async function getQuestionsByDocument(documentId) {
  try {
    const snapshot = await db.collection('questions')
      .where('documentId', '==', documentId)
      .get();
    
    const questions = [];
    snapshot.forEach(doc => {
      const questionData = doc.data();
      questions.push({
        id: doc.id,
        questionText: questionData.question,
        correctAnswer: questionData.answer,
        documentId: questionData.documentId,
        question: questionData.question,
        answer: questionData.answer
      });
    });
    
    return questions;
  } catch (error) {
    console.error('Error getting questions by document:', error);
    throw error;
  }
}

module.exports = {
  getAllQuestionsWithDocumentInfo,
  getQuestionsByDocument
};