import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAllCategoriesWithDocuments, getQuestionsByDocument } from '../firebase/firestoreService';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../firebase/firestoreService';

/**
 * Custom hook to safely check if a user is an admin
 * Includes loading state to prevent flashing content
 */
export const useSafeAdminCheck = () => {
  const [user, userLoading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (userLoading) return;
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      try {
        const role = await getUserRole(user.uid);
        setIsAdmin(role === 'admin');
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [user, userLoading]);

  return { isAdmin, loading };
};

/**
 * Get categories with documents using optimized query
 */
export const fetchCategoriesWithDocumentsOptimized = async () => {
  try {
    // Import the optimized function
    const { getAllCategoriesWithDocumentsOptimized } = await import('./queryOptimizer');
    
    // Use the optimized function
    return await getAllCategoriesWithDocumentsOptimized();
  } catch (error) {
    console.error("Error loading optimized categories with documents:", error);
    throw error;
  }
};

// Use a different name to avoid conflicts with existing function
export const checkAndProtectAdminRoute = (isAdmin, loading, navigate) => {
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);
};

/**
 * Bảo vệ trang admin khỏi người dùng không có quyền
 * @param {Function} setError - Hàm đặt thông báo lỗi
 * @param {Function} setLoading - Hàm đặt trạng thái loading
 * @param {Function} navigate - Hàm điều hướng trang
 * @param {string} redirectPath - Đường dẫn chuyển hướng khi không có quyền
 */
export const protectAdminRoute = (isAdmin, loading, navigate, redirectPath = '/') => {
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate(redirectPath);
    }
  }, [isAdmin, loading, navigate, redirectPath]);
};

/**
 * Hàm tối ưu hóa truy vấn danh mục
 * @param {Function} setLoading - Hàm đặt trạng thái loading
 * @param {Function} setError - Hàm đặt thông báo lỗi
 * @param {Function} setCategories - Hàm cập nhật state danh mục
 */
export const loadCategoriesOptimized = async (setLoading, setError, setCategories) => {
  try {
    setLoading(true);
    
    // Gọi hàm tối ưu từ firestoreService
    const { getAllCategories } = await import('../firebase/firestoreService');
    const categoriesData = await getAllCategories();
    
    setCategories(categoriesData);
    setLoading(false);
  } catch (err) {
    console.error("Lỗi khi tải dữ liệu danh mục:", err);
    setError("Không thể tải dữ liệu danh mục. " + err.message);
    setLoading(false);
  }
};

/**
 * Hàm tối ưu hóa truy vấn danh mục với tài liệu
};

/**
 * Hàm tối ưu hóa truy vấn danh mục với tài liệu
 * @param {Function} setLoading - Hàm đặt trạng thái loading
 * @param {Function} setError - Hàm đặt thông báo lỗi
 * @param {Function} setCategories - Hàm cập nhật state danh mục
 * @param {Function} setDocuments - Hàm cập nhật state tài liệu
 */
export const loadCategoriesWithDocumentsOptimized = async (
  setLoading,
  setError,
  setCategories,
  setDocuments
) => {
  try {
    setLoading(true);
    
    console.log("Starting optimized categories with documents load...");
    const startTime = performance.now();
    
    // Get all categories with documents
    const categoriesWithDocs = await getAllCategoriesWithDocuments();
    
    if (!categoriesWithDocs || categoriesWithDocs.length === 0) {
      setError("Không tìm thấy danh mục");
      setLoading(false);
      return;
    }
    
    // Sort categories by position
    const sortedCategories = [...categoriesWithDocs].sort((a, b) => 
      (a.stt || Number.MAX_SAFE_INTEGER) - (b.stt || Number.MAX_SAFE_INTEGER)
    );
    
    // Extract and structure documents
    const allDocuments = [];
    
    sortedCategories.forEach(category => {
      if (category.documents && category.documents.length > 0) {
        const sortedDocs = [...category.documents].sort((a, b) => 
          (a.stt || Number.MAX_SAFE_INTEGER) - (b.stt || Number.MAX_SAFE_INTEGER)
        );
        
        // Add category info to each document
        sortedDocs.forEach(doc => {
          allDocuments.push({
            ...doc,
            categoryId: category.id,
            categoryTitle: category.title,
            categoryLogo: category.logo || null
          });
        });
      }
    });
    
    // Update state
    setCategories(sortedCategories);
    setDocuments(allDocuments);
    
    const endTime = performance.now();
    console.log(`Optimized categories with documents load: ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error("Error in loadCategoriesWithDocumentsOptimized:", error);
    setError("Không thể tải danh sách tài liệu và danh mục");
  } finally {
    setLoading(false);
  }
};

/**
 * Tải nhanh danh sách câu hỏi theo tài liệu với cơ chế cache
 * @param {string} documentId - ID của tài liệu
 * @returns {Promise<Array>} Danh sách câu hỏi
 */
export const fastLoadQuestionsByDocument = async (documentId) => {
  if (!documentId) return [];
  
  // Cache key
  const questionsKey = `ques_${documentId}`;
  
  try {
    // Kiểm tra cache
    const cachedData = sessionStorage.getItem(questionsKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // Tải từ Firestore
    const questionsData = await getQuestionsByDocument(documentId);
    
    // Cache lại nếu không quá lớn
    if (questionsData && questionsData.length < 1000) {
      sessionStorage.setItem(questionsKey, JSON.stringify(questionsData));
    }
    
    return questionsData;
  } catch (e) {
    console.error(`Error in fastLoadQuestionsByDocument for ${documentId}:`, e);
    // Phòng trường hợp lỗi, tải trực tiếp
    return await getQuestionsByDocument(documentId);
  }
};

/**
 * Kiểm tra quyền truy cập nhanh cho người dùng
 * @param {Object} user - Thông tin người dùng
 * @param {string} documentId - ID tài liệu
 * @returns {Promise<Object>} - Kết quả kiểm tra quyền truy cập
 */
export const fastCheckDocumentAccess = async (user, documentId) => {
  if (!user || !documentId) {
    return { 
      hasAccess: false, 
      isLimited: true,
      viewLimitExceeded: false,
      viewsRemaining: 5
    };
  }
  
  // Admin và người dùng premium luôn có quyền truy cập đầy đủ
  if (user.role === 'admin' || user.role === 'puser' || user.isPremium === true) {
    return {
      hasAccess: true,
      isLimited: false,
      viewLimitExceeded: false,
      viewsRemaining: null
    };
  }
  
  // Kiểm tra lượt xem cho người dùng thông thường
  try {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `views_${today}_${user.uid || 'anon'}`;
    
    let viewsData = {};
    
    try {
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        viewsData = JSON.parse(storedData);
      }
    } catch (e) {
      console.error("Error reading view data from storage:", e);
    }
    
    if (!viewsData.documents) {
      viewsData.documents = {};
    }
    
    if (!viewsData.documents[documentId]) {
      viewsData.documents[documentId] = 0;
    }
    
    // Tăng số lượt xem
    viewsData.documents[documentId]++;
    
    // Lưu lại
    localStorage.setItem(storageKey, JSON.stringify(viewsData));
    
    const viewCount = viewsData.documents[documentId];
    const remaining = Math.max(0, 5 - viewCount);
    
    return {
      hasAccess: true,
      isLimited: true,
      viewLimitExceeded: viewCount > 5,
      viewsRemaining: remaining
    };
  } catch (error) {
    console.error("Error checking document access:", error);
    // Cho phép truy cập nếu có lỗi
    return {
      hasAccess: true,
      isLimited: true,
      viewLimitExceeded: false,
      viewsRemaining: 5
    };
  }
};
