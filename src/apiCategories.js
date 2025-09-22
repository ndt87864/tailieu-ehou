// REST API trả về dữ liệu category từ Firestore
// Độc lập với các trang hiện tại - chỉ trả về id và title

import { getAllCategories } from './firebase/categoryService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const allCategories = await getAllCategories();
    
    // Chỉ lấy id và title
    const categories = allCategories.map(category => ({
      id: category.id,
      title: category.title
    }));
    
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}