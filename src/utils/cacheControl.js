/**
 * Công cụ quản lý cache và kiểm tra cập nhật
 */

// Thời gian giữa các lần kiểm tra version (30 phút)
const CHECK_INTERVAL = 30 * 60 * 1000;

/**
 * Xóa cache của ứng dụng
 */
export const clearAppCache = async () => {
  if (!('caches' in window)) {
    return false;
  }
  
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    console.log('Đã xóa tất cả cache của ứng dụng');
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa cache:', error);
    return false;
  }
};

/**
 * Kiểm tra phiên bản mới của ứng dụng
 * @returns {Promise<boolean>} True nếu có phiên bản mới
 */
export const checkForUpdates = async () => {
  // Kiểm tra thời gian lần cuối kiểm tra
  const lastCheck = localStorage.getItem('last_update_check');
  const now = Date.now();
  
  if (lastCheck && now - parseInt(lastCheck) < CHECK_INTERVAL) {
    return false; // Chưa đến thời gian kiểm tra
  }
  
  try {
    // Thêm timestamp để phá vỡ cache
    const response = await fetch(`/version.json?t=${now}`, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    
    if (!response.ok) {
      throw new Error(`Không thể tải version.json: ${response.status}`);
    }
    
    const data = await response.json();
    const currentVersion = localStorage.getItem('app_version');
    
    // Cập nhật thời gian kiểm tra
    localStorage.setItem('last_update_check', now.toString());
    
    // Nếu không có phiên bản lưu trữ hoặc khác phiên bản hiện tại
    if (!currentVersion || currentVersion !== data.version) {
      console.log(`Phát hiện phiên bản mới: ${data.version}`);
      localStorage.setItem('app_version', data.version);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Lỗi kiểm tra cập nhật:', error);
    return false;
  }
};

/**
 * Xử lý cập nhật: xóa cache và tải lại trang
 */
export const handleUpdate = async () => {
  const hasUpdate = await checkForUpdates();
  
  if (hasUpdate) {
    await clearAppCache();
    // Tải lại trang với timestamp để phá vỡ cache
    // DISABLED REDIRECTION: // DISABLED REDIRECTION: // DISABLED REDIRECTION: // DISABLED REDIRECTION: window.location.href = `${window.location.pathname}?t=${Date.now()}${window.location.hash}`;
    return true;
  }
  
  return false;
};

/**
 * Chuyển hướng từ domain Firebase sang domain chính
 */
export const redirectToPrimaryDomain = () => {
  const FIREBASE_DOMAINS = ['tailieu-89ca9.web.app', 'tailieuehou.web.app', 'tailieuehou.firebaseapp.com'];
  const PRIMARY_DOMAIN = 'tailieuehou.id.vn';
  const hostname = window.location.hostname;
  
  if (FIREBASE_DOMAINS.includes(hostname) && hostname !== PRIMARY_DOMAIN) {
    const timestamp = Date.now();
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('t', timestamp);
    
    window.location.replace(
      `https://${PRIMARY_DOMAIN}${path}?${searchParams.toString()}${window.location.hash}`
    );
    return true;
  }
  
  return false;
};

/**
 * Khởi tạo hệ thống kiểm tra cập nhật
 */
export const initUpdateChecker = () => {
  // Kiểm tra khi trang vừa tải
  handleUpdate();
  
  // Kiểm tra định kỳ
  setInterval(handleUpdate, CHECK_INTERVAL);
  
  // Kiểm tra khi người dùng quay lại tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleUpdate();
    }
  });
};
