const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Lấy tất cả categories
 */
async function getAllCategories() {
  try {
    const snapshot = await db.collection('categories').orderBy('title').get();

    const categories = [];
    snapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

module.exports = {
  getAllCategories,
};