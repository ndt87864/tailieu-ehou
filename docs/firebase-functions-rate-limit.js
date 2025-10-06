// Cloud Function để proxy requests và rate limit
// Deploy: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Rate limiting: 100 requests/minute per IP
const requestCounts = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
  // Remove old requests outside window
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

// API: Get categories
exports.getCategories = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  
  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    // Get categories
    const snapshot = await db.collection('categories')
      .orderBy('stt')
      .limit(100)
      .get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ categories });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get documents by category
exports.getDocuments = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  
  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    const categoryId = req.query.categoryId;
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId required' });
    }
    
    const snapshot = await db.collection('documents')
      .where('categoryId', '==', categoryId)
      .limit(1000)
      .get();
    
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ documents });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get questions by documents (với rate limit nghiêm ngặt hơn)
exports.getQuestions = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  
  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    const { documentIds } = req.body;
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds array required' });
    }
    
    // Limit: Tối đa 10 documents mỗi lần
    if (documentIds.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 documents per request' });
    }
    
    const allQuestions = [];
    
    // Query in batches of 10 (Firestore 'in' limit)
    for (let i = 0; i < documentIds.length; i += 10) {
      const chunk = documentIds.slice(i, i + 10);
      const snapshot = await db.collection('questions')
        .where('documentId', 'in', chunk)
        .limit(5000) // Giới hạn tối đa 5000 questions
        .get();
      
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allQuestions.push(...questions);
    }
    
    res.json({ questions: allQuestions });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
