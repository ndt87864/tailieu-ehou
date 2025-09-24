const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Import your existing API handlers
const {getAllCategories} = require('./services/categoryService');
const {
  getDocumentsWithQuestionCount,
  getDocumentsByCategory,
} = require('./services/documentService');
const {
  getAllQuestionsWithDocumentInfo,
  getQuestionsByDocument,
} = require('./services/questionService');

const app = express();

// Middleware
app.use(cors({origin: true}));
app.use(express.json());

// API endpoint để lấy categories (chỉ id, title)
app.get('/categories', async (req, res) => {
  try {
    console.log('🔄 Đang lấy dữ liệu categories từ Firestore...');
    const allCategories = await getAllCategories();

    // Chỉ lấy id và title
    const categories = allCategories.map((category) => ({
      id: category.id,
      title: category.title,
    }));

    console.log(`✅ Thành công lấy ${categories.length} categories`);
    res.status(200).json({categories});
  } catch (error) {
    console.error('❌ Lỗi khi lấy categories:', error);
    res.status(500).json({error: error.message || 'Internal Server Error'});
  }
});

// API endpoint để lấy documents (chỉ id, title, categoryId)
app.get('/documents', async (req, res) => {
  try {
    const {categoryId} = req.query || {};
    let allDocuments;

    console.log(`🔄 Đang lấy dữ liệu documents từ Firestore${categoryId ? ` cho category: ${categoryId}` : ''}...`);

    if (categoryId) {
      // Lấy documents theo categoryId cụ thể
      allDocuments = await getDocumentsByCategory(categoryId);
    } else {
      // Lấy tất cả documents
      allDocuments = await getDocumentsWithQuestionCount();
    }

    // Chỉ lấy id và title
    const documents = allDocuments.map((document) => ({
      id: document.id,
      title: document.title,
      categoryId: document.categoryId || null,
    }));

    console.log(`✅ Thành công lấy ${documents.length} documents`);
    res.status(200).json({documents});
  } catch (error) {
    console.error('❌ Lỗi khi lấy documents:', error);
    res.status(500).json({error: error.message || 'Internal Server Error'});
  }
});

// API endpoint để lấy questions (chỉ question, answer, documentId)
app.get('/questions', async (req, res) => {
  try {
    const {documentId} = req.query || {};
    let allQuestions;

    console.log(`🔄 Đang lấy dữ liệu questions từ Firestore${documentId ? ` cho document: ${documentId}` : ''}...`);

    if (documentId) {
      // Lấy questions theo documentId cụ thể
      allQuestions = await getQuestionsByDocument(documentId);
    } else {
      // Lấy tất cả questions
      allQuestions = await getAllQuestionsWithDocumentInfo();
    }

    // Chỉ lấy question, answer, và documentId
    const questions = allQuestions.map((question) => ({
      question: question.questionText || question.question,
      answer: question.correctAnswer || question.answer,
      documentId: question.documentId,
    }));

    console.log(`✅ Thành công lấy ${questions.length} questions`);
    res.status(200).json({questions});
  } catch (error) {
    console.error('❌ Lỗi khi lấy questions:', error);
    res.status(500).json({error: error.message || 'Internal Server Error'});
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production',
  });
});

// Export as Firebase Function
exports.api = functions.https.onRequest(app);