import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  addDoc, 
  updateDoc, 
  deleteDoc,
  limit,
  increment
} from "firebase/firestore";
import { db } from "./firebase";
export const COLLECTIONS = {
  CATEGORIES: "categories",
  DOCUMENTS: "documents",
  QUESTIONS: "questions",
  USER_PREFERENCES: "userPreferences",
  USERS: "users" 
};

export const getDocumentsByCategory = async (categoryId) => {
  try {
    if (!categoryId) {
      return [];
    }
    
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const categorySnap = await getDoc(categoryRef);
    const categoryData = categorySnap.exists() ? categorySnap.data() : {};
    const categoryLogo = categoryData.logo || null;
    
    const q = query(
      collection(db, COLLECTIONS.DOCUMENTS),
      where("categoryId", "==", categoryId),
      limit(1000)
    );
    
    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      categoryLogo: categoryLogo 
    }));
    
    return documents.sort((a, b) => (a.stt || 0) - (b.stt || 0));
  } catch (error) {
    console.error(`Lỗi khi lấy tài liệu cho danh mục :`, error);
    return [];
  }
};

export const getDocumentsWithQuestionCount = async () => {
  try {
    const documentsRef = collection(db, COLLECTIONS.DOCUMENTS);
    const documentsSnapshot = await getDocs(documentsRef);
    const documentsWithCount = [];
    for (const docSnapshot of documentsSnapshot.docs) {
      const documentId = docSnapshot.id;
      const documentData = docSnapshot.data();
      const categoryRef = doc(db, COLLECTIONS.CATEGORIES, documentData.categoryId || '');
      const categorySnap = await getDoc(categoryRef);
      const categoryData = categorySnap.exists() ? categorySnap.data() : {};
      const questionsQuery = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where("documentId", "==", documentId)
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      documentsWithCount.push({
        id: documentId,
        ...documentData,
        categoryTitle: categoryData.title || 'Unknown',
        categoryLogo: categoryData.logo || null,
        questionCount: questionsSnapshot.docs.length
      });
    }
    return documentsWithCount.sort((a, b) => (a.stt || 0) - (b.stt || 0));
  } catch (error) {
    console.error('Error getting documents with question count:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    const questionsQuery = query(
      collection(db, COLLECTIONS.QUESTIONS),
      where("documentId", "==", documentId)
    );
    const questionsSnapshot = await getDocs(questionsQuery);
    const questionDeletePromises = questionsSnapshot.docs.map(questionDoc => 
      deleteDoc(doc(db, COLLECTIONS.QUESTIONS, questionDoc.id))
    );
    await Promise.all(questionDeletePromises);
    await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, documentId));
    return {
      success: true,
      message: "Đã xóa tài liệu và tất cả câu hỏi liên quan"
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// ...existing code...
export const addDocument = async (documentData) => {
  try {
    const docsQuery = query(
      collection(db, COLLECTIONS.DOCUMENTS),
      where("categoryId", "==", documentData.categoryId)
    );
    const docsSnapshot = await getDocs(docsQuery);
    let maxStt = 0;
    docsSnapshot.docs.forEach(doc => {
      const stt = doc.data().stt || 0;
      if (stt > maxStt) maxStt = stt;
    });
    const newDocument = {
      ...documentData,
      stt: maxStt + 1,
      slug: documentData.title.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''), 
      isVip: documentData.isVip || false, // Đảm bảo có dòng này
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), newDocument);
    return {
      id: docRef.id,
      ...newDocument
    };
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

export const updateDocument = async (documentId, documentData) => {
  try {
    const documentRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
    const updatedDocument = {
      ...documentData,
      slug: documentData.title.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''), 
      isVip: documentData.isVip || false, // Đảm bảo có dòng này
      updatedAt: new Date()
    };
    await updateDoc(documentRef, updatedDocument);
    return {
      id: documentId,
      ...updatedDocument
    };
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};
// ...existing code...

export const incrementDocumentViewCount = async (documentId) => {
  try {
    if (!documentId) return false;
    
    const documentRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
    await updateDoc(documentRef, {
      viewCount: increment(1),
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error incrementing document view count:', error);
    return false;
  }
};
// ...existing code...

export const checkVipDocumentAccess = (user, document) => {

  // If document is not VIP, everyone has access
  if (!document?.isVip) {
    return { hasAccess: true, reason: "Tài liệu công khai" };
  }

  // If no user, deny access to VIP content
  if (!user || !user.uid) {
    return { 
      hasAccess: false, 
      reason: "Vui lòng đăng nhập để truy cập nội dung VIP" 
    };
  }

  // ✅ QUAN TRỌNG: Admin luôn có quyền truy cập
  if (user.role === "admin") {
    return { hasAccess: true, reason: "Quyền admin" };
  }

  // ✅ QUAN TRỌNG: Ưu tiên subscriptionType hơn role legacy
  // Full subscription users có quyền truy cập tất cả VIP content
  if (user.subscriptionType === "full") {
    return { hasAccess: true, reason: "Gói trả phí toàn bộ" };
  }

  // Partial subscription users - kiểm tra quyền truy cập cụ thể cho tài liệu
  if (user.subscriptionType === "partial") {
    
    // ✅ KIỂM TRA CẢ accessibleVipDocuments VÀ paidCategories
    const accessibleVipDocuments = user.accessibleVipDocuments || [];
    const paidCategories = user.paidCategories || {};
    
    // Kiểm tra trực tiếp document ID trong accessibleVipDocuments
    const hasDirectDocumentAccess = accessibleVipDocuments.includes(document.id);
    
    // ✅ KIỂM TRA TRONG paidCategories.documents[] (cấu trúc thực tế)
    let hasCategoryAccess = false;
    
    // Kiểm tra xem document có trong paidCategories.documents[] không
    if (paidCategories.documents && Array.isArray(paidCategories.documents)) {
      hasCategoryAccess = paidCategories.documents.includes(document.id);
    }
    
    // ✅ KIỂM TRA TRONG paidCategories.categories[] để xác định categories đã trả phí
    let hasPaidCategoryAccess = false;
    if (paidCategories.categories && Array.isArray(paidCategories.categories)) {
      hasPaidCategoryAccess = paidCategories.categories.includes(document.categoryId);
    }
    
    // ✅ KIỂM TRA THEO STRUCTURE CŨ (nếu có)
    let hasLegacyCategoryAccess = false;
    if (document.categoryId && paidCategories[document.categoryId]) {
      const categoryData = paidCategories[document.categoryId];
      
      if (categoryData === true) {
        hasLegacyCategoryAccess = true;
      } else if (Array.isArray(categoryData) && categoryData.includes(document.id)) {
        hasLegacyCategoryAccess = true;
      } else if (categoryData && categoryData.documents && Array.isArray(categoryData.documents)) {
        hasLegacyCategoryAccess = categoryData.documents.includes(document.id);
      }
      
    }
    
    const finalAccess = hasDirectDocumentAccess || hasCategoryAccess || hasPaidCategoryAccess || hasLegacyCategoryAccess;
    
   
    
    if (finalAccess) {
      let reason = "Gói trả phí một phần";
      if (hasDirectDocumentAccess) {
        reason += " - có trong danh sách tài liệu đặc biệt";
      } else if (hasCategoryAccess) {
        reason += " - có trong danh sách tài liệu đã mua";
      } else if (hasPaidCategoryAccess) {
        reason += " - thuộc danh mục đã trả phí";
      } else if (hasLegacyCategoryAccess) {
        reason += " - có quyền truy cập legacy";
      }
      
      return { hasAccess: true, reason };
    } else {
      return { 
        hasAccess: false, 
        reason: "Tài liệu VIP này không có trong gói trả phí của bạn. Vui lòng mua thêm hoặc nâng cấp lên gói toàn bộ." 
      };
    }
  }

  // ✅ QUAN TRỌNG: CHỈ CHO PHÉP legacy puser NẾU KHÔNG CÓ subscriptionType
  if (user.role === "puser" && !user.subscriptionType) {
    return { hasAccess: true, reason: "Tài khoản Premium legacy" };
  }

  // ✅ QUAN TRỌNG: Nếu có subscriptionType nhưng không phải "full" hoặc "partial", từ chối
  if (user.subscriptionType && user.subscriptionType !== "full" && user.subscriptionType !== "partial") {
    return { 
      hasAccess: false, 
      reason: "Loại subscription không hợp lệ. Vui lòng liên hệ hỗ trợ." 
    };
  }

  return { 
    hasAccess: false, 
    reason: "Nội dung VIP chỉ dành cho người dùng trả phí. Vui lòng nâng cấp tài khoản để truy cập." 
  };
};

// ...existing code...

// Enhanced function for partial subscription document access
export const checkPartialSubscriptionDocumentAccess = async (userId, documentId) => {
  try {
    // Get user document to check accessibleVipDocuments array
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const accessibleDocuments = userData.accessibleVipDocuments || [];
      const hasAccess = accessibleDocuments.includes(documentId);
      
      
      return hasAccess;
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking partial subscription document access:', error);
    return false;
  }
};

// Helper function to add VIP document access for partial subscription users
export const addVipDocumentAccess = async (userId, documentId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentAccessibleDocs = userData.accessibleVipDocuments || [];
      
      // Add document if not already present
      if (!currentAccessibleDocs.includes(documentId)) {
        const updatedAccessibleDocs = [...currentAccessibleDocs, documentId];
        
        await updateDoc(userDocRef, {
          accessibleVipDocuments: updatedAccessibleDocs,
          updatedAt: new Date()
        });
        
        return true;
      } else {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error adding VIP document access:', error);
    return false;
  }
};

// Helper function to remove VIP document access for partial subscription users
export const removeVipDocumentAccess = async (userId, documentId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentAccessibleDocs = userData.accessibleVipDocuments || [];
      
      // Remove document if present
      const updatedAccessibleDocs = currentAccessibleDocs.filter(docId => docId !== documentId);
      
      await updateDoc(userDocRef, {
        accessibleVipDocuments: updatedAccessibleDocs,
        updatedAt: new Date()
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error removing VIP document access:', error);
    return false;
  }
};