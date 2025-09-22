// Server đơn giản để test API Questions
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllQuestionsWithDocumentInfo } from './firebase/questionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

// API endpoint để lấy tất cả questions
app.get('/api/questions', async (req, res) => {
  try {
    console.log('🔄 Đang lấy dữ liệu questions từ Firestore...');
    const questions = await getAllQuestionsWithDocumentInfo();
    
    console.log(`✅ Thành công lấy ${questions.length} câu hỏi`);
    res.json({
      success: true,
      count: questions.length,
      questions: questions
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy questions:', error);
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
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/questions`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app;