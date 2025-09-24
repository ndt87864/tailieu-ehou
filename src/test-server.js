// Server đơn giản để test API Questions
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllQuestionsWithDocumentInfo } from './firebase/questionService.js';
import { getAllCategoriesWithDocuments } from './firebase/categoryService.js';
import { getDocumentsWithQuestionCount } from './firebase/documentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API endpoint để lấy questions theo document (chỉ question, answer, documentId)
// Sử dụng: /api/questions?documentId=xxx
app.get('/api/questions', async (req, res) => {
  try {
    const { documentId } = req.query;
    console.log(`🔄 Đang lấy dữ liệu questions từ Firestore${documentId ? ` cho document: ${documentId}` : ''}...`);
    
    const { default: handler } = await import('./apiQuestions.js');
    
    // Mock request/response để sử dụng handler với query params
    const mockReq = { method: 'GET', query: req.query };
    const mockRes = {
      statusCode: 200,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    await handler(mockReq, mockRes);
    
    if (mockRes.statusCode === 200) {
      console.log(`✅ Thành công lấy ${mockRes.responseData.questions.length} questions`);
      res.json(mockRes.responseData);
    } else {
      throw new Error('API handler failed');
    }
  } catch (error) {
    console.error('❌ Lỗi khi lấy questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint để lấy tất cả categories (chỉ id, title)
app.get('/api/categories', async (req, res) => {
  try {
    console.log('🔄 Đang lấy dữ liệu categories từ Firestore...');
    const { default: handler } = await import('./apiCategories.js');
    
    // Mock request/response để sử dụng handler
    const mockReq = { method: 'GET' };
    const mockRes = {
      statusCode: 200,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    await handler(mockReq, mockRes);
    
    if (mockRes.statusCode === 200) {
      console.log(`✅ Thành công lấy ${mockRes.responseData.categories.length} categories`);
      res.json(mockRes.responseData);
    } else {
      throw new Error('API handler failed');
    }
  } catch (error) {
    console.error('❌ Lỗi khi lấy categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint để lấy documents theo category (chỉ id, title)
// Sử dụng: /api/documents?categoryId=xxx
app.get('/api/documents', async (req, res) => {
  try {
    const { categoryId } = req.query;
    console.log(`🔄 Đang lấy dữ liệu documents từ Firestore${categoryId ? ` cho category: ${categoryId}` : ''}...`);
    
    const { default: handler } = await import('./apiDocuments.js');
    
    // Mock request/response để sử dụng handler với query params
    const mockReq = { method: 'GET', query: req.query };
    const mockRes = {
      statusCode: 200,
      responseData: null,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    await handler(mockReq, mockRes);
    
    if (mockRes.statusCode === 200) {
      console.log(`✅ Thành công lấy ${mockRes.responseData.documents.length} documents`);
      res.json(mockRes.responseData);
    } else {
      throw new Error('API handler failed');
    }
  } catch (error) {
    console.error('❌ Lỗi khi lấy documents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint để lấy tất cả documents (chỉ id, title)
app.get('/api/documents', async (req, res) => {
  try {
    console.log('🔄 Đang lấy dữ liệu documents từ Firestore...');
    const { default: handler } = await import('./apiDocuments.js');
    
    const mockReq = { method: 'GET' };
    const mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };
    
    await handler(mockReq, mockRes);
    
    if (mockRes.statusCode === 200) {
      console.log(`✅ Thành công lấy ${mockRes.responseData.documents.length} tài liệu`);
      res.json({
        success: true,
        count: mockRes.responseData.documents.length,
        documents: mockRes.responseData.documents
      });
    } else {
      throw new Error(mockRes.responseData.error);
    }
  } catch (error) {
    console.error('❌ Lỗi khi lấy documents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API endpoint để lấy tất cả documents
app.get('/api/documents', async (req, res) => {
  try {
    console.log('🔄 Đang lấy dữ liệu documents từ Firestore...');
    const documents = await getDocumentsWithQuestionCount();
    
    console.log(`✅ Thành công lấy ${documents.length} tài liệu`);
    res.json({
      success: true,
      count: documents.length,
      documents: documents
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy documents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route để phục vụ trang test
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-api-questions.html'));
});

// Route để phục vụ trang test (alternative)
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-api-questions.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📄 Trang test: http://localhost:${PORT}/test`);
  console.log(`🔗 API endpoints:`);
  console.log(`   - Categories: http://localhost:${PORT}/api/categories`);
  console.log(`   - Documents: http://localhost:${PORT}/api/documents (tất cả)`);
  console.log(`   - Documents: http://localhost:${PORT}/api/documents?categoryId=xxx (theo category)`);
  console.log(`   - Questions: http://localhost:${PORT}/api/questions (tất cả)`);
  console.log(`   - Questions: http://localhost:${PORT}/api/questions?documentId=xxx (theo document)`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app;