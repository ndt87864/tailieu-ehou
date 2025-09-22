// REST API trả về dữ liệu document từ Firestore
// Độc lập với các trang hiện tại - chỉ trả về id và title

import { getDocumentsWithQuestionCount, getDocumentsByCategory } from './firebase/documentService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const { categoryId } = req.query || {};
    let allDocuments;
    
    if (categoryId) {
      // Lấy documents theo categoryId cụ thể
      allDocuments = await getDocumentsByCategory(categoryId);
    } else {
      // Lấy tất cả documents
      allDocuments = await getDocumentsWithQuestionCount();
    }
    
    // Chỉ lấy id và title
    const documents = allDocuments.map(document => ({
      id: document.id,
      title: document.title,
      categoryId: document.categoryId || null
    }));
    
    res.status(200).json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}