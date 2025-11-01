/**
 * Tiện ích phát hiện chụp màn hình
 * Cung cấp các phương thức để phát hiện và xử lý khi người dùng chụp màn hình
 */

// Các hằng số và utility function cần thiết
const KEY_CODES = {
  PRINT_SCREEN: 44,
  WINDOWS: 91,
  META: 91,
  F12: 123,
  C: 67,
  S: 83,
  THREE: 51
};

const KEY_NAMES = {
  PRINT_SCREEN: ['PrintScreen', 'Print', 'PrintScr', 'PrtScn', 'PrtSc', 'PrtScr', 'PrtScrn']
};

// Các utility function thay thế cho các file đã bị xóa
const isScreenshotCombo = (event) => {
  return (
    (event.ctrlKey && event.shiftKey && (event.key === '3' || event.key === '4' || event.keyCode === KEY_CODES.THREE)) || // MacOS screenshot
    (event.ctrlKey && event.altKey && event.key === 'PrtScn') || // Windows screenshot
    (event.metaKey && event.shiftKey && event.key === '3') // MacOS screenshot
  );
};

const isPrintScreenKey = (key) => {
  return KEY_NAMES.PRINT_SCREEN.includes(key);
};

const detectFnKeyPress = (event) => {
  return event._fnKeyPressed || false;
};

const isFnPrintScreenCombo = (event) => {
  return event._fnKeyPressed && (event.key === 'Insert' || isPrintScreenKey(event.key));
};

const enhanceEventWithFnState = (event) => {
  event._fnKeyPressed = false;
  // Phát hiện dấu hiệu phím Fn được nhấn
  if (event.key === 'Insert' && typeof event.location !== 'undefined' && event.location === 3) {
    event._fnKeyPressed = true;
  }
};

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const detectIOSScreenshot = (callback) => {
  // iOS không có API riêng để phát hiện chụp màn hình
  // Chúng ta sử dụng phương pháp phát hiện khi ứng dụng ẩn đi trong thời gian ngắn
  let lastVisibilityChange = 0;
  
  const handleVisibilityChange = () => {
    const now = new Date().getTime();
    if (document.visibilityState === 'hidden') {
      lastVisibilityChange = now;
    } else if (document.visibilityState === 'visible') {
      // Nếu thời gian ẩn ngắn hơn 500ms, có thể là chụp màn hình
      if (now - lastVisibilityChange < 500) {
        callback();
      }
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

const detectAndroidScreenshot = (callback) => {
  // Android cũng không có API riêng, nhưng có thể phát hiện qua một số dấu hiệu
  return () => {}; // Placeholder function
};

const applyMobileTouchProtection = (element) => {
  if (!element) return;
  
  // Ngăn long press (thường dùng để lưu ảnh)
  element.style.webkitTouchCallout = 'none';
  element.style.webkitUserSelect = 'none';
  
  // Ngăn context menu
  element.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Ngăn drag
  element.setAttribute('draggable', 'false');
  
  // Ngăn double-tap
  element.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
};

// Tiếp tục với code hiện có

// Biến để theo dõi thời điểm ẩn trang
let timeHidden = 0;

/**
 * Đăng ký các sự kiện để phát hiện chụp màn hình
 * @param {Function} callback - Hàm sẽ được gọi khi phát hiện chụp màn hình
 * @param {boolean} useBlur - Tự động làm mờ nội dung hay không
 * @returns {Function} Hàm hủy đăng ký các sự kiện
 */
const registerScreenshotDetection = (callback, useBlur = true) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }
  // Biến để theo dõi trạng thái mờ
  let isBlurred = false;
  let blurTimer = null;
  let preventTimer = null;
  
  // Kiểm tra và áp dụng các biện pháp bảo vệ cho thiết bị di động nếu cần
  const isMobile = isMobileDevice();
  let mobileCleanupFunctions = [];
  
  // Hàm áp dụng hiệu ứng mờ chủ động
  const applyBlur = () => {
    if (isBlurred || !useBlur) return;
    
    const content = document.querySelector('.content-container') || document.querySelector('main');
    if (content) {
      isBlurred = true;
      content.classList.add('anti-screenshot-blur');
    }
  };
  
  // Hàm xóa hiệu ứng mờ
  const removeBlur = () => {
    if (!isBlurred) return;
    
    const content = document.querySelector('.content-container') || document.querySelector('main');
    if (content) {
      content.classList.remove('anti-screenshot-blur');
      isBlurred = false;
    }
  };

  // Phát hiện chụp màn hình
  const detectScreenshot = () => {
    // Áp dụng hiệu ứng mờ ngay lập tức nếu được yêu cầu
    if (useBlur) {
      applyBlur();
      
      // Xóa hiệu ứng mờ sau 3 giây
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        removeBlur();
      }, 3000);
    }
    
    // Gọi callback
    if (typeof callback === 'function') {
      callback();
    }
  };  // Phát hiện phím Print Screen
  const handleKeyEvent = (event) => {
    // Phát hiện nhanh các phím thường được sử dụng để chụp màn hình
    if (isScreenshotCombo(event) || 
        event.key === 'PrintScreen' || event.keyCode === KEY_CODES.PRINT_SCREEN || 
        (event.ctrlKey && (event.key === 'c' || event.keyCode === KEY_CODES.C)) ||  // Ctrl+C
        (event.metaKey && (event.key === 'c' || event.keyCode === KEY_CODES.C)) ||  // Cmd+C (macOS)
        event.key === 'Meta' || event.keyCode === KEY_CODES.WINDOWS ||              // Phím Windows
        event.key === 'F12' || event.keyCode === KEY_CODES.F12 ||                   // F12 (thường dùng với Fn)
        isPrintScreenKey(event.key) ||                                              // Hỗ trợ PrtSc trên nhiều trình duyệt
        // Phím S khi không nhập text (hỗ trợ Fn+S)
        ((event.key === 's' || event.keyCode === KEY_CODES.S) && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') ||
        (event.shiftKey && 
          ((event.key === 's' || event.keyCode === KEY_CODES.S) ||                  // Shift+S (một số tool chụp màn hình)
           (event.ctrlKey && (event.key === '3' || event.keyCode === KEY_CODES.THREE))  // Ctrl+Shift+3 (macOS)
          )
        )) {
      // Áp dụng phòng ngừa chủ động khi phát hiện phím liên quan đến chụp ảnh
      applyBlur();
      
      // Đặt hẹn giờ để kiểm tra và xác nhận nếu đó là chụp màn hình thực sự
      clearTimeout(preventTimer);
      preventTimer = setTimeout(() => {
        detectScreenshot();
      }, 50); // Chỉ chờ 50ms để phản ứng nhanh
    }
    
    // Xử lý đặc biệt cho tổ hợp phím Windows+PrtSc
    if ((event.key === 'Meta' || event.keyCode === KEY_CODES.WINDOWS) && 
        event.wasRecentlyPressed && event.wasRecentlyPressed.includes('PrintScreen')) {
      detectScreenshot();
    }
  };
    // Theo dõi các phím đã nhấn gần đây (để phát hiện tổ hợp phím)
  let recentlyPressedKeys = [];
  const maxRecentKeyHistory = 3;
  const recentKeyTimeout = 500; // 500ms - giảm thời gian để phản ứng nhanh hơn
  
  // Hàm theo dõi các phím đã nhấn gần đây
  const trackRecentKey = (event) => {
    const key = event.key || String.fromCharCode(event.keyCode);
    recentlyPressedKeys.push(key);
    
    // Giới hạn số lượng phím ghi nhớ
    if (recentlyPressedKeys.length > maxRecentKeyHistory) {
      recentlyPressedKeys.shift();
    }
    
    // Gán danh sách phím gần đây vào sự kiện
    event.wasRecentlyPressed = [...recentlyPressedKeys];
    
    // Xóa danh sách sau một khoảng thời gian
    setTimeout(() => {
      recentlyPressedKeys = [];
    }, recentKeyTimeout);
  };
  // Phát hiện tổ hợp phím Fn
  const handleFnKey = (event) => {
    // Làm giàu sự kiện với thông tin về trạng thái phím Fn
    enhanceEventWithFnState(event);
    trackRecentKey(event);
    
    // Phát hiện tổ hợp phím Fn chụp màn hình
    if (isFnPrintScreenCombo(event)) {
      applyBlur();
      detectScreenshot();
      return;
    }
    
    // Phím Fn thường không được phát hiện trực tiếp, nhưng có thể kết hợp với các phím khác
    // Ví dụ: Fn+PrtSc trên nhiều laptop
    if (event.key === 'Insert' || 
        event.key === 'F11' || event.keyCode === KEY_CODES.F11 || 
        event.key === 'F12' || event.keyCode === KEY_CODES.F12 ||
        event.key === 's' || event.key === 'S' || event.keyCode === KEY_CODES.S) {
      
      if (detectFnKeyPress(event)) {
        applyBlur();
        
        // Đặt hẹn giờ để kiểm tra và xác nhận nếu đó là chụp màn hình thực sự
        clearTimeout(preventTimer);
        preventTimer = setTimeout(() => {
          detectScreenshot();
        }, 20); // Giảm thời gian xuống 20ms để phản ứng cực nhanh
      }
    }
  };
  
  // Xử lý cụ thể cho thiết bị di động
  const setupMobileProtection = () => {
    if (!isMobile) return;
    
    // Thêm phát hiện iOS
    const iosCleanup = detectIOSScreenshot(() => {
      applyBlur();
      detectScreenshot();
    });
    mobileCleanupFunctions.push(iosCleanup);
    
    // Thêm phát hiện Android
    const androidCleanup = detectAndroidScreenshot(() => {
      applyBlur();
      detectScreenshot();
    });
    mobileCleanupFunctions.push(androidCleanup);
    
    // Thêm bảo vệ cảm ứng cho các phần tử nội dung
    const content = document.querySelector('.content-container') || document.querySelector('main');
    if (content) {
      applyMobileTouchProtection(content);
      
      // Áp dụng bảo vệ cho tất cả hình ảnh
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        applyMobileTouchProtection(img);
        
        // Ngăn lưu ảnh
        img.setAttribute('draggable', 'false');
        img.addEventListener('touchstart', (e) => {
          e.preventDefault();
        }, { passive: false });
      });
    }
    
    // Theo dõi cử chỉ thu phóng (pinch zoom) - thường được sử dụng để chụp ảnh
    const handleTouchStart = (e) => {
      if (e.touches.length >= 2) {
        // Nhiều ngón tay chạm - có thể là cử chỉ chụp ảnh
        applyBlur();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    mobileCleanupFunctions.push(() => {
      document.removeEventListener('touchstart', handleTouchStart);
    });
    
    // Theo dõi cử chỉ trên iOS
    const handleGestureStart = (e) => {
      e.preventDefault();
      applyBlur();
    };
    
    document.addEventListener('gesturestart', handleGestureStart);
    mobileCleanupFunctions.push(() => {
      document.removeEventListener('gesturestart', handleGestureStart);
    });
  };
  
  // Khởi tạo bảo vệ cho di động
  setupMobileProtection();
  
  // Phát hiện cả khi người dùng giữ phím xuống (keydown)
  const handleKeyDownEvent = (event) => {
    if (isScreenshotCombo(event) ||
        event.key === 'PrintScreen' || event.keyCode === KEY_CODES.PRINT_SCREEN ||
        (event.ctrlKey && (event.key === 'c' || event.keyCode === KEY_CODES.C)) ||
        (event.metaKey && (event.key === 'c' || event.keyCode === KEY_CODES.C)) ||
        event.key === 'Meta' || event.keyCode === KEY_CODES.WINDOWS ||           // Phím Windows
        event.key === 'F12' || event.keyCode === KEY_CODES.F12 ||                // F12 (thường dùng với Fn)
        isPrintScreenKey(event.key)) {                                           // Hỗ trợ PrtSc trên nhiều trình duyệt
      // Áp dụng mờ ngay lập tức khi phím được nhấn
      applyBlur();
    }
  };

  // Phát hiện iOS screenshot (dựa trên sự thay đổi visibility)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Áp dụng mờ ngay khi tab ẩn (phòng ngừa)
      applyBlur();
      timeHidden = Date.now();
    } else if (document.visibilityState === 'visible' && timeHidden > 0) {
      const timeDiff = Date.now() - timeHidden;
      // Thời gian ẩn ngắn (dưới 1 giây) thường là dấu hiệu của việc chụp màn hình
      if (timeDiff < 1000) {
        detectScreenshot();
      } else {
        // Nếu không phải là chụp màn hình, loại bỏ hiệu ứng mờ
        removeBlur();
      }
      timeHidden = 0;
    }
  };
  // Ngăn chặn in ấn (cũng có thể dùng để lưu ảnh)
  const handlePrintAttempt = (event) => {
    applyBlur(); // Áp dụng mờ ngay lập tức
    event.preventDefault();
    detectScreenshot();
    return false;
  };
  
  // Phát hiện dựa trên sự kiện chuột (các thao tác thường liên quan đến chụp ảnh)
  const handleMouseEvent = (event) => {
    // Kiểm tra xem có phải là chuột phải không (thường mở menu ngữ cảnh để lưu ảnh)
    if (event.button === 2) {
      applyBlur();
    }
  };

  // Xử lý khi kéo các đối tượng (có thể là kéo hình ảnh để lưu)
  const handleDragStart = (event) => {
    applyBlur();
    
    // Nếu người dùng đang kéo hình ảnh, ngăn chặn và cảnh báo
    if (event.target.nodeName === 'IMG') {
      event.preventDefault();
      detectScreenshot();
      return false;
    }
    
    // Đặt hẹn giờ để loại bỏ hiệu ứng mờ nếu không phải là hành động chụp ảnh
    clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      removeBlur();
    }, 1000);
  };
  // Đăng ký các sự kiện
  window.addEventListener('keyup', handleKeyEvent);
  window.addEventListener('keydown', handleKeyDownEvent);
  window.addEventListener('keydown', handleFnKey);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeprint', handlePrintAttempt);
  document.addEventListener('mousedown', handleMouseEvent);
  document.addEventListener('dragstart', handleDragStart);
  
  // Thiết lập CSS chống chụp ảnh động
  const setupDynamicStyles = () => {
    // Thêm style ngăn chặn chọn văn bản khi phát hiện có khả năng chụp màn hình
    const style = document.createElement('style');
    style.innerHTML = `
      .prevent-select {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
    `;
    document.head.appendChild(style);
    
    // Thêm class cho body để ngăn chặn chọn văn bản khi phát hiện có khả năng chụp màn hình
    const applyPreventSelect = () => {
      document.body.classList.add('prevent-select');
      setTimeout(() => {
        document.body.classList.remove('prevent-select');
      }, 3000);
    };    // Lắng nghe các tổ hợp phím thường dùng để chụp màn hình
    document.addEventListener('keydown', (e) => {
      if (isScreenshotCombo(e) ||
          (e.ctrlKey && e.key === 'c') || 
          (e.metaKey && e.key === 'c') ||
          e.key === 'PrintScreen' || e.keyCode === KEY_CODES.PRINT_SCREEN ||
          e.key === 'Meta' || e.keyCode === KEY_CODES.WINDOWS ||
          e.key === 'F12' || e.keyCode === KEY_CODES.F12 ||
          // Phím S khi không nhập text (có thể là Fn+S)
          ((e.key === 's' || e.key === 'S' || e.keyCode === KEY_CODES.S) && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') ||
          isPrintScreenKey(e.key)) {
        applyPreventSelect();
      }
    });
  };
  
  // Khởi tạo CSS động
  setupDynamicStyles();  // Trả về hàm để hủy đăng ký
  return () => {
    window.removeEventListener('keyup', handleKeyEvent);
    window.removeEventListener('keydown', handleKeyDownEvent);
    window.removeEventListener('keydown', handleFnKey);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeprint', handlePrintAttempt);
    document.removeEventListener('mousedown', handleMouseEvent);
    document.removeEventListener('dragstart', handleDragStart);
    
    // Đảm bảo xóa hiệu ứng mờ
    removeBlur();
    
    // Xóa các timer nếu có
    if (blurTimer) clearTimeout(blurTimer);
    if (preventTimer) clearTimeout(preventTimer);
    
    // Hủy các trình lắng nghe dành cho thiết bị di động
    mobileCleanupFunctions.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
  };
};

/**
 * Khởi tạo bảo vệ toàn cầu chống chụp ảnh màn hình
 * @param {Function} warningCallback - Hàm sẽ được gọi khi phát hiện chụp màn hình
 */
const initGlobalScreenshotProtection = (warningCallback) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  
  // Thêm lớp CSS phủ trong suốt để ngăn chặn (giúp chống chụp đồng thời không làm ảnh hưởng đến trải nghiệm)
  const createOverlay = () => {
    const overlay = document.createElement('div');
    overlay.className = 'screenshot-protection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      background-color: transparent;
      contain: strict;
    `;
    
    // Chèn vào trong body
    document.body.appendChild(overlay);
    
    // Làm mới lớp phủ định kỳ để tránh bị vô hiệu hóa bởi các công cụ chụp ảnh thông minh
    setInterval(() => {
      if (!document.body.contains(overlay)) {
        document.body.appendChild(overlay);
      }
      
      // Cập nhật thuộc tính CSS ngẫu nhiên để tránh bị vô hiệu hóa
      overlay.style.opacity = '0.01';
      setTimeout(() => {
        overlay.style.opacity = '0';
      }, 100);
    }, 2000);
    
    return overlay;
  };
  
  // Tạo lớp phủ bảo vệ
  const protectionOverlay = createOverlay();
  
  // Thêm bảo vệ đặc biệt cho điện thoại di động
  const isMobile = isMobileDevice();
  if (isMobile) {
    // Áp dụng bảo vệ chống chụp ảnh cho tất cả các hình ảnh
    const protectImages = () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        applyMobileTouchProtection(img);
        img.setAttribute('draggable', 'false');
        
        // Tạo lớp phủ cho mỗi hình ảnh để ngăn chặn chụp màn hình
        const imgOverlay = document.createElement('div');
        imgOverlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: transparent;
          pointer-events: none;
          z-index: 2;
        `;
        
        // Đặt hình ảnh vào một container có vị trí tương đối
        if (img.parentNode.style.position !== 'relative' &&
            img.parentNode.style.position !== 'absolute') {
          img.parentNode.style.position = 'relative';
        }
        
        img.parentNode.appendChild(imgOverlay);
      });
    };
    
    // Bảo vệ hình ảnh ban đầu và định kỳ kiểm tra các hình ảnh mới
    protectImages();
    setInterval(protectImages, 5000);
    
    // Thêm meta tags để ngăn chặn chụp màn hình trên Safari (iOS)
    const metaTag = document.createElement('meta');
    metaTag.name = 'viewport';
    metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(metaTag);
    
    // Thêm CSS ngăn chọn văn bản trên điện thoại
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      img {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Ngăn chặn sử dụng tính năng chụp màn hình của trình duyệt
  try {
    // Khóa API getUserMedia (sử dụng cho chia sẻ màn hình)
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = function() {
        if (typeof warningCallback === 'function') {
          warningCallback();
        }
        return new Promise((_, reject) => {
          reject(new Error('Chia sẻ màn hình bị vô hiệu hóa vì lý do bảo mật.'));
        });
      };
    }

    // Khóa API Presentation (có thể được sử dụng để cast màn hình)
    if (navigator.presentation) {
      navigator.presentation.defaultRequest = null;
    }

    // Ngăn chặn lưu trang web
    document.addEventListener('contextmenu', (e) => {
      if (e.target.nodeName === 'IMG') {
        e.preventDefault();
        if (typeof warningCallback === 'function') {
          warningCallback();
        }
        return false;
      }
    });

    // Ngăn chặn kéo thả hình ảnh để lưu
    document.addEventListener('dragstart', (e) => {
      if (e.target.nodeName === 'IMG') {
        e.preventDefault();
        if (typeof warningCallback === 'function') {
          warningCallback();
        }
        return false;
      }
    });
  } catch (error) {
    console.warn('Lỗi khi khởi tạo bảo vệ chụp màn hình:', error);
  }
};

export { registerScreenshotDetection, initGlobalScreenshotProtection };
