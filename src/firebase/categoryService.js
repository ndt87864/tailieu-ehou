import { 
  collection, 
  getDocs, 
  doc, 
  query, 
  where,
  addDoc, 
  updateDoc, 
  deleteDoc,
  limit,
  startAfter
} from "firebase/firestore";
import { db } from "./firebase.js";
export const COLLECTIONS = {
  CATEGORIES: "categories",
  DOCUMENTS: "documents",
  QUESTIONS: "questions",
  USER_PREFERENCES: "userPreferences",
  USERS: "users" 
};

export const getAllCategories = async () => {
  try {
    const categoriesRef = collection(db, 'categories');
    const categoriesSnapshot = await getDocs(
      query(categoriesRef, limit(100))
    );
    
    if (categoriesSnapshot.empty) {
      return [];
    }
    
    const categoriesData = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      documentCount: 0
    }));
    
    const countPromises = categoriesData.map(async (category) => {
      try {
        const documentsRef = collection(db, 'documents');
        const documentsQuery = query(
          documentsRef, 
          where('categoryId', '==', category.id),
          limit(1000)
        );
        
        const documentsSnapshot = await getDocs(documentsQuery);
        return {
          ...category,
          documentCount: documentsSnapshot.size
        };
      } catch (error) {
        console.error(`Lỗi khi đếm tài liệu cho danh mục :`, error);
        return category;
      }
    });
    
    const categoriesWithCount = await Promise.all(countPromises);
    const sortedCategories = [...categoriesWithCount].sort((a, b) => (a.stt || 0) - (b.stt || 0));
    
    return sortedCategories;
  } catch (error) {
    console.error('Lỗi khi lấy tất cả danh mục:', error);
    throw new Error(`Không thể lấy danh mục: ${error.message}`);
  }
};

export const getAllCategoriesWithDocuments = async () => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const categoriesSnapshot = await getDocs(
      query(categoriesRef, limit(100))
    );
    
    if (categoriesSnapshot.empty) {
      return [];
    }
    
    let categoriesData = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      documents: []
    }));
    
    categoriesData = categoriesData.sort((a, b) => (a.stt || 0) - (b.stt || 0));
    
    const documentQueries = categoriesData.map(category => ({
      categoryId: category.id,
      query: query(
        collection(db, COLLECTIONS.DOCUMENTS),
        where("categoryId", "==", category.id),
        limit(1000)
      )
    }));
    
    const documentsResults = await Promise.all(
      documentQueries.map(async (queryObj) => {
        try {
          const querySnapshot = await getDocs(queryObj.query);
          return {
            categoryId: queryObj.categoryId,
            documents: querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
          };
        } catch (error) {
          console.error(`Lỗi khi lấy tài liệu cho danh mục :`, error);
          return {
            categoryId: queryObj.categoryId,
            documents: []
          };
        }
      })
    );
    
    for (const result of documentsResults) {
      const categoryIndex = categoriesData.findIndex(cat => cat.id === result.categoryId);
      if (categoryIndex !== -1) {
        const sortedDocuments = [...result.documents].sort((a, b) => (a.stt || 0) - (b.stt || 0));
        categoriesData[categoryIndex].documents = sortedDocuments;
      }
    }
    
    return categoriesData;
  } catch (error) {
    console.error("Lỗi khi lấy danh mục với tài liệu:", error);
    throw new Error(`Không thể lấy danh mục với tài liệu: ${error.message}`);
  }
};

export const addCategory = async (categoryData) => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const categoriesSnapshot = await getDocs(categoriesRef);
    let maxStt = 0;
    categoriesSnapshot.docs.forEach(doc => {
      const stt = doc.data().stt || 0;
      if (stt > maxStt) maxStt = stt;
    });
    const newCategory = {
      ...categoryData,
      stt: maxStt + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), newCategory);
    return {
      id: docRef.id,
      ...newCategory
    };
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const updateCategory = async (categoryId, categoryData) => {
  try {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const updatedCategory = {
      ...categoryData,
      updatedAt: new Date()
    };
    await updateDoc(categoryRef, updatedCategory);
    return {
      id: categoryId,
      ...updatedCategory
    };
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    const documentsQuery = query(
      collection(db, COLLECTIONS.DOCUMENTS),
      where("categoryId", "==", categoryId)
    );
    const documentsSnapshot = await getDocs(documentsQuery);
    const deletePromises = documentsSnapshot.docs.map(async (docSnapshot) => {
      const documentId = docSnapshot.id;
      const questionsQuery = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where("documentId", "==", documentId)
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionDeletePromises = questionsSnapshot.docs.map(questionDoc => 
        deleteDoc(doc(db, COLLECTIONS.QUESTIONS, questionDoc.id))
      );
      await Promise.all(questionDeletePromises);
      return deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, documentId));
    });
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId));
    return {
      success: true,
      message: "Đã xóa danh mục và tất cả tài liệu liên quan"
    };
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const getCategoryById = async (categoryId) => {
  try {
    const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting category:", error);
    throw error;
  }
};

export const getCategoriesByPage = async (page = 1, limit = 10, lastDoc = null) => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    let q;
    if (lastDoc) {
      q = query(categoriesRef, limit(limit), startAfter(lastDoc));
    } else {
      q = query(categoriesRef, limit(limit));
    }
    const categoriesSnapshot = await getDocs(q);

    const categoriesData = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      documentCount: 0
    }));

    // Đếm số tài liệu cho từng danh mục (tối ưu hóa nếu cần)
    const countPromises = categoriesData.map(async (category) => {
      const documentsRef = collection(db, COLLECTIONS.DOCUMENTS);
      const documentsQuery = query(
        documentsRef,
        where('categoryId', '==', category.id)
      );
      const documentsSnapshot = await getDocs(documentsQuery);
      return {
        ...category,
        documentCount: documentsSnapshot.size
      };
    });

    const categoriesWithCount = await Promise.all(countPromises);

    return {
      categories: categoriesWithCount,
      lastDoc: categoriesSnapshot.docs[categoriesSnapshot.docs.length - 1] || null
    };
  } catch (error) {
    console.error('Lỗi khi lấy danh mục theo trang:', error);
    throw new Error(`Không thể lấy danh mục: ${error.message}`);
  }
};