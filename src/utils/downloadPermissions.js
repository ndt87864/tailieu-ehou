export function canDownloadExcel(user, isLimitedView, currentCategory, documentsInCategory) {

  
  // Admin luôn có quyền
  if (user?.role === 'admin') {
    return { allowed: true, reason: 'Admin có quyền tải Excel' };
  }

  // User full subscription có quyền
  if (user?.subscriptionType === 'full') {
    return { allowed: true, reason: 'User full subscription có quyền tải Excel' };
  }

  // User partial subscription - kiểm tra điều kiện
  if (user?.subscriptionType === 'partial') {
    // Document phải được trả phí (limitedView = false)
    if (isLimitedView) {
      return { 
        allowed: false, 
        reason: 'Chỉ có thể tải Excel cho tài liệu đã trả phí' 
      };
    }

    if (!currentCategory?.id || !documentsInCategory) {
      return {
        allowed: false,
        reason: 'Không xác định được danh mục hoặc tài liệu hiện tại'
      };
    }

    // Tính số tài liệu đã mua trong category hiện tại
    const userPaidCategories = user?.paidCategories || {};
    let paidDocumentsInCategory = 0;
    const totalDocumentsInCategory = documentsInCategory;
    
    
    // Kiểm tra cấu trúc mới: { documents: [...], categories: [...] }
    if (userPaidCategories.documents && Array.isArray(userPaidCategories.documents)) {
     
      // Tạo Set của document IDs trong category hiện tại
      const currentCategoryDocIds = new Set();
      // Giả sử documentsInCategory là số lượng, cần lấy actual document IDs từ nơi khác
      // Đây là placeholder - trong thực tế cần truyền actual document data
      
      userPaidCategories.documents.forEach(docId => {
        // Logic để kiểm tra docId có thuộc category hiện tại không
        // Cần implementation cụ thể dựa trên data structure
      });
    } else {
      const categoryData = userPaidCategories[currentCategory.id];
      
      if (categoryData?.documents && Array.isArray(categoryData.documents)) {
        paidDocumentsInCategory = categoryData.documents.length;
      }
    }
    
    // Kiểm tra >= 10% trong category hiện tại
    const percentage = totalDocumentsInCategory > 0 ? (paidDocumentsInCategory / totalDocumentsInCategory) * 100 : 0;
   
    if (percentage >= 10) {
      return { 
        allowed: true, 
        reason: `Đã mua ${paidDocumentsInCategory}/${totalDocumentsInCategory} tài liệu (${percentage.toFixed(1)}%) trong danh mục "${currentCategory.title}" - đủ điều kiện` 
      };
    } else {
      return { 
        allowed: false, 
        reason: `Cần mua ít nhất 10% tài liệu trong danh mục "${currentCategory.title}". Hiện tại: ${paidDocumentsInCategory}/${totalDocumentsInCategory} (${percentage.toFixed(1)}%)` 
      };
    }
  }

  // User khác không có quyền
  return { 
    allowed: false, 
    reason: 'Chỉ người dùng trả phí mới có quyền tải Excel' 
  };
}

// ...existing code...

/**
 * Check Excel download permission for the current user and document context
 * @param {Object} user - Current user object
 * @param {Array} categories - All categories data
 * @returns {Object} - { allowed: boolean, reason: string, percentage?: number }
 */
export async function checkExcelDownloadPermission(user, categories) {
 
  // Admin luôn có quyền
  if (user?.role === 'admin') {
    const percentage = user?.excelPercentage !== undefined ? user.excelPercentage : 100;
    return { 
      allowed: true, 
      reason: 'Admin có quyền tải Excel',
      percentage: percentage
    };
  }

  // Kiểm tra nếu Excel bị tắt cho user này
  if (user?.isExcelEnabled === false) {
    return { 
      allowed: false, 
      reason: 'Quyền tải Excel đã bị tắt cho tài khoản này' 
    };
  }

  // User full subscription có quyền (không cần kiểm tra role)
  if (user?.subscriptionType === 'full') {
    
    const percentage = user?.excelPercentage !== undefined ? user.excelPercentage : 100;
    return { 
      allowed: true, 
      reason: 'User full subscription có quyền tải Excel',
      percentage: percentage
    };
  }

  // User partial subscription - kiểm tra điều kiện 10% (không cần kiểm tra role)
  if (user?.subscriptionType === 'partial') {
    
    let totalDocuments = 0;
    if (categories && Array.isArray(categories)) {
      categories.forEach((category, index) => {
        if (category?.documentCount) {
          totalDocuments += category.documentCount;
        }
      });
    } 
    
    // Try to get paid categories from user object first
    let userPaidCategories = user?.paidCategories || {};
    
    // If paidCategories is empty or null, try to fetch from Firestore
    if (!userPaidCategories || Object.keys(userPaidCategories).length === 0) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/firebase');
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userPaidCategories = userData.paidCategories || {};
          // Update the user object with fetched data
          user.paidCategories = userPaidCategories;
        } 
      } catch (firestoreError) {
        console.error('📥 Error fetching user data from Firestore:', firestoreError);
      }
    }
    
    let paidDocumentsCount = 0;
    // Kiểm tra cấu trúc mới: { documents: [...], categories: [...] }
    if (userPaidCategories.documents && Array.isArray(userPaidCategories.documents)) {
      
      paidDocumentsCount = userPaidCategories.documents.length;
    } else {
      Object.keys(userPaidCategories).forEach(categoryId => {
        const categoryData = userPaidCategories[categoryId];
        
        if (categoryData?.documents && Array.isArray(categoryData.documents)) {
          const categoryDocCount = categoryData.documents.length;
          paidDocumentsCount += categoryDocCount;
        }
      });
    }
    // Kiểm tra >= 10%
    const percentage = totalDocuments > 0 ? (paidDocumentsCount / totalDocuments) * 100 : 0;

    if (percentage >= 10) {
      // Use user's custom percentage if set, otherwise use default 50%
      const downloadPercentage = user?.excelPercentage !== undefined ? user.excelPercentage : 50;
      const result = { 
        allowed: true, 
        reason: `Đã mua ${paidDocumentsCount}/${totalDocuments} tài liệu (${percentage.toFixed(1)}%) - đủ điều kiện tải Excel`,
        percentage: downloadPercentage
      };
      return result;
    } else {
      const result = { 
        allowed: false, 
        reason: `Cần mua ít nhất 10% tài liệu trong hệ thống để tải Excel. Hiện tại: ${paidDocumentsCount}/${totalDocuments} (${percentage.toFixed(1)}%)` 
      };
      return result;
    }
  }

  // Legacy check for role-based premium users
  if (user?.role === 'puser') {
    const percentage = user?.excelPercentage !== undefined ? user.excelPercentage : 100;
    return { 
      allowed: true, 
      reason: 'Premium user có quyền tải Excel',
      percentage: percentage
    };
  }

  // User khác không có quyền
  const result = { 
    allowed: false, 
    reason: 'Chỉ người dùng trả phí mới có quyền tải Excel' 
  };
  return result;
}

/**
 * Synchronous version for simple permission checks (admin, full subscription, legacy premium)
 * @param {Object} user - Current user object
 * @returns {Object} - { allowed: boolean, reason: string, percentage?: number } or null if needs async check
 */
export function checkExcelDownloadPermissionSync(user) {
  
  // Admin luôn có quyền
  if (user?.role === 'admin') {
    const percentage = user?.excelPercentage !== undefined ? user.excelPercentage : 100;
    return { 
      allowed: true, 
      reason: 'Admin có quyền tải Excel',
      percentage: percentage
    };
  }

  // Kiểm tra nếu Excel bị tắt cho user này
  if (user?.isExcelEnabled === false) {
    return { 
      allowed: false, 
      reason: 'Quyền tải Excel đã bị tắt cho tài khoản này' 
    };
  }

  // User full subscription có quyền
  if (user?.subscriptionType === 'full') {
    const percentage = user?.excelPercentage !== undefined ? user.excelPercentage : 100;
    return { 
      allowed: true, 
      reason: 'User full subscription có quyền tải Excel',
      percentage: percentage
    };
  }

  // Legacy check for role-based premium users
  if (user?.role === 'puser') {
    const percentage = user?.excelPercentage !== undefined ? user.excelPercentage : 100;
    return { 
      allowed: true, 
      reason: 'Premium user có quyền tải Excel',
      percentage: percentage
    };
  }

  // Partial subscription needs async check
  if (user?.subscriptionType === 'partial') {
    return null; // Indicates async check needed
  }
  return { allowed: false, reason: 'Chỉ người dùng trả phí mới có quyền tải Excel' };
}

// ...existing code...