// REST API trả về dữ liệu question từ Firestore
// Độc lập với các trang hiện tại - chỉ trả về question, answer, documentId

import { getAllQuestionsWithDocumentInfo, getQuestionsByDocument } from './firebase/questionService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const { documentId } = req.query || {};
    let allQuestions;
    
    if (documentId) {
      // Lấy questions theo documentId cụ thể
      allQuestions = await getQuestionsByDocument(documentId);
    } else {
      // Lấy tất cả questions
      allQuestions = await getAllQuestionsWithDocumentInfo();
    }
    
    // Chỉ lấy question, answer, và documentId
    const questions = allQuestions.map(question => ({
      question: question.questionText || question.question,
      answer: question.correctAnswer || question.answer,
      documentId: question.documentId
    }));
    
    res.status(200).json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
