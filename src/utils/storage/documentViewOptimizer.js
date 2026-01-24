/**
 * DocumentView Performance Optimizer Module
 * Cung cấp các hàm tối ưu hóa hiệu suất cho trang DocumentView
 */
import { db } from '../../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, updateDoc, writeBatch, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '../../firebase/firestoreService';
import { getAppSettings } from '../../firebase/appSettingsService';

// Cache cho dữ liệu để tránh truy vấn lặp lại
const cache = {
  categories: null,
  documents: {},
  questions: {},
  userAccess: {},
  docViews: {},
  // Thời gian hết hạn: 5 phút
  expiry: 5 * 60 * 1000
};

// Timestamps để kiểm soát thời gian sống của cache
const timestamps = {
  categories: 0,
  documents: {},
  questions: {},
  userAccess: {},
};

/**
 * Lấy tất cả danh mục với bộ đệm
 */
export const getCachedCategories = async () => {
  // Kiểm tra cache còn hạn sử dụng không
  if (cache.categories && Date.now() - timestamps.categories < cache.expiry) {
    return cache.categories;
  }

  try {
    const categoriesCollection = collection(db, COLLECTIONS.CATEGORIES);
    const categoriesSnapshot = await getDocs(categoriesCollection);
    const categoriesData = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Lưu vào cache
    cache.categories = categoriesData;
    timestamps.categories = Date.now();
    
    return categoriesData;
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy tài liệu theo danh mục với bộ đệm
 * @param {string} categoryId - ID của danh mục
 */
export const getCachedDocumentsByCategory = async (categoryId) => {
  // Kiểm tra cache còn hạn sử dụng không
  if (cache.documents[categoryId] && 
      Date.now() - timestamps.documents[categoryId] < cache.expiry) {
    return cache.documents[categoryId];
  }

  try {
    const documentsQuery = query(
      collection(db, COLLECTIONS.DOCUMENTS),
      where("categoryId", "==", categoryId)
    );
    const documentsSnapshot = await getDocs(documentsQuery);
    const documentsData = documentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Lưu vào cache
    cache.documents[categoryId] = documentsData;
    timestamps.documents[categoryId] = Date.now();
    
    return documentsData;
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy câu hỏi theo tài liệu với bộ đệm
 * @param {string} documentId - ID của tài liệu
 */
export const getCachedQuestionsByDocument = async (documentId) => {
  // Kiểm tra cache còn hạn sử dụng không
  if (cache.questions[documentId] && 
      Date.now() - timestamps.questions[documentId] < cache.expiry) {
    return cache.questions[documentId];
  }

  try {
    const questionsQuery = query(
      collection(db, COLLECTIONS.QUESTIONS),
      where("documentId", "==", documentId)
    );
    const questionsSnapshot = await getDocs(questionsQuery);
    const questionsData = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Lưu vào cache
    cache.questions[documentId] = questionsData;
    timestamps.questions[documentId] = Date.now();
    
    return questionsData;
  } catch (error) {
    throw error;
  }
};

/**
 * Xóa cache cho câu hỏi theo tài liệu cụ thể
 * @param {string} documentId - ID của tài liệu
 */
export const clearQuestionsCache = (documentId) => {
  if (documentId) {
    delete cache.questions[documentId];
    delete timestamps.questions[documentId];
  }
};

/**
 * Kiểm tra quyền truy cập tài liệu cho người dùng một phần
 * @param {string} userId - ID người dùng
 * @param {string} documentId - ID tài liệu
 */
// ...existing code...

export const checkPartialUserAccess = async (userId, documentId) => {
  const cacheKey = `${userId}_${documentId}`;
  
  // Kiểm tra cache
  if (cache.userAccess[cacheKey] !== undefined &&
      Date.now() - timestamps.userAccess[cacheKey] < cache.expiry) {
    return cache.userAccess[cacheKey];
  }
  
  try {
    if (!userId || !documentId) return false;
    
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    
    if (!userData.paidCategories) return false;
    
    //  KIỂM TRA THEO CẤU TRÚC THỰC TẾ
    const paidCategories = userData.paidCategories;
    
    // Method 1: Kiểm tra trong paidCategories.documents[]
    if (paidCategories.documents && Array.isArray(paidCategories.documents)) {
      if (paidCategories.documents.includes(documentId)) {
        cache.userAccess[cacheKey] = true;
        timestamps.userAccess[cacheKey] = Date.now();
        return true;
      }
    }
    
    // Method 2: Kiểm tra theo cấu trúc cũ
    for (const categoryId in paidCategories) {
      if (categoryId === 'documents' || categoryId === 'categories') continue;
      
      const documentsInCategory = paidCategories[categoryId] || [];
      if (Array.isArray(documentsInCategory) && documentsInCategory.includes(documentId)) {
        
        cache.userAccess[cacheKey] = true;
        timestamps.userAccess[cacheKey] = Date.now();
        return true;
      }
    }
    
    // Lưu vào cache
    cache.userAccess[cacheKey] = false;
    timestamps.userAccess[cacheKey] = Date.now();
    return false;
  } catch (error) {
    console.error('Error checking partial user access:', error);
    return false;
  }
};

// ...existing code...
/**
 * Tối ưu hóa việc theo dõi lượt xem tài liệu
 * @param {string} userId - ID người dùng, null cho người dùng ẩn danh
 * @param {string} documentId - ID tài liệu
 */
export const optimizedTrackDocumentView = async (userId, documentId) => {
  if (!documentId) {
    return { exceeded: false, remaining: null };
  }
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const cacheKey = userId ? `${userId}_${documentId}_${today}` : `anon_${documentId}_${today}`;
  
  // Sử dụng cache để giảm số lượng truy vấn
  if (cache.docViews[cacheKey] !== undefined) {
    return cache.docViews[cacheKey];
  }
  
  // Cho người dùng đã đăng nhập
  if (userId) {
    try {
      const viewsRef = doc(db, 'documentViews', `${userId}_${today}`);
      const viewsSnapshot = await getDoc(viewsRef);
      
      let viewsData = viewsSnapshot.exists() ? viewsSnapshot.data() : { documents: {} };
      
      if (!viewsData.documents[documentId]) {
        viewsData.documents[documentId] = 0;
      }
      
      viewsData.documents[documentId] += 1;
      
      // Sử dụng setDoc thay vì updateDoc để giảm chi phí đọc trước khi ghi
      await setDoc(viewsRef, {
        userId,
        date: today,
        documents: viewsData.documents,
        updatedAt: serverTimestamp()
      });
      
      const viewCount = viewsData.documents[documentId];
      const remaining = Math.max(0, 5 - viewCount);
      const result = {
        exceeded: viewCount > 5,
        remaining: remaining
      };
      
      // Lưu kết quả vào cache
      cache.docViews[cacheKey] = result;
      
      return result;
    } catch (error) {
      console.error("Error tracking document view:", error);
      return { exceeded: false, remaining: 5 };
    }
  } 
  // Người dùng ẩn danh, sử dụng localStorage để theo dõi
  else {
    try {
      // Lấy từ localStorage
      let anonViews;
      try {
        const storedViews = localStorage.getItem('anonDocumentViews');
        anonViews = storedViews ? JSON.parse(storedViews) : {};
      } catch (e) {
        anonViews = {};
      }
      
      // Kiểm tra ngày
      if (!anonViews[today]) {
        anonViews[today] = {};
      }
      
      // Kiểm tra tài liệu
      if (!anonViews[today][documentId]) {
        anonViews[today][documentId] = 0;
      }
      
      // Tăng lượt xem
      anonViews[today][documentId] += 1;
      
      // Lưu trở lại localStorage
      try {
        localStorage.setItem('anonDocumentViews', JSON.stringify(anonViews));
      } catch (e) {
        // Bỏ qua lỗi nếu localStorage không khả dụng
      }
      
      const viewCount = anonViews[today][documentId];
      const remaining = Math.max(0, 5 - viewCount);
      const result = {
        exceeded: viewCount > 5,
        remaining: remaining
      };
      
      // Lưu kết quả vào cache
      cache.docViews[cacheKey] = result;
      
      return result;
    } catch (error) {
      return { exceeded: false, remaining: 5 };
    }
  }
};

// ...existing code...

/**
// ...existing code...

/**
 * Tải dữ liệu song song cho một tài liệu cụ thể
 * @param {string} categoryId - ID danh mục
 * @param {string} documentId - ID tài liệu
 * @param {boolean} isAdmin - Người dùng có phải admin không
 * @param {boolean} isPuser - Người dùng có phải premium không
 * @param {object} user - Đối tượng người dùng đang đăng nhập
 * @param {object} document - Đối tượng tài liệu để kiểm tra VIP
 */
// ...existing code...

export const loadDocumentWithParallelQueries = async (categoryId, documentId, isAdmin, isPuser, user, document = null) => {
  try {

    //  QUAN TRỌNG: Kiểm tra VIP access TRƯỚC KHI tải câu hỏi
    if (document?.isVip) {
      
      // Import checkVipDocumentAccess function
      const { checkVipDocumentAccess } = await import('../../firebase/documentService');
      const vipAccessResult = checkVipDocumentAccess(user, document);
    
      
      //  Nếu không có quyền truy cập VIP, trả về rỗng ngay lập tức
      if (!vipAccessResult.hasAccess) {
        return {
          questions: [],
          limitedView: false,
          viewLimitExceeded: false,
          viewsRemaining: 0,
          vipAccessDenied: true,
          vipAccessReason: vipAccessResult.reason
        };
      }
    }


    // Determine effective subscription type: treat logged-in users with no subscriptionType as 'free'
    const effectiveSubscription = user ? (user.subscriptionType ?? 'free') : null;

    // Tải song song các truy vấn khác nhau
    const [questions, viewTrackResult, userAccessCheck] = await Promise.all([
      // 1. Lấy danh sách câu hỏi
      getCachedQuestionsByDocument(documentId),
      
      // 2. Theo dõi lượt xem
      optimizedTrackDocumentView(user?.uid, documentId),
      
      // 3. Kiểm tra quyền truy cập cho người dùng partial (nếu cần)
      effectiveSubscription === 'partial' ? checkPartialUserAccess(user.uid, documentId) : Promise.resolve(false)
    ]);
    //  QUAN TRỌNG: Admin luôn có quyền truy cập đầy đủ
    if (isAdmin || user?.role === "admin") {
      return {
        questions,
        limitedView: false,
        viewLimitExceeded: false,
        viewsRemaining: null
      };
    }
    
    //  QUAN TRỌNG: Ưu tiên subscriptionType hơn role legacy

    // Full subscription users có quyền truy cập đầy đủ
    if (effectiveSubscription === 'full') {
      return {
        questions,
        limitedView: false,
        viewLimitExceeded: false,
        viewsRemaining: null
      };
    }
      // Partial subscription users
    if (effectiveSubscription === 'partial') {
      
      if (userAccessCheck) {
        return {
          questions,
          limitedView: false,
          viewLimitExceeded: false,
          viewsRemaining: null
        };
      } else {
        
        //  QUAN TRỌNG: Nếu là tài liệu VIP và user chưa trả phí, trả về VIP access denied
        if (document?.isVip) {
          return {
            questions: [],
            limitedView: false,
            viewLimitExceeded: false,
            viewsRemaining: 0,
            vipAccessDenied: true,
            vipAccessReason: "Tài liệu VIP này không có trong gói trả phí của bạn. Vui lòng mua thêm hoặc nâng cấp lên gói toàn bộ."
          };
        }
        
        // Nếu không phải VIP document, áp dụng logic view limit thông thường
        if (viewTrackResult.exceeded) {
          return {
            questions: [],
            limitedView: true,
            viewLimitExceeded: true,
            viewsRemaining: 0
          };
        } else {
          // Determine percent to show based on app settings
          let pct = 50; // fallback
          try {
            const settings = await getAppSettings();
            const rates = (settings && settings.questionRates) || {};
            pct = rates.paidPerCategoryDefault ?? rates.free ?? 50;
          } catch (e) {
            // ignore and use fallback
          }

          const sliceCount = Math.max(1, Math.ceil((questions.length * pct) / 100));
          return {
            questions: questions.slice(0, sliceCount),
            limitedView: true,
            viewLimitExceeded: false,
            viewsRemaining: viewTrackResult.remaining
          };
        }
      }
    }
    
    //  QUAN TRỌNG: CHỈ CHO PHÉP legacy puser/isPuser NẾU KHÔNG CÓ subscriptionType
    if ((isPuser || user?.role === 'puser') && !user?.subscriptionType) {
      return {
        questions,
        limitedView: false,
        viewLimitExceeded: false,
        viewsRemaining: null
      };
    }

    // Legacy premium users (chỉ nếu không có subscriptionType)
    const userIsPremium = user && !user.subscriptionType ? 
      (user.role === 'premium' || user.isPremium === true) : 
      false;
    
    if (userIsPremium) {
      return {
        questions,
        limitedView: false,
        viewLimitExceeded: false,
        viewsRemaining: null
      };
    }
    if (viewTrackResult.exceeded) {
      return {
        questions: [],
        limitedView: true,
        viewLimitExceeded: true,
        viewsRemaining: 0
      };
    } else {
      // Default for anonymous / free / legacy non-paid users: use app settings
      let pct = 20;
      try {
        const settings = await getAppSettings();
        const rates = (settings && settings.questionRates) || {};
        if (effectiveSubscription === 'free') {
          pct = rates.free ?? 50;
        } else if (effectiveSubscription === null) {
          // anonymous
          pct = rates.guest ?? 20;
        } else {
          // any other logged-in subscription type not handled earlier => fallback to guest behavior
          pct = rates.guest ?? 20;
        }
      } catch (e) {
        // ignore and use fallback
      }

      const sliceCount = Math.max(1, Math.ceil((questions.length * pct) / 100));
      return {
        questions: questions.slice(0, sliceCount),
        limitedView: true,
        viewLimitExceeded: false,
        viewsRemaining: viewTrackResult.remaining
      };
    }
  } catch (error) {
    console.error("Error in loadDocumentWithParallelQueries:", error);
    throw error;
  }
};

// ...existing code...
//  * Reset tất cả cache
//  */
export const resetAllCaches = () => {
  cache.categories = null;
  cache.documents = {};
  cache.questions = {};
  cache.userAccess = {};
  cache.docViews = {};
  
  timestamps.categories = 0;
  timestamps.documents = {};
  timestamps.questions = {};
  timestamps.userAccess = {};
};

/**
 * Tự động sắp xếp lại số thứ tự (stt) của các câu hỏi trong một tài liệu
 * @param {string} documentId - ID của tài liệu chứa các câu hỏi cần sắp xếp lại
 * @returns {Promise<{success: boolean, message: string, updatedCount: number}>} Kết quả thực hiện
 */
export const reorderQuestionNumbers = async (documentId) => {
  if (!documentId) {
    return {
      success: false,
      message: "ID tài liệu không hợp lệ",
      updatedCount: 0
    };
  }

  try {
    // Lấy tất cả câu hỏi của tài liệu và sắp xếp theo stt hiện tại
    const questionsQuery = query(
      collection(db, COLLECTIONS.QUESTIONS),
      where("documentId", "==", documentId),
      orderBy("stt", "asc")
    );

    const questionsSnapshot = await getDocs(questionsQuery);
    
    if (questionsSnapshot.empty) {
      return {
        success: true,
        message: "Không có câu hỏi nào để sắp xếp lại",
        updatedCount: 0
      };
    }

    // Sử dụng batch để cập nhật nhiều tài liệu cùng lúc
    const batch = writeBatch(db);
    let updatedCount = 0;

    // Duyệt qua từng câu hỏi và cập nhật stt từ 1 -> n
    questionsSnapshot.docs.forEach((questionDoc, index) => {
      const newStt = index + 1;
      const currentStt = questionDoc.data().stt || 0;
      
      // Chỉ cập nhật nếu stt mới khác stt cũ
      if (newStt !== currentStt) {
        const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionDoc.id);
        batch.update(questionRef, { 
          stt: newStt,
          updatedAt: new Date()
        });
        updatedCount++;
      }
    });

    // Thực hiện batch update
    if (updatedCount > 0) {
      await batch.commit();
      
      // Xóa cache cho document này để đảm bảo dữ liệu mới được load
      clearQuestionsCache(documentId);
    }

    return {
      success: true,
      message: `Đã cập nhật ${updatedCount} câu hỏi với số thứ tự mới`,
      updatedCount
    };
  } catch (error) {
    console.error("Lỗi khi sắp xếp lại số thứ tự câu hỏi:", error);
    return {
      success: false,
      message: `Lỗi: ${error.message}`,
      updatedCount: 0
    };
  }
};

/**
 * Tự động sắp xếp lại số thứ tự (stt) của các câu hỏi trong tất cả tài liệu
 * @returns {Promise<{success: boolean, message: string, totalUpdated: number}>} Kết quả thực hiện
 */
export const reorderAllQuestionNumbers = async () => {
  try {
    // Lấy tất cả tài liệu
    const documentsQuery = query(collection(db, COLLECTIONS.DOCUMENTS));
    const documentsSnapshot = await getDocs(documentsQuery);
    
    if (documentsSnapshot.empty) {
      return {
        success: true,
        message: "Không có tài liệu nào để xử lý",
        totalUpdated: 0
      };
    }

    let totalUpdated = 0;
    const results = [];

    // Xử lý từng tài liệu
    for (const docSnapshot of documentsSnapshot.docs) {
      const documentId = docSnapshot.id;
      const result = await reorderQuestionNumbers(documentId);
      
      if (result.success) {
        totalUpdated += result.updatedCount;
      }
      
      results.push({
        documentId,
        documentTitle: docSnapshot.data().title || 'Không có tiêu đề',
        ...result
      });
    }

    return {
      success: true,
      message: `Đã sắp xếp lại số thứ tự câu hỏi cho ${documentsSnapshot.size} tài liệu, cập nhật ${totalUpdated} câu hỏi`,
      totalUpdated,
      details: results
    };
  } catch (error) {
    console.error("Lỗi khi sắp xếp lại tất cả số thứ tự câu hỏi:", error);
    return {
      success: false,
      message: `Lỗi: ${error.message}`,
      totalUpdated: 0
    };
  }
};

export default {
  getCachedCategories,
  getCachedDocumentsByCategory,
  getCachedQuestionsByDocument,
  clearQuestionsCache,
  checkPartialUserAccess,
  optimizedTrackDocumentView,
  loadDocumentWithParallelQueries,
  resetAllCaches,
  reorderQuestionNumbers,
  reorderAllQuestionNumbers
};
