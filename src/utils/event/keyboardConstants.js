/**
 * Các hằng số liên quan đến phím bàn phím
 * Tệp này định nghĩa các hằng số và biến thể của các phím Print Screen
 * trên các bàn phím và hệ điều hành khác nhau
 */

// Mã phím
export const KEY_CODES = {
  PRINT_SCREEN: 44,
  WINDOWS: 91,
  META: 93,
  FN: 0, // Phím Fn không có keyCode tiêu chuẩn
  F11: 122,
  F12: 123,
  ALT: 18,
  CTRL: 17,
  SHIFT: 16,
  C: 67,
  S: 83,
  THREE: 51,
  FOUR: 52,
  FIVE: 53,
  SPACE: 32
};

// Tên phím
export const KEY_NAMES = {
  PRINT_SCREEN: ['PrintScreen', 'prtsc', 'prntscrn', 'print', 'screenshot', 'snap', 'imppr', 'imprpant', 'capture'],
  WINDOWS: ['Meta', 'OS', 'Win', 'Windows'],
  FN: ['Fn', 'Function'],
  COPY: ['c', 'C', 'copy', 'Copy']
};

/**
 * Kiểm tra xem một phím có phải là phím Print Screen hay không
 * (bao gồm các biến thể trên các bàn phím khác nhau)
 * @param {string} key - Tên phím từ sự kiện
 * @returns {boolean} - Có phải phím Print Screen không
 */
export const isPrintScreenKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  
  const lowerKey = key.toLowerCase();
  return KEY_NAMES.PRINT_SCREEN.some(name => lowerKey.includes(name.toLowerCase()));
};

/**
 * Kiểm tra xem có phải là tổ hợp phím chụp màn hình
 * @param {KeyboardEvent} event - Sự kiện bàn phím
 * @returns {boolean} - Có phải tổ hợp phím chụp màn hình không
 */
export const isScreenshotCombo = (event) => {
  // Kiểm tra phím Print Screen
  if (event.key === 'PrintScreen' || event.keyCode === KEY_CODES.PRINT_SCREEN || isPrintScreenKey(event.key)) {
    return true;
  }
  
  // Windows + Shift + S (Windows 10+)
  if ((event.key === 'Meta' || event.keyCode === KEY_CODES.WINDOWS || 
      (event.getModifierState && event.getModifierState('Meta'))) && 
      event.shiftKey && (event.key === 's' || event.keyCode === KEY_CODES.S)) {
    return true;
  }
  
  // Cmd + Shift + 3/4/5 (macOS)
  if ((event.metaKey || (event.getModifierState && event.getModifierState('Meta'))) && 
      event.shiftKey && 
      (event.key === '3' || event.key === '4' || event.key === '5' || 
       event.keyCode === KEY_CODES.THREE || event.keyCode === KEY_CODES.FOUR || 
       event.keyCode === KEY_CODES.FIVE)) {
    return true;
  }
  
  // Fn + Windows + Space/PrtSc (một số laptop)
  if ((event.key === 'Meta' || event.keyCode === KEY_CODES.WINDOWS || 
      (event.getModifierState && event.getModifierState('Meta'))) && 
      (event.key === ' ' || event.keyCode === KEY_CODES.SPACE ||
       isPrintScreenKey(event.key))) {
    return true;
  }
  
  // Ctrl/Alt + F11/F12 (một số laptop)
  if ((event.ctrlKey || event.altKey) && 
      (event.key === 'F11' || event.key === 'F12' || 
       event.keyCode === KEY_CODES.F11 || event.keyCode === KEY_CODES.F12)) {
    return true;
  }
  
  // Alt + PrtSc (chụp cửa sổ hoạt động trên Windows)
  if (event.altKey && (event.key === 'PrintScreen' || event.keyCode === KEY_CODES.PRINT_SCREEN || isPrintScreenKey(event.key))) {
    return true;
  }
    // Fn + Insert (thay thế cho PrtSc trên một số laptop)
  if (event.key === 'Insert' && 
      // Không có cách trực tiếp để phát hiện Fn, phải dựa vào ngữ cảnh
      // Trong nhiều trường hợp Insert sẽ không kích hoạt screenshot trừ khi Fn được nhấn
      document.activeElement.tagName !== 'INPUT' && 
      document.activeElement.tagName !== 'TEXTAREA') {
    return true;
  }
  
  // Fn + S (một số laptop và thiết bị sử dụng tổ hợp này)
  if (event.key === 's' || event.keyCode === KEY_CODES.S) {
    // Phím S thường không kích hoạt chụp màn hình, trừ khi kết hợp với Fn hoặc phím đặc biệt khác
    // Heuristic: khi không ở trong trường nhập liệu và không có phím ctrl/alt/meta
    if (!event.ctrlKey && !event.altKey && !event.metaKey && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA' &&
        !document.querySelector(':focus')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Danh sách các sự kiện cần lắng nghe để phát hiện đầy đủ
 * các tổ hợp phím chụp màn hình
 */
export const SCREENSHOT_EVENTS = [
  'keydown',
  'keyup',
  'keypress'
];
