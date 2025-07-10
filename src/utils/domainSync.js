/**
 * Công cụ đồng bộ hoá giữa các domain khác nhau
 * Giải quyết vấn đề cache và chuyển hướng
 */

// Danh sách tên miền Firebase
const FIREBASE_DOMAINS = [
  'tailieu-89ca9.web.app',
  'tailieuehou.web.app',
  'tailieuehou.firebaseapp.com'
];

// Domain chính sử dụng
const PRIMARY_DOMAIN = 'tailieuehou.id.vn';

/**
 * Chuyển hướng từ domain Firebase sang domain chính
 * @returns {boolean} Trả về true nếu đã chuyển hướng
 */
export const redirectToPrimaryDomain = () => {
  // Nếu đang chạy trên server, bỏ qua
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  // Kiểm tra nếu trên domain Firebase thì chuyển hướng
  if (FIREBASE_DOMAINS.includes(hostname) && hostname !== PRIMARY_DOMAIN) {
    // Lưu URL hiện tại và thời gian
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    const timestamp = new Date().getTime();
    
    // Chuyển hướng với timestamp để phá cache
    window.location.replace(`https://${PRIMARY_DOMAIN}${currentPath}?t=${timestamp}`);
    return true;
  }
  
  return false;
};

/**
 * Xóa cache của ứng dụng
 * Gọi hàm này khi cần làm mới giao diện
 */
export const clearApplicationCache = async () => {
  // Kiểm tra xem trình duyệt có hỗ trợ Cache API không
  if ('caches' in window) {
    try {
      // Lấy danh sách tất cả các cache stores
      const cacheKeys = await caches.keys();
      
      // Xóa từng cache
      const deletionPromises = cacheKeys.map(key => {
        // Chỉ xóa cache liên quan đến ứng dụng của chúng ta
        if (key.includes('tailieu') || key.includes('firebase') || key.includes('workbox')) {
          return caches.delete(key);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletionPromises);
      console.log('Đã xóa cache ứng dụng');
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa cache:', error);
      return false;
    }
  }
  
  return false;
};

/**
 * Kiểm tra và cập nhật phiên bản mới
 * @param {string} currentVersion - Phiên bản hiện tại của ứng dụng
 */
export const checkForNewVersion = (currentVersion) => {
  const lastCheck = localStorage.getItem('last_version_check');
  const now = new Date().getTime();
  
  // Kiểm tra 1 lần mỗi giờ
  if (!lastCheck || now - parseInt(lastCheck) > 3600000) {
    fetch(`/version.json?t=${now}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => {
        if (data.version !== currentVersion) {
          clearApplicationCache().then(() => {
            // Tải lại trang để cập nhật phiên bản mới
            window.location.reload(true);
          });
        }
        localStorage.setItem('last_version_check', now.toString());
      })
      .catch(error => console.error('Lỗi kiểm tra phiên bản:', error));
  }
};

/**
 * Thiết lập các listener cho sự kiện online/offline
 */
export const setupNetworkListeners = () => {
  // Xử lý khi kết nối mạng được khôi phục
  window.addEventListener('online', () => {
    clearApplicationCache().then(() => {
      window.location.reload();
    });
  });
  
  // Thông báo khi mất kết nối
  window.addEventListener('offline', () => {
    console.log('Mất kết nối mạng, chuyển sang chế độ offline');
  });
};
