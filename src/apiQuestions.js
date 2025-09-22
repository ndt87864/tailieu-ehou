// Trang REST API trả về dữ liệu question từ Firestore
// Độc lập với các trang hiện tại

import { getAllQuestionsWithDocumentInfo } from './firebase/questionService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const questions = await getAllQuestionsWithDocumentInfo();
    res.status(200).json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
