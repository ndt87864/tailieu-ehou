/**
 * Quản lý cache và đồng bộ hóa giữa các domain
 */

// Danh sách domain Firebase
const FIREBASE_DOMAINS = [
  'tailieu-89ca9.web.app',
  'tailieuehou.web.app',
  'tailieuehou.firebaseapp.com'
];

// // Domain chính
// const PRIMARY_DOMAIN = 'tailieuehou.id.vn';

// Khoảng thời gian kiểm tra cập nhật (15 phút)
const CHECK_INTERVAL = 15 * 60 * 1000;

/**
 * Chuyển hướng từ domain Firebase sang domain chính
 * @returns {boolean} Trả về true nếu đã chuyển hướng
 */
// export const redirectToPrimaryDomain = () => {
//   if (typeof window === 'undefined') return false;
  
//   const hostname = window.location.hostname;
  
//   if (FIREBASE_DOMAINS.includes(hostname) && hostname !== PRIMARY_DOMAIN) {
//     // Tạo timestamp mới để phá vỡ cache
//     const timestamp = new Date().getTime();
    
//     // Lưu đường dẫn hiện tại và thêm tham số để phá vỡ cache
//     const currentPath = window.location.pathname;
//     const searchParams = new URLSearchParams(window.location.search);
    
//     // Thêm tham số timestamp để phá vỡ cache
//     searchParams.set('_t', timestamp);
    
//     // Tạo URL mới với domain chính
//     const newUrl = `https://${PRIMARY_DOMAIN}${currentPath}?${searchParams.toString()}${window.location.hash}`;
    
//     // Chuyển hướng và thay thế history entry
//     window.location.replace(newUrl);
//     return true;
//   }
  
//   return false;
// };

/**
 * Xóa cache của trình duyệt
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công
 */
export const clearBrowserCache = async () => {
  if (!('caches' in window)) {
    return false;
  }
  
  try {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(key => caches.delete(key)));
    console.log('Đã xóa tất cả cache của trình duyệt');
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa cache trình duyệt:', error);
    return false;
  }
};

/**
 * Tải thông tin phiên bản từ server
 * @returns {Promise<Object|null>} Trả về thông tin phiên bản hoặc null nếu có lỗi
 */
export const fetchVersionInfo = async () => {
  try {
    // Thêm timestamp để phá vỡ cache
    const timestamp = new Date().getTime();
    const response = await fetch(`/version.json?_t=${timestamp}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      throw new Error(`Lỗi tải thông tin phiên bản: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Lỗi khi tải thông tin phiên bản:', error);
    return null;
  }
};

/**
 * Kiểm tra và xử lý cập nhật phiên bản
 * @returns {Promise<boolean>} Trả về true nếu có phiên bản mới
 */
export const checkAndHandleUpdate = async () => {
  // Lấy thông tin phiên bản mới từ server
  const serverVersion = await fetchVersionInfo();
  if (!serverVersion) return false;
  
  // Lấy phiên bản đã lưu trong localStorage
  const savedVersion = localStorage.getItem('app_version');
  
  // So sánh phiên bản
  if (!savedVersion || savedVersion !== serverVersion.version) {
    console.log(`Phát hiện phiên bản mới: ${serverVersion.version}`);
    
    // Lưu phiên bản mới vào localStorage
    localStorage.setItem('app_version', serverVersion.version);
    
    // Xóa cache trình duyệt
    await clearBrowserCache();
    
    // Tải lại trang với tham số phá vỡ cache
    const timestamp = new Date().getTime();
    window.location.href = `${window.location.pathname}?_t=${timestamp}${window.location.hash}`;
    
    return true;
  }
  
  return false;
};

/**
 * Khởi tạo hệ thống kiểm tra cập nhật định kỳ
 */
export const initUpdateChecker = () => {
  // Kiểm tra cập nhật khi trang vừa tải
  checkAndHandleUpdate();
  
  // Cài đặt kiểm tra định kỳ
  setInterval(checkAndHandleUpdate, CHECK_INTERVAL);
  
  // Kiểm tra khi người dùng quay lại tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndHandleUpdate();
    }
  });
  
  // Thiết lập xử lý khi online/offline
  window.addEventListener('online', () => {
    console.log('Đã kết nối lại internet, đang kiểm tra cập nhật...');
    checkAndHandleUpdate();
  });
};

/**
 * Buộc xóa cache và tải lại trang
 */
export const forceRefresh = async () => {
  await clearBrowserCache();
  const timestamp = new Date().getTime();
  window.location.href = `${window.location.pathname}?_force=${timestamp}${window.location.hash}`;
};
