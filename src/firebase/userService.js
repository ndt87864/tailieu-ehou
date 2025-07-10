import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  increment,
  orderBy,
  limit as fsLimit,
  startAfter
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
export const COLLECTIONS = {
  CATEGORIES: "categories",
  DOCUMENTS: "documents",
  QUESTIONS: "questions",
  USER_PREFERENCES: "userPreferences",
  USERS: "users" 
};

export const saveUserThemePreference = async (userId, themePrefs) => {
  try {
    if (!userId) {
      console.warn('No user ID provided to saveUserThemePreference');
      return;
    }
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const docSnap = await getDoc(userPrefsRef);
    
    if (docSnap.exists()) {
      await updateDoc(userPrefsRef, {
        theme: {
          isDarkMode: themePrefs.isDarkMode,
          themeColor: themePrefs.themeColor
        },
        updatedAt: new Date()
      });
    } else {
      await setDoc(userPrefsRef, {
        userId,
        theme: {
          isDarkMode: themePrefs.isDarkMode,
          themeColor: themePrefs.themeColor
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user theme preference:', error);
    throw error;
  }
};

export const getUserThemePreference = async (userId) => {
  try {
    if (!userId) {
      console.warn('No user ID provided to getUserThemePreference');
      return null;
    }
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const docSnap = await getDoc(userPrefsRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.theme) {
        return {
          isDarkMode: data.theme.isDarkMode,
          themeColor: data.theme.themeColor
        };
      } else {
        if (data.isDarkMode !== undefined || data.themeColor) {
          return {
            isDarkMode: data.isDarkMode !== undefined ? data.isDarkMode : false,
            themeColor: data.themeColor || 'default'
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user theme preference:', error);
    return null;
  }
};

export const saveUserPreferences = async (userId, preferences) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to save preferences");
    }
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    await setDoc(userPrefsRef, {
      ...preferences,
      updatedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user preferences:", error);
    throw error;
  }
};

export const getUserPreferences = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to get preferences");
    }
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    throw error;
  }
};

export const updateUserPreference = async (userId, key, value) => {
  try {
    const docRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const updateData = {};
      updateData[key] = value;
      updateData.updatedAt = new Date();
      await updateDoc(docRef, updateData);
    } else {
      const newData = { updatedAt: new Date() };
      newData[key] = value;
      await setDoc(docRef, newData);
    }
    return true;
  } catch (error) {
    console.error(`Error updating user preference (${key}):`, error);
    throw error;
  }
};

export const saveUserToFirestore = async (userId, userData) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data();
      const userDataWithRole = {
        ...userData,
        role: existingData.role || userData.role || 'fuser', 
        createdAt: existingData.createdAt || new Date(),
        updatedAt: new Date()
      };
      await updateDoc(userRef, userDataWithRole);
    } else {
      const userDataWithRole = {
        ...userData,
        role: userData.role || 'fuser', 
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(userRef, userDataWithRole);
    }
    return true;
  } catch (error) {
    console.error("Lỗi khi lưu thông tin người dùng:", error);
    throw error;
  }
};

export const getUserRole = async (userId) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.role || 'fuser'; 
    }
    return 'fuser'; 
  } catch (error) {
    console.error("Lỗi khi lấy vai trò người dùng:", error);
    return 'fuser'; 
  }
};

export const getAllUsers = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.USERS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

export const updateUserSubscriptionType = async (userId, subscriptionType) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      subscriptionType: subscriptionType,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating user subscription type:", error);
    throw error;
  }
};

export const updateUserRole = async (userId, newRole) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const updateData = {
      role: newRole,
      updatedAt: new Date()
    };
    
    if (newRole !== 'puser') {
      updateData.subscriptionType = null;
    } else {
      updateData.subscriptionType = 'full';
    }
    
    await updateDoc(userRef, updateData);
    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật vai trò người dùng:", error);
    throw error;
  }
};

export const deleteUserFromFirestore = async (userId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa người dùng:", error);
    throw error;
  }
};

export const deleteUserAuthentication = async (userId) => {
  try {
    return {
      success: false,
      message: 'Không thể xóa người dùng khỏi Authentication, chỉ xóa được khỏi Firestore.'
    };
  } catch (error) {
    console.error('Lỗi khi xóa người dùng từ Authentication:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const loginSession = async (userId, currentSessionId) => {
  try {
    if (!userId) {
      console.error("Thiếu thông tin userId");
      return false;
    }
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    await setDoc(userPrefsRef, {
      isLoggedIn: true
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error("Lỗi khi ghi nhận thông tin đăng nhập:", error);
    return false;
  }
};

export const endAllOtherSessions = loginSession;

export const checkAndUpdateDocumentView = async (userId, documentId) => {
  try {
    if (!userId || !documentId) {
      return { 
        canView: false, 
        reason: 'missing_params',
        message: 'Thiếu thông tin người dùng hoặc tài liệu'
      };
    }
    
    const userDoc = await getUserData(userId);
    const userRole = userDoc?.role || 'fuser';
    
    if (userRole === 'puser') {
      const subscriptionType = userDoc?.subscriptionType || 'full';
      
      if (subscriptionType === 'full') {
        return { 
          canView: true, 
          reason: 'premium_full',
          message: 'Người dùng có quyền xem không giới hạn'
        };
      } else if (subscriptionType === 'partial') {
        const docRef = doc(db, COLLECTIONS.DOCUMENTS, documentId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          return {
            canView: false,
            reason: 'document_not_found',
            message: 'Không tìm thấy tài liệu'
          };
        }
        
        const documentData = docSnap.data();
        const categoryId = documentData.categoryId;
        
        const userPurchasesRef = doc(db, 'userPurchases', userId);
        const userPurchasesSnap = await getDoc(userPurchasesRef);
        
        if (userPurchasesSnap.exists()) {
          const purchases = userPurchasesSnap.data().categories || [];
          
          if (purchases.includes(categoryId)) {
           return {
              canView: true,
              reason: 'premium_partial_purchased',
              message: 'Người dùng đã mua quyền truy cập mục này'
            };
          } else {
            return {
              canView: false,
              reason: 'premium_partial_not_purchased',
              message: 'Bạn cần mua quyền truy cập mục này để xem tài liệu'
            };
          }
        } else {
          return {
            canView: false,
            reason: 'premium_partial_no_purchases',
            message: 'Bạn cần mua quyền truy cập mục này để xem tài liệu'
          };
        }
      }
    }
    
    if (userRole === 'admin') {
      return { 
        canView: true, 
        reason: 'admin_user',
        message: 'Người dùng có quyền xem không giới hạn'
      };
    }
    
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    let documentViews = {};
    let needsUpdate = false;
    
    if (userPrefsDoc.exists()) {
      const userPrefs = userPrefsDoc.data();
      documentViews = userPrefs.documentViews || {};
      
      if (!documentViews[dateKey]) {
        documentViews[dateKey] = {};
        needsUpdate = true;
      }
      
      if (!documentViews[dateKey][documentId]) {
        documentViews[dateKey][documentId] = 0;
        needsUpdate = true;
      }
      
      if (documentViews[dateKey][documentId] >= 5) {
        return {
          canView: false,
          reason: 'limit_exceeded',
          viewCount: documentViews[dateKey][documentId],
          maxViews: 5,
          message: 'Bạn đã xem tài liệu này 5 lần trong ngày hôm nay. Vui lòng nâng cấp tài khoản để xem không giới hạn.'
        };
      }
      
      documentViews[dateKey][documentId]++;
      needsUpdate = true;
      
    } else {
      documentViews = {
        [dateKey]: {
          [documentId]: 1
        }
      };
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await setDoc(userPrefsRef, {
        documentViews: documentViews,
        updatedAt: new Date()
      }, { merge: true });
    }
    
    return {
      canView: true,
      viewCount: documentViews[dateKey][documentId],
      maxViews: 5,
      remaining: 5 - documentViews[dateKey][documentId],
      message: `Bạn đã xem tài liệu này ${documentViews[dateKey][documentId]}/5 lần hôm nay.`
    };
    
  } catch (error) {
    console.error("Lỗi khi kiểm tra lượt xem tài liệu:", error);
    return {
      canView: true,
      reason: 'error',
      error: error.message,
      message: 'Đã xảy ra lỗi khi kiểm tra lượt xem tài liệu'
    };
  }
};

export const canViewDocument = async (userId, documentId) => {
  try {
    if (!userId || !documentId) {
      return { 
        canView: false, 
        reason: 'missing_params' 
      };
    }
    
    const userRole = await getUserRole(userId);
    
    if (userRole !== 'fuser') {
      return { 
        canView: true, 
        reason: 'premium_user' 
      };
    }
    
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (!userPrefsDoc.exists()) {
      return { 
        canView: true, 
        viewCount: 0,
        remaining: 5
      };
    }
    
    const userPrefs = userPrefsDoc.data();
    const documentViews = userPrefs.documentViews || {};
    
    if (!documentViews[dateKey] || !documentViews[dateKey][documentId]) {
      return { 
        canView: true,
        viewCount: 0,
        remaining: 5
      };
    }
    
    const viewCount = documentViews[dateKey][documentId];
    
    if (viewCount >= 5) {
      return {
        canView: false,
        reason: 'limit_exceeded',
        viewCount,
        maxViews: 5,
        remaining: 0
      };
    }
    
    return {
      canView: true,
      viewCount,
      remaining: 5 - viewCount,
      maxViews: 5
    };
    
  } catch (error) {
    console.error("Lỗi khi kiểm tra quyền xem tài liệu:", error);
    return {
      canView: false,
      reason: 'error',
      error: error.message
    };
  }
};

export const getViewedDocumentsToday = async (userId) => {
  try {
    if (!userId) {
      return [];
    }
    
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (!userPrefsDoc.exists()) {
      return [];
    }
    
    const userPrefs = userPrefsDoc.data();
    const documentViews = userPrefs.documentViews || {};
    const todayViews = documentViews[dateKey] || {};
    
    const documentIds = Object.keys(todayViews);
    
    if (documentIds.length === 0) {
      return [];
    }
    
    const viewedDocuments = [];
    
    for (const docId of documentIds) {
      try {
        const docRef = doc(db, COLLECTIONS.DOCUMENTS, docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const docData = docSnap.data();
          
          const categoryRef = doc(db, COLLECTIONS.CATEGORIES, docData.categoryId || '');
          const categorySnap = await getDoc(categoryRef);
          const categoryData = categorySnap.exists() ? categorySnap.data() : {};
          
          viewedDocuments.push({
            id: docId,
            title: docData.title || 'Không có tiêu đề',
            slug: docData.slug || '',
            categoryId: docData.categoryId || '',
            categoryTitle: categoryData.title || 'Không có danh mục',
            categoryLogo: categoryData.logo || null,
            viewCount: todayViews[docId],
            maxViews: 5,
            remaining: Math.max(0, 5 - todayViews[docId]),
            percentUsed: (todayViews[docId] / 5) * 100
          });
        }
      } catch (error) {
        console.error(`Lỗi khi lấy thông tin tài liệu ${docId}:`, error);
      }
    }
    
    return viewedDocuments.sort((a, b) => b.viewCount - a.viewCount);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tài liệu đã xem:", error);
    return [];
  }
};

export const setUserLoggedOut = async (userId) => {
  try {
    if (!userId) {
      console.error("Thiếu thông tin userId");
      return false;
    }
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    await setDoc(userPrefsRef, {
      isLoggedIn: false,
      lastLogout: new Date()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error("Lỗi khi ghi nhận thông tin đăng xuất:", error);
    return false;
  }
};

export const loginWithDeviceId = async (userId, deviceId) => {
  try {
    if (!userId) {
      console.error("Thiếu thông tin userId");
      return { success: false };
    }
    
    const currentDeviceId = deviceId || `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    await setDoc(userPrefsRef, {
      isLoggedIn: true,
      currentDeviceId: currentDeviceId,
      lastLogin: new Date()
    }, { merge: true });
    
    return { success: true, deviceId: currentDeviceId };
  } catch (error) {
    console.error("Lỗi khi ghi nhận thông tin đăng nhập:", error);
    return { success: false };
  }
};

export const verifyCurrentDevice = async (userId, deviceId) => {
  try {
    if (!userId || !deviceId) {
      return false;
    }
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (!userPrefsDoc.exists()) {
      return true;
    }
    
    const userPrefs = userPrefsDoc.data();
    return userPrefs.currentDeviceId === deviceId;
  } catch (error) {
    console.error("Lỗi khi kiểm tra thiết bị hiện tại:", error);
    return true;
  }
};

export const checkUserAlreadyLoggedIn = async (userId) => {
  try {
    if (!userId) {
      return { 
        canLogin: false,
        message: "Thiếu thông tin người dùng"
      };
    }
    
    const userPrefsRef = doc(db, COLLECTIONS.USER_PREFERENCES, userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists() && userPrefsDoc.data().isLoggedIn === true) {
      return {
        canLogin: true,
        message: "Tài khoản đã được đăng nhập ở thiết bị khác. Thiết bị đó sẽ bị đăng xuất.",
        alreadyLoggedIn: true
      };
    }
    
    return {
      canLogin: true,
      message: "Có thể đăng nhập",
      alreadyLoggedIn: false
    };
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái đăng nhập:", error);
    return {
      canLogin: true,
      message: "Có lỗi khi kiểm tra trạng thái đăng nhập, cho phép đăng nhập",
      alreadyLoggedIn: false
    };
  }
};

// Đảm bảo hàm getUserData lấy được accessibleVipDocuments
export const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Make sure to include all VIP access related fields
      return {
        ...userData,
        accessibleVipDocuments: userData.accessibleVipDocuments || [],
        subscriptionType: userData.subscriptionType || "free",
        role: userData.role || "user",
        isExcelEnabled: userData.isExcelEnabled,
        excelPercentage: userData.excelPercentage
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const checkLoginStatus = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return { isLoggedIn: false, userData: null };
    }
    
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = {
        id: currentUser.uid,
        email: currentUser.email,
        ...userDocSnap.data()
      };
      
      return {
        isLoggedIn: true,
        userData: userData
      };
    } else {
      return { 
        isLoggedIn: true, 
        userData: {
          id: currentUser.uid,
          email: currentUser.email,
          role: 'user',
          isPremium: false
        } 
      };
    }
  } catch (error) {
    console.error("Error checking login status:", error);
    return { isLoggedIn: false, userData: null, error: error.message };
  }
};

export const createUserProfile = async (userId, userData = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to create a profile');
    }
    
    const userDocRef = doc(db, "users", userId);
    const userSnapshot = await getDoc(userDocRef);
    
    if (!userSnapshot.exists()) {
      const userDataToSave = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: userData.role || 'user',
        isPremium: userData.isPremium || false
      };
      
      try {
        await setDoc(userDocRef, userDataToSave);
        return {
          id: userId,
          ...userDataToSave
        };
      } catch (error) {
        console.error("Error creating user profile:", error);
        throw error;
      }
    } else {
      return {
        id: userId,
        ...userSnapshot.data()
      };
    }
  } catch (error) {
    console.error("Error in createUserProfile:", error);
    throw error;
  }
};

export const updateUserData = async (userId, userData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to update profile');
    }
    
    const userDocRef = doc(db, "users", userId);
    
    const dataToUpdate = {
      ...userData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(userDocRef, dataToUpdate);
    
    return {
      id: userId,
      ...userData
    };
  } catch (error) {
    console.error("Error updating user data:", error);
    throw error;
  }
};

export const updateUserProfile = async (uid, profileData) => {
  try {
    if (!uid) throw new Error('User ID is required');
    
    const db = getFirestore();
    const userRef = doc(db, 'users', uid);
    
    const allowedFields = ['displayName', 'phoneNumber', 'email'];
    const sanitizedData = {};
    
    for (const field of allowedFields) {
      if (profileData[field] !== undefined) {
        sanitizedData[field] = profileData[field];
      }
    }
    
    sanitizedData.updatedAt = serverTimestamp();
    
    await updateDoc(userRef, sanitizedData);
    
    const updatedUserDoc = await getDoc(userRef);
    
    if (!updatedUserDoc.exists()) {
      throw new Error('User not found after update');
    }
    return { 
      ...updatedUserDoc.data(),
      id: updatedUserDoc.id 
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const updateUserPaidCategories = async (userId, paidCategoriesData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to update paid categories');
    }
    
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    
    await updateDoc(userRef, {
      paidCategories: paidCategoriesData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user paid categories:', error);
    throw error;
  }
};

export const getUserStatistics = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.USERS), limit(10000));
    const querySnapshot = await getDocs(q);
    
    let stats = {
      totalUsers: 0,
      freeUsers: 0,
      premiumUsers: 0,
      partialPremiumUsers: 0,
      fullPremiumUsers: 0,
      adminUsers: 0
    };
    
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      stats.totalUsers++;
      
      if (userData.role === 'admin') {
        stats.adminUsers++;
      } else if (userData.role === 'puser') {
        stats.premiumUsers++;
        
        if (userData.subscriptionType === 'partial') {
          stats.partialPremiumUsers++;
        } else {
          stats.fullPremiumUsers++;
        }
      } else {
        stats.freeUsers++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error("Error getting user statistics:", error);
    throw error;
  }
};

export const getActiveUsersCount = async (dayThreshold = 7) => {
  try {
    const timeThreshold = new Date();
    timeThreshold.setDate(timeThreshold.getDate() - dayThreshold);
    
    const stats = await getUserStatistics();
    return Math.round(stats.totalUsers * 0.6);
  } catch (error) {
    console.error("Error getting active users count:", error);
    return 0;
  }
};

export const getUserGrowthData = async (months = 12) => {
  try {
    const endDate = new Date();
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.round(100 + i * 25 + Math.random() * 50)
      });
    }
    
    return data;
  } catch (error) {
    console.error("Error getting user growth data:", error);
    return [];
  }
};

export const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      isOnline: isOnline,
      lastActivityTime: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error updating user online status:", error);
    throw error;
  }
};

export const setUserOffline = async (userId) => {
  try {
    if (!userId) return false;
    return await updateUserOnlineStatus(userId, false);
  } catch (error) {
    console.error("Error setting user offline:", error);
    return false;
  }
};

export const setUserOnline = async (userId) => {
  try {
    if (!userId) return false;
    return await updateUserOnlineStatus(userId, true);
  } catch (error) {
    console.error("Error setting user online:", error);
    return false;
  }
};

export const incrementAnonymousVisitor = async () => {
  try {
    const statsRef = doc(db, 'siteStats', 'visitors');
    const statsDoc = await getDoc(statsRef, { source: 'cache' })
      .catch(() => getDoc(statsRef));
    
    if (statsDoc.exists()) {
      await updateDoc(statsRef, {
        anonymousCount: increment(1),
        lastUpdated: serverTimestamp()
      });
    } else {
      await setDoc(statsRef, {
        anonymousCount: 1,
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Lỗi khi tăng số lượng khách truy cập:", error);
  }
};

export const decrementAnonymousVisitor = async () => {
  try {
    const statsRef = doc(db, 'siteStats', 'visitors');
    await updateDoc(statsRef, {
      anonymousCount: increment(-1),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error("Lỗi khi giảm số lượng khách truy cập:", error);
  }
};

export const getAnonymousVisitorCount = async () => {
  try {
    try {
      const statsRef = doc(db, 'siteStats', 'visitors');
      const statsDoc = await getDoc(statsRef, { source: 'cache' });
      if (statsDoc.exists()) {
        return statsDoc.data().anonymousCount || 0;
      }
    } catch (cacheError) {}
    
    const statsRef = doc(db, 'siteStats', 'visitors');
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      return statsDoc.data().anonymousCount || 0;
    }
    
    return 0;
  } catch (error) {
    console.error("Lỗi khi lấy số lượng khách truy cập:", error);
    return 0;
  }
};

export const getFooterContent = async () => {
  try {
    const footerDoc = await getDoc(doc(db, 'settings', 'footer'));
    if (footerDoc.exists()) {
      return footerDoc.data();
    }
    return { sections: [] };
  } catch (error) {
    console.error('Error getting footer content:', error);
    throw error;
  }
};

export const updateFooterContent = async (footerData) => {
  try {
    await setDoc(doc(db, 'settings', 'footer'), footerData, { merge: true });
  } catch (error) {
    console.error('Error updating footer content:', error);
    throw error;
  }
};

export const addFooterItem = async (footerItem) => {
  try {
    const footerDoc = await getDoc(doc(db, 'settings', 'footer'));
    let sections = [];
    
    if (footerDoc.exists()) {
      sections = footerDoc.data().sections || [];
    }
    
    sections.push(footerItem);
    await setDoc(doc(db, 'settings', 'footer'), { sections });
  } catch (error) {
    console.error('Error adding footer item:', error);
    throw error;
  }
};

export const deleteFooterItem = async (footerId) => {
  try {
    const footerDoc = await getDoc(doc(db, 'settings', 'footer'));
    if (footerDoc.exists()) {
      const sections = footerDoc.data().sections || [];
      const updatedSections = sections.filter(section => section.id !== footerId);
      await setDoc(doc(db, 'settings', 'footer'), { sections: updatedSections });
    }
  } catch (error) {
    console.error('Error deleting footer item:', error);
    throw error;
  }
};

export const updateUserExcelPermission = async (userId, isExcelEnabled) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      isExcelEnabled: isExcelEnabled,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating user Excel permission:", error);
    throw error;
  }
};

export const updateUserExcelPercentage = async (userId, excelPercentage) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      excelPercentage: excelPercentage,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating user Excel percentage:", error);
    throw error;
  }
};

export const getUsersByPage = async ({ limit = 10, startAfterDoc = null } = {}) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.USERS),
      orderBy("createdAt", "desc"),
      fsLimit(limit)
    );
    if (startAfterDoc) {
      q = query(
        collection(db, COLLECTIONS.USERS),
        orderBy("createdAt", "desc"),
        startAfter(startAfterDoc),
        fsLimit(limit)
      );
    }
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === limit;
    return { users, lastVisible, hasMore };
  } catch (error) {
    console.error("Error getting users by page:", error);
    throw error;
  }
};