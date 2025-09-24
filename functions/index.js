const functions = require('firebase-functions');
const admin = require('firebase-admin');
const XLSX = require('xlsx');

admin.initializeApp();
const db = admin.firestore();

// Import API functions
const { api } = require('./api');

// Export API endpoints
exports.api = api;

exports.uploadExcelData = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  try {
    // Verify API key (implement your own security mechanism)
    const apiKey = req.body.apiKey;
    if (!apiKey || apiKey !== functions.config().app.api_key) {
      res.status(403).send('Unauthorized');
      return;
    }
    
    // Parse base64 file content
    const fileContent = req.body.file;
    const fileName = req.body.fileName;
    
    if (!fileContent || !fileName) {
      res.status(400).send('Missing file content or file name');
      return;
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(fileContent, 'base64');
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    
    if (!jsonData || jsonData.length === 0) {
      res.status(400).send('No data found in Excel file');
      return;
    }
    
    // Validate required columns
    const requiredColumns = ['STT', 'Câu hỏi', 'Trả lời', 'Ngành', 'Học phần'];
    const missingColumns = requiredColumns.filter(col => !(col in jsonData[0]));
    
    if (missingColumns.length > 0) {
      res.status(400).send(`Missing required columns: ${missingColumns.join(', ')}`);
      return;
    }
    
    // Group data by category and document
    const groupedData = groupDataByCategoryAndDocument(jsonData);
    
    // Process and upload data
    const result = await uploadGroupedData(groupedData);
    
    // Return results
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).send(`Error processing upload: ${error.message}`);
  }
});

// Helper functions
function groupDataByCategoryAndDocument(data) {
  const grouped = {};
  
  for (const row of data) {
    const category = row['Ngành'] || 'Không xác định';
    const document = row['Học phần'] || 'Không xác định';
    
    if (!grouped[category]) {
      grouped[category] = {};
    }
    
    if (!grouped[category][document]) {
      grouped[category][document] = [];
    }
    
    grouped[category][document].push(row);
  }
  
  return grouped;
}

async function uploadGroupedData(groupedData) {
  const stats = {
    categoriesAdded: 0,
    documentsAdded: 0,
    questionsAdded: 0,
    errors: []
  };
  
  // Get existing categories
  const categoriesSnapshot = await db.collection('categories').get();
  const existingCategories = {};
  categoriesSnapshot.forEach(doc => {
    existingCategories[doc.data().title] = doc.id;
  });
  
  // Process each category
  for (const categoryName in groupedData) {
    try {
      // Add or get category
      let categoryId;
      
      if (existingCategories[categoryName]) {
        categoryId = existingCategories[categoryName];
      } else {
        // Create new category
        const slug = slugify(categoryName);
        const categoryData = {
          title: categoryName,
          slug,
          logo: getCategoryLogo(categoryName),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const categoryRef = await db.collection('categories').add(categoryData);
        categoryId = categoryRef.id;
        existingCategories[categoryName] = categoryId;
        stats.categoriesAdded++;
      }
      
      // Process documents
      await processDocuments(categoryId, categoryName, groupedData[categoryName], stats);
    } catch (error) {
      console.error(`Error processing category "${categoryName}":`, error);
      stats.errors.push(`Error processing category "${categoryName}": ${error.message}`);
    }
  }
  
  return stats;
}

async function processDocuments(categoryId, categoryName, documents, stats) {
  // Get existing documents for this category
  const documentsSnapshot = await db.collection('documents')
    .where('categoryId', '==', categoryId)
    .get();
  
  const existingDocuments = {};
  documentsSnapshot.forEach(doc => {
    existingDocuments[doc.data().title] = doc.id;
  });
  
  // Process each document
  for (const documentName in documents) {
    try {
      // Add or get document
      let documentId;
      
      if (existingDocuments[documentName]) {
        documentId = existingDocuments[documentName];
      } else {
        // Create new document
        const slug = slugify(documentName);
        const documentData = {
          title: documentName,
          slug,
          categoryId,
          categoryLogo: getCategoryLogo(categoryName),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const documentRef = await db.collection('documents').add(documentData);
        documentId = documentRef.id;
        stats.documentsAdded++;
      }
      
      // Add questions
      await addQuestions(documentId, documents[documentName], stats);
    } catch (error) {
      console.error(`Error processing document "${documentName}":`, error);
      stats.errors.push(`Error processing document "${documentName}": ${error.message}`);
    }
  }
}

async function addQuestions(documentId, questions, stats) {
  // Use batched writes for efficiency
  const batches = [];
  let currentBatch = db.batch();
  let operationCount = 0;
  
  for (const question of questions) {
    const questionRef = db.collection('questions').doc();
    currentBatch.set(questionRef, {
      stt: parseInt(question.STT) || 0,
      question: question['Câu hỏi'],
      answer: question['Trả lời'],
      documentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    operationCount++;
    
    // Firestore allows max 500 operations per batch
    if (operationCount >= 499) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
  }
  
  // Add the last batch if it has operations
  if (operationCount > 0) {
    batches.push(currentBatch);
  }
  
  // Commit all batches
  for (const batch of batches) {
    await batch.commit();
  }
  
  stats.questionsAdded += questions.length;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd')              // Handle Vietnamese 'đ'
    .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
    .replace(/\s+/g, '_')            // Replace spaces with underscores
    .replace(/-+/g, '_')             // Replace multiple hyphens with single underscore
    .trim();
}

function getCategoryLogo(categoryName) {
  const name = categoryName.toLowerCase();
  
  if (name.includes('kinh tế')) return 'economics';
  if (name.includes('kế toán')) return 'accounting';
  if (name.includes('tài chính')) return 'finance';
  if (name.includes('quản trị')) return 'management';
  if (name.includes('marketing')) return 'marketing';
  if (name.includes('kinh doanh')) return 'business';
  if (name.includes('luật')) return 'law';
  if (name.includes('công nghệ')) return 'technology';
  if (name.includes('khoa học')) return 'science';
  if (name.includes('giáo dục')) return 'education';
  if (name.includes('ngôn ngữ')) return 'language';
  if (name.includes('quốc tế')) return 'international';
  
  // Default logo
  return 'education';
}
