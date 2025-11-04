/**
 * Utility functions for managing question management page cache
 * Lưu trữ trạng thái của các lựa chọn danh mục và tài liệu
 */

const CACHE_KEYS = {
  SELECTED_CATEGORY: 'questionMgmt_selectedCategory',
  SELECTED_DOCUMENT: 'questionMgmt_selectedDocument',
  CURRENT_PATH: 'questionMgmt_currentPath',
};

/**
 * Lưu ID danh mục và tài liệu được chọn vào cache
 * @param {string} categoryId - ID danh mục
 * @param {string} documentId - ID tài liệu
 */
export const saveSelectionToCache = (categoryId, documentId) => {
  try {
    if (categoryId) {
      localStorage.setItem(CACHE_KEYS.SELECTED_CATEGORY, categoryId);
    }
    if (documentId) {
      localStorage.setItem(CACHE_KEYS.SELECTED_DOCUMENT, documentId);
    }
  } catch (error) {
    console.warn('Error saving to cache:', error);
  }
};

/**
 * Lấy ID danh mục được chọn từ cache
 * @returns {string|null} - ID danh mục hoặc null nếu không có cache
 */
export const getCachedCategoryId = () => {
  try {
    return localStorage.getItem(CACHE_KEYS.SELECTED_CATEGORY);
  } catch (error) {
    console.warn('Error reading category from cache:', error);
    return null;
  }
};

/**
 * Lấy ID tài liệu được chọn từ cache
 * @returns {string|null} - ID tài liệu hoặc null nếu không có cache
 */
export const getCachedDocumentId = () => {
  try {
    return localStorage.getItem(CACHE_KEYS.SELECTED_DOCUMENT);
  } catch (error) {
    console.warn('Error reading document from cache:', error);
    return null;
  }
};

/**
 * Kiểm tra xem hiện tại có phải là trang /admin/questions không
 * @returns {boolean} - true nếu đang ở trang /admin/questions
 */
export const isQuestionManagementPage = () => {
  return window.location.pathname === '/admin/questions';
};

/**
 * Xóa cache khi rời khỏi trang /admin/questions
 */
export const clearQuestionManagementCache = () => {
  try {
    localStorage.removeItem(CACHE_KEYS.SELECTED_CATEGORY);
    localStorage.removeItem(CACHE_KEYS.SELECTED_DOCUMENT);
    localStorage.removeItem(CACHE_KEYS.CURRENT_PATH);
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
};

/**
 * Khởi tạo hoặc cập nhật path hiện tại
 * @param {string} path - Đường dẫn hiện tại
 */
export const updateCurrentPath = (path) => {
  try {
    localStorage.setItem(CACHE_KEYS.CURRENT_PATH, path);
  } catch (error) {
    console.warn('Error updating current path:', error);
  }
};

/**
 * Lấy path được lưu từ cache
 * @returns {string|null} - Path được lưu hoặc null
 */
export const getCachedPath = () => {
  try {
    return localStorage.getItem(CACHE_KEYS.CURRENT_PATH);
  } catch (error) {
    console.warn('Error reading path from cache:', error);
    return null;
  }
};

/**
 * Kiểm tra xem cache có hợp lệ cho trang hiện tại không
 * Nếu chuyển sang page khác, xóa cache
 * @returns {boolean} - true nếu cache hợp lệ
 */
export const validateAndCleanCache = () => {
  try {
    const currentPath = window.location.pathname;
    const cachedPath = getCachedPath();

    if (cachedPath && cachedPath !== currentPath) {
      // Đang ở trang khác, xóa cache cũ
      clearQuestionManagementCache();
      return false;
    }

    // Nếu hiện tại không phải /admin/questions, xóa cache
    if (!isQuestionManagementPage()) {
      clearQuestionManagementCache();
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error validating cache:', error);
    return false;
  }
};
