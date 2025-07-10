import { 
  getAllCategories, 
  getDocumentsByCategory,
  getQuestionsByDocument
} from '../firebase/firestoreService';

import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { COLLECTIONS } from '../firebase/firestoreService';

// Định nghĩa các hàm cache utility trước khi sử dụng
/**
 * Lưu dữ liệu vào cache với thời gian hết hạn
 * @param {string} key - Khóa cache
 * @param {any} data - Dữ liệu cần lưu
 * @param {number} expirationMs - Thời gian hết hạn (mili giây)
 * @returns {boolean} - Thành công hay không
 */
const cacheData = (key, data, expirationMs = 300000) => { // 5 phút mặc định
  if (!key || data === undefined) return false;
  
  try {
    const item = {
      data: data,
      expiry: Date.now() + expirationMs
    };
    sessionStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.warn('Không thể lưu cache:', error);
    return false;
  }
};

/**
 * Lấy dữ liệu từ cache
 * @param {string} key - Khóa cache
 * @returns {any|null} - Dữ liệu cache hoặc null nếu không tìm thấy/hết hạn
 */
const getDataFromCache = (key) => {
  if (!key) return null;
  
  try {
    // Kiểm tra xem sessionStorage có tồn tại không (tránh lỗi ở một số môi trường)
    if (typeof sessionStorage === 'undefined') return null;
    
    const item = sessionStorage.getItem(key);
    if (!item) return null;
    
    try {
      // Thử lấy dữ liệu theo định dạng mới (với expiry)
      const parsedItem = JSON.parse(item);
      
      // Kiểm tra xem có thuộc tính expiry và data không
      if (parsedItem && parsedItem.expiry && parsedItem.data !== undefined) {
        // Kiểm tra xem đã hết hạn chưa
        if (Date.now() > parsedItem.expiry) {
          // Dữ liệu đã hết hạn, xóa khỏi cache
          sessionStorage.removeItem(key);
          return null;
        }
        return parsedItem.data;
      }
      
      // Trường hợp cache theo định dạng cũ (không có expiry)
      return parsedItem;
    } catch (parseError) {
      // Lỗi khi parse JSON, có thể dữ liệu không phải định dạng JSON
      console.warn('Lỗi khi parse dữ liệu cache:', parseError);
      return null;
    }
  } catch (error) {
    // Lỗi chung khi truy cập sessionStorage
    console.warn('Lỗi khi đọc cache:', error);
    return null;
  }
};

// Kiểm tra xem cache của key này có tồn tại không
const isCacheExist = (key) => {
  if (!key) return false;
  
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Optimized function to get all categories with their documents
 * Uses Promise.all, proper indexing, denormalization, and caching
 */
export const getAllCategoriesWithDocumentsOptimized = async () => {
  try {
    // Check cache first (with a 5-minute expiration)
    const cacheKey = 'all_categories_with_documents';
    try {
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 5 * 60 * 1000) {
        console.log('Using cached categories with documents');
        return JSON.parse(cachedData);
      }
    } catch (e) {
      console.warn("Error reading from cache:", e);
    }
    
    console.log('Fetching all categories for homepage...');
    
    // Step 1: Get categories with limit and orderBy
    const categoriesRef = collection(db, 'categories');
    const categoriesQuery = query(
      categoriesRef,
      orderBy('stt', 'asc'), // Sort by position
      limit(100) // Reasonable limit 
    );
    
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    if (categoriesSnapshot.empty) {
      console.log('No categories found');
      return [];
    }
    
    console.log(`Found ${categoriesSnapshot.docs.length} categories`);
    
    // Parse category data from snapshot
    const categoriesData = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      documents: [] // Will be populated later
    }));
    
    // Step 2: Fetch documents for each category one by one to avoid index issues
    for (const category of categoriesData) {
      try {
        console.log(`Fetching documents for category: ${category.title}`);
        
        // Use simple query that doesn't require compound indexes
        const documentsRef = collection(db, 'documents');
        const documentsQuery = query(
          documentsRef,
          where('categoryId', '==', category.id),
          limit(1000) // Reasonable limit
        );
        
        const documentsSnapshot = await getDocs(documentsQuery);
        
        console.log(`Found ${documentsSnapshot.docs.length} documents for category ${category.title}`);
        
        if (!documentsSnapshot.empty) {
          // Extract document data and add category info
          const documents = documentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            categoryId: category.id,
            categoryTitle: category.title,
            categoryLogo: category.logo || null
          }));
          
          // Sort by stt on client side
          const sortedDocuments = documents.sort((a, b) => {
            // Handle null/undefined stt values
            const aVal = a.stt !== undefined ? a.stt : Number.MAX_SAFE_INTEGER;
            const bVal = b.stt !== undefined ? b.stt : Number.MAX_SAFE_INTEGER;
            return aVal - bVal;
          });
          
          // Assign the documents to the category
          category.documents = sortedDocuments;
        }
      } catch (error) {
        console.error(`Error fetching documents for category ${category.title}:`, error);
        category.documents = []; // Ensure we always have an array
      }
    }
    
    // Cache the result
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(categoriesData));
      sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      console.log('Successfully cached categories with documents');
    } catch (e) {
      console.warn("Error writing to cache:", e);
    }
    
    return categoriesData;
  } catch (error) {
    console.error("Error in getAllCategoriesWithDocumentsOptimized:", error);
    
    // Fallback to original implementation if available
    try {
      console.log("Falling back to original getAllCategoriesWithDocuments function");
      const { getAllCategoriesWithDocuments } = await import('../firebase/firestoreService');
      return await getAllCategoriesWithDocuments();
    } catch (fallbackError) {
      console.error("Even fallback to original function failed:", fallbackError);
      throw error;
    }
  }
};

/**
 * Lấy tài liệu theo danh mục với tối ưu hóa hiệu suất
 * @param {string} categoryId - ID của danh mục
 * @param {AbortSignal} signal - Signal để hủy request
 * @returns {Promise<Array>} Danh sách tài liệu
 */
export const optimizedGetDocumentsByCategory = async (categoryId, signal) => {
  if (!categoryId) return [];
  
  console.log(`Đang tải tài liệu cho danh mục ${categoryId}`);
  
  // Kiểm tra cache theo định dạng mới
  const cacheKey = `documents_${categoryId}`;
  let cachedData = null;
  
  // Chỉ thử lấy từ cache nếu có dữ liệu được lưu trước đó
  if (isCacheExist(cacheKey)) {
    cachedData = getDataFromCache(cacheKey);
    if (cachedData) {
      console.log(`Lấy dữ liệu tài liệu từ cache cho danh mục ${categoryId}`);
      return cachedData;
    }
  }
  
  // Kiểm tra cache format cũ nếu có
  try {
    const oldTimestampKey = `documents_${categoryId}_timestamp`;
    if (isCacheExist(oldTimestampKey)) {
      const oldData = sessionStorage.getItem(cacheKey);
      const timestamp = sessionStorage.getItem(oldTimestampKey);
      
      if (oldData && timestamp && (Date.now() - parseInt(timestamp)) < 300000) {
        try {
          const parsedData = JSON.parse(oldData);
          if (Array.isArray(parsedData)) {
            // Lưu vào định dạng cache mới cho lần sau
            cacheData(cacheKey, parsedData, 300000);
            return parsedData;
          }
        } catch (e) {
          // Bỏ qua lỗi parse JSON
        }
      }
    }
  } catch (error) {
    // Bỏ qua lỗi khi kiểm tra cache cũ
  }
  
  try {
    // Tạo controller nếu không được cung cấp
    const controller = signal ? null : new AbortController();
    const localSignal = signal || controller?.signal;
    
    // Lấy thông tin danh mục
    const categoryRef = doc(db, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef, { signal: localSignal });
    
    if (!categorySnap.exists()) {
      console.warn(`Danh mục ${categoryId} không tồn tại`);
      return [];
    }
    
    const categoryData = categorySnap.data();
    const categoryTitle = categoryData.title || 'Danh mục không xác định';
    const categoryLogo = categoryData.logo || null;
    
    // Query dữ liệu từ Firestore - dùng query đơn giản không yêu cầu composite index
    const q = query(
      collection(db, 'documents'),
      where("categoryId", "==", categoryId),
      limit(1000)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Tìm thấy ${querySnapshot.docs.length} tài liệu cho danh mục ${categoryId}`);
    
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      categoryId: categoryId,
      categoryLogo: categoryLogo,
      categoryTitle: categoryTitle // Đảm bảo categoryTitle từ category data
    }));
    
    // Sắp xếp ở client
    const sortedDocuments = documents.sort((a, b) => {
      const aVal = a.stt ?? Number.MAX_SAFE_INTEGER;
      const bVal = b.stt ?? Number.MAX_SAFE_INTEGER;
      return aVal - bVal;
    });
    
    // Lưu vào cache để sử dụng lần sau
    cacheData(cacheKey, sortedDocuments, 300000); // Cache trong 5 phút
    
    // Lưu vào cache format cũ để tương thích
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(sortedDocuments));
      sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (e) {
      // Bỏ qua lỗi khi lưu cache
    }
    
    return sortedDocuments;
  } catch (error) {
    console.error(`Lỗi khi lấy tài liệu cho danh mục ${categoryId}:`, error);
    
    // Lỗi abort không báo cho người dùng
    if (error.name === 'AbortError') return [];
    
    // Thử sử dụng hàm gốc nếu hàm tối ưu thất bại
    try {
      console.log(`Thử dùng getDocumentsByCategory cho ${categoryId}`);
      return await getDocumentsByCategory(categoryId);
    } catch (fallbackError) {
      console.error("Cả hàm dự phòng cũng thất bại:", fallbackError);
      return [];
    }
  }
};

/**
 * Lấy câu hỏi theo tài liệu với tối ưu hiệu suất
 * @param {string} documentId - ID của tài liệu
 * @param {AbortSignal} signal - Signal để hủy request
 * @returns {Promise<Array>} Danh sách câu hỏi
 */
export const optimizedGetQuestionsByDocument = async (documentId, signal) => {
  if (!documentId) return [];
  
  // Kiểm tra cache trước khi gọi API
  const cacheKey = `questions_${documentId}`;
  
  // Chỉ lấy từ cache nếu đã từng lưu trước đó
  if (isCacheExist(cacheKey)) {
    const cachedData = getDataFromCache(cacheKey);
    if (cachedData) {
      console.log("Lấy dữ liệu câu hỏi từ cache");
      return cachedData;
    }
  }
  
  try {
    // Tạo controller nếu không được cung cấp
    const controller = signal ? null : new AbortController();
    const localSignal = signal || controller?.signal;
    
    // Sử dụng index tối ưu
    const questionsQuery = query(
      collection(db, 'questions'),
      where("documentId", "==", documentId),
      orderBy("stt", "asc"),
      limit(1000)
    );
    
    const questionsSnapshot = await getDocs(questionsQuery, { signal: localSignal });
    
    if (questionsSnapshot.empty) {
      return [];
    }
    
    const questions = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      question: doc.data().question || '',
      answer: doc.data().answer || '',
      stt: doc.data().stt || 0
    }));
    
    // Lưu vào cache để sử dụng lần sau
    cacheData(cacheKey, questions, 300000); // Cache trong 5 phút
    
    return questions;
  } catch (error) {
    console.error(`Lỗi khi lấy câu hỏi cho tài liệu:`, error);
    
    // Lỗi abort không báo cho người dùng
    if (error.name === 'AbortError') return [];
    
    // Thử lại với truy vấn không sử dụng orderBy nếu lỗi index
    if (error.code === 'failed-precondition') {
      try {
        const basicQuery = query(
          collection(db, 'questions'),
          where("documentId", "==", documentId),
          limit(1000)
        );
        
        const questionsSnapshot = await getDocs(basicQuery, { signal: localSignal });
        
        if (questionsSnapshot.empty) {
          return [];
        }
        
        const questions = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          question: doc.data().question || '',
          answer: doc.data().answer || '',
          stt: doc.data().stt || 0
        }));
        
        // Sắp xếp thủ công
        return questions.sort((a, b) => (a.stt || 0) - (b.stt || 0));
      } catch (e) {
        // Trả về mảng rỗng nếu cả hai cách đều thất bại
        console.error("Lỗi khi thử truy vấn không sắp xếp:", e);
        return [];
      }
    }
    
    // Trả về mảng rỗng thay vì ném lỗi
    return [];
  }
};

/**
 * Clear cached data for a specific document's questions
 */
export const clearDocumentQuestionCache = (documentId) => {
  if (!documentId) return;
  
  try {
    const cacheKey = `questions_${documentId}`;
    sessionStorage.removeItem(cacheKey);
    sessionStorage.removeItem(`${cacheKey}_timestamp`);
    
    // Also clear the older cache key format
    const oldCacheKey = `ques_${documentId}`;
    sessionStorage.removeItem(oldCacheKey);
    
    // Clear optimized cache key format
    const optimizedCacheKey = `ques_optimized_${documentId}`;
    sessionStorage.removeItem(optimizedCacheKey);
  } catch (e) {
    console.error("Error clearing cache:", e);
  }
};

/**
 * Track document views for anonymous users (optimized)
 */
export const trackAnonymousDocumentView = (documentId) => {
  if (!documentId) {
    return { exceeded: false, remaining: 5 };
  }
  
  try {
    // Initialize storage structure
    const storageKey = 'anonymous_document_views';
    let viewsData;
    
    try {
      const storedData = localStorage.getItem(storageKey);
      viewsData = storedData ? JSON.parse(storedData) : { documents: {} };
    } catch (error) {
      console.warn("Error reading view data from localStorage:", error);
      viewsData = { documents: {} };
    }
    
    if (!viewsData.documents) {
      viewsData.documents = {};
    }
    
    if (!viewsData.documents[documentId]) {
      viewsData.documents[documentId] = 0;
    }
    
    // Increment view count
    viewsData.documents[documentId] += 1;
    
    // Save back to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(viewsData));
    } catch (error) {
      console.warn("Error saving view data to localStorage:", error);
    }
    
    const viewCount = viewsData.documents[documentId];
    const remaining = Math.max(0, 5 - viewCount);
    
    return {
      exceeded: viewCount > 5,
      remaining: remaining
    };
  } catch (error) {
    console.error("Error tracking anonymous document view:", error);
    return { exceeded: false, remaining: 5 };
  }
};

/**
 * Get view limit data for anonymous users
 * @param {string} documentId - Document ID to check
 * @returns {Object} View limit data
 */
export const getAnonymousViewLimitData = (documentId) => {
  if (!documentId) {
    return { exceeded: false, remaining: 5 };
  }
  
  try {
    const storageKey = 'anonymous_document_views';
    let viewsData;
    
    try {
      const storedData = localStorage.getItem(storageKey);
      viewsData = storedData ? JSON.parse(storedData) : { documents: {} };
    } catch (error) {
      console.warn("Error reading view data from localStorage:", error);
      return { exceeded: false, remaining: 5 };
    }
    
    if (!viewsData.documents || !viewsData.documents[documentId]) {
      return { exceeded: false, remaining: 5 };
    }
    
    const viewCount = viewsData.documents[documentId];
    const remaining = Math.max(0, 5 - viewCount);
    
    return {
      exceeded: viewCount > 5,
      remaining: remaining,
      viewCount: viewCount
    };
  } catch (error) {
    console.error("Error getting anonymous view limit data:", error);
    return { exceeded: false, remaining: 5 };
  }
};

/**
 * Optimized batch fetching of documents by IDs
 * @param {Array} documentIds - Array of document IDs to fetch
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Array>} Array of document data
 */
export const optimizedBatchGetDocuments = async (documentIds, collectionName = 'documents') => {
  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return [];
  }
  
  try {
    // Cache key based on sorted IDs for consistency
    const sortedIds = [...documentIds].sort();
    const cacheKey = `batch_${collectionName}_${sortedIds.join('_')}`;
    
    // Check cache first
    try {
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      // Use cache if less than 5 minutes old
      if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 5 * 60 * 1000) {
        return JSON.parse(cachedData);
      }
    } catch (e) {
      console.error("Error reading from cache:", e);
      // Continue if cache reading fails
    }
    
    // Create an array of promises to get each document
    const promises = documentIds.map(id => getDoc(doc(db, collectionName, id)));
    
    // Execute all promises in parallel
    const snapshots = await Promise.all(promises);
    
    // Process results
    const documents = snapshots
      .filter(snap => snap.exists())
      .map(snap => ({
        id: snap.id,
        ...snap.data()
      }));
    
    // Cache the results
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(documents));
      sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (e) {
      console.error("Error writing to cache:", e);
      // Continue if cache writing fails
    }
    
    return documents;
  } catch (error) {
    console.error(`Error in optimizedBatchGetDocuments:`, error);
    return [];
  }
};

/**
 * Load more documents for a specific category
 * This is used for pagination/load more functionality
 * @param {string} categoryId - The ID of the category to load more documents for
 * @param {number} skip - Number of documents to skip (for pagination)
 * @param {number} limit - Maximum number of documents to return
 * @returns {Promise<Array>} - Sorted array of documents
 */
export const loadMoreDocumentsForCategory = async (categoryId, skip = 0, limit = 1000) => {
  try {
    if (!categoryId) {
      return [];
    }
    
    // Import necessary functions from Firestore service
    const { collection, query, where, orderBy, limit: firestoreLimit, getDocs, getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../firebase/firebase');
    
    // Get category data first to get the logo
    const categoryRef = doc(db, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef);
    const categoryData = categorySnap.exists() ? categorySnap.data() : {};
    const categoryLogo = categoryData.logo || null;
    
    // Query documents with pagination
    const q = query(
      collection(db, 'documents'),
      where("categoryId", "==", categoryId),
      orderBy("stt", "asc"),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Map documents and add category logo
    const documents = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        categoryLogo
      }))
      .slice(skip); // Apply skip for pagination
    
    return documents;
  } catch (error) {
    console.error(`Error loading more documents for category ${categoryId}:`, error);
    return [];
  }
};

export default {
  optimizedGetDocumentsByCategory,
  optimizedGetQuestionsByDocument,
  getAllCategoriesWithDocumentsOptimized,
  trackAnonymousDocumentView,
  getAnonymousViewLimitData,
  optimizedBatchGetDocuments,
  loadMoreDocumentsForCategory,
  clearDocumentQuestionCache,
  // Xuất các hàm cache util để có thể sử dụng ở bất kỳ đâu
  cacheData,
  getDataFromCache,
  isCacheExist
};
