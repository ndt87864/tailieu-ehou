const isDevelopment = process.env.NODE_ENV === 'development';
let debuggerDetected = false;

const initialize = () => {
  if (isDevelopment) {
    console.log('Anti-debug functions are disabled in development mode');
    return;
  }
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    detectDevToolsSafely();
    handleKeyboardShortcuts();
    preventScreenCapture();
    obfuscateSourceMap();
    overrideErrorStack();
    createFolderNoiseInStack();
  } catch (error) {
    console.warn('Lỗi khi khởi tạo anti-debug:', error);
  }
};

const detectDevToolsSafely = () => {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    let slowExecutionDetected = false;
    let warningDisplayed = false;
    
    const safeDevToolsDetector = () => {
      try {
        // Use Promise.all for parallel operations
        Promise.all([
          new Promise(resolve => {
            // Check current URL for sensitivity
            const currentUrl = window.location.href;
            const isAuthPath = ['/login', '/register', '/auth', '/profile'].some(
              path => currentUrl.includes(path)
            );
            resolve(isAuthPath);
          }),
          new Promise(resolve => {
            // Other detection methods can be added here
            resolve(false);
          })
        ]).then(([isAuthPath, otherDetection]) => {
          // Process results if needed
          if (isAuthPath) {
            // Maybe increase detection sensitivity on auth pages
          }
        }).catch(err => {
          // Silently handle any errors
        });
      } catch (error) {
        // Avoid logging errors which might expose our detection methods
      }
    };
    
    // Set up periodic checking
    const checkInterval = setInterval(safeDevToolsDetector, 3000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(checkInterval);
    });
    
  } catch (error) {
    // Silently fail
  }
};

const handleKeyboardShortcuts = () => {
  try {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('keydown', (e) => {
      const currentUrl = window.location.href;
      const isAuthPath = currentUrl.includes('/login') || 
                        currentUrl.includes('/register') || 
                        currentUrl.includes('/auth') || 
                        currentUrl.includes('/profile');
      
      if (isAuthPath) {
        return;
      }
      
      if (
        (e.ctrlKey && e.key === 's') || 
        (e.ctrlKey && e.key === 'u') || 
        (e.ctrlKey && e.key === 'p') || 
        (e.metaKey && e.altKey && e.key === 'i') 
      ) {
        e.preventDefault();
        return false;
      }
    });
  } catch (error) {
    console.warn('Lỗi trong handleKeyboardShortcuts:', error);
  }
};

const preventScreenCapture = () => {
  try {
    // Sử dụng passive event listeners để cải thiện hiệu suất
    document.addEventListener('keyup', (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        console.warn('Phát hiện Print Screen');
        e.preventDefault();
        return false;
      }
    }, { passive: false });
    
    // Ngăn chặn in ấn với passive listener
    window.addEventListener('beforeprint', (e) => {
      e.preventDefault();
      console.warn('Phát hiện in ấn');
      return false;
    }, { passive: false });
    
    // Phát hiện khi tab trở nên ẩn (có thể là do chụp màn hình)
    // Sử dụng passive listener để tối ưu
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.warn('Tab trở nên ẩn, có thể đang chụp màn hình');
      }
    }, { passive: true });
    
    // Vô hiệu hóa menu ngữ cảnh với passive listener
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    }, { passive: false });
    
  } catch (error) {
    console.warn('Lỗi trong preventScreenCapture:', error);
  }
};

const obfuscateSourceMap = () => {
  try {
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (source && typeof source === 'string') {
        const maskedSource = source
          .replace("/[a-zA-Z]:\\.*\\src\\/g", 'app:/')
          .replace("/\/src\//g", 'app:/')
          .replace("/webpack:\/\/.*/g", 'app:/');
        if (originalOnError) {
          return originalOnError.call(this, message, maskedSource, lineno, colno, error);
        }
      }
      return false;
    };
    const originalEval = window.eval;
    window.eval = function() {
      try {
        return originalEval.apply(this, arguments);
      } catch (e) {
        if (e && e.stack) {
          e.stack = e.stack
            .replace("/[a-zA-Z]:\\.*\\src\\/g", 'app:/')
            .replace("/\/src\//g", 'app:/')
            .replace("/webpack:\/\/.*/g", 'app:/');
        }
        throw e;
      }
    };
  } catch (error) {
    console.warn('Lỗi khi ghi đè xử lý lỗi:', error);
  }
};

const overrideErrorStack = () => {
  try {
    const originalStackDescriptor = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');
    if (originalStackDescriptor && originalStackDescriptor.configurable) {
      Object.defineProperty(Error.prototype, 'stack', {
        get: function() {
          const originalStack = originalStackDescriptor.get.call(this);
          return originalStack
            ? originalStack
                .replace("/[a-zA-Z]:\\.*\\src\\/g", 'app:/')
                .replace("/\/src\//g", 'app:/')
                .replace("/webpack:\/\/.*/g", 'app:/')
                .replace("/at\s+[a-zA-Z0-9]+\s+\(/g", 'at anonymous (')
            : originalStack;
        },
        configurable: true
      });
    }
  } catch (error) {
    console.warn('Lỗi khi ghi đè Error.stack:', error);
  }
};

const createFolderNoiseInStack = () => {
  try {
    const randomFolders = [
      'app:/components/core/',
      'app:/utils/security/',
      'app:/lib/runtime/',
      'app:/common/system/',
      'app:/modules/document/'
    ];
    const triggerFakeErrors = () => {
      if (isDevelopment) return;
      setTimeout(() => {
        try {
          const createFakeError = () => {
            const err = new Error('Thread initialization failed');
            const fakeFolder = randomFolders[Math.floor(Math.random() * randomFolders.length)];
            Object.defineProperty(err, 'stack', {
              value: `Error: Thread initialization failed
                    at ModuleLoader.init (${fakeFolder}loader.js:142:23)
                    at bootstrap (app:/index.js:24:45)
                    at processTicksAndRejections (app:/internal/process.js:229:16)`,
              configurable: true
            });
            return err;
          };
          console.debug('[System]', createFakeError());
        } catch (e) {
        }
      }, 3000);
    };
    triggerFakeErrors();
  } catch (error) {
  }
};

export default {
  initialize,
  detectDevToolsSafely,
  handleKeyboardShortcuts,
  preventScreenCapture,
  obfuscateSourceMap,
  overrideErrorStack,
  createFolderNoiseInStack
};