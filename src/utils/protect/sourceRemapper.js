let initialized = false;
const initialize = () => {
  if (initialized || typeof window === 'undefined') return;
  try {
    // handleDomainRedirect();
    overrideErrorForSourceHiding();
    hideWebpackInfo();
    disableSourcemapURLs();
    initialized = true;
  } catch (error) {
    console.warn('Lỗi khi khởi tạo source remapper:', error);
  }
};
const overrideErrorForSourceHiding = () => {
  try {
    const OriginalError = window.Error;
    window.Error = function(...args) {
      const error = new OriginalError(...args);
      const originalStack = error.stack;
      
      Object.defineProperty(error, 'stack', {
        get: function() {
          if (originalStack) {
            return originalStack
              .replace(/webpack:\/\/(\.\.\/)*webpack\/bootstrap/g, 'app:')
              .replace(/webpack:\/\/(\.\.\/)+/g, 'app:')
              .replace(/webpack:\/\//g, 'app:')
              .replace(/src\/components\//g, 'app:')
              .replace(/src\/utils\//g, 'app:')
              .replace(/src\/pages\//g, 'app:')
              .replace(/src\/context\//g, 'app:')
              .replace(/src\/hooks\//g, 'app:')
              .replace(/node_modules\//g, 'lib:')
              .replace(/at\s+Object\.<anonymous>\s+\(/g, 'at (')
              .replace(/at\s+eval\s+\(/g, 'at runtime (')
              .replace(/\?[a-f0-9]+/g, ''); 
          }
          return originalStack;
        },
        configurable: true
      });
      return error;
    };
    window.Error.prototype = OriginalError.prototype;
    window.Error.length = OriginalError.length;
    window.Error.name = OriginalError.name;
    window.Error.prototype.constructor = window.Error;
  } catch (error) {
    console.warn('Lỗi khi ghi đè Error constructor:', error);
  }
};
const hideWebpackInfo = () => {
  try {
    const originalConsole = {
      log: console.log,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error
    };
    const filterWebpackInfo = (args) => {
      return args.map(arg => {
        if (typeof arg === 'string') {
          return arg
            .replace(/webpack:\/\//g, 'app:')
            .replace(/\/src\//g, 'app:')
            .replace(/\/node_modules\//g, 'lib:');
        }
        if (arg instanceof Error && arg.stack) {
          const newError = new Error(arg.message);
          newError.name = arg.name;
          Object.defineProperty(newError, 'stack', {
            value: arg.stack
              .replace(/webpack:\/\//g, 'app:')
              .replace(/\/src\//g, 'app:')
              .replace(/\/node_modules\//g, 'lib:'),
            configurable: true
          });
          return newError;
        }
        return arg;
      });
    };
    console.log = function() {
      originalConsole.log.apply(console, filterWebpackInfo(Array.from(arguments)));
    };
    console.debug = function() {
      originalConsole.debug.apply(console, filterWebpackInfo(Array.from(arguments)));
    };
    console.info = function() {
      originalConsole.info.apply(console, filterWebpackInfo(Array.from(arguments)));
    };
    console.warn = function() {
      originalConsole.warn.apply(console, filterWebpackInfo(Array.from(arguments)));
    };
    console.error = function() {
      originalConsole.error.apply(console, filterWebpackInfo(Array.from(arguments)));
    };
  } catch (error) {
    console.warn('Lỗi khi ẩn thông tin webpack:', error);
  }
};
const disableSourcemapURLs = () => {
  try {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.tagName === 'SCRIPT') {
              if (node.textContent && node.textContent.includes('sourceMappingURL')) {
                node.textContent = node.textContent.replace(/\/\/# sourceMappingURL=.+/, '');
              }
            }
          });
        }
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string' && url.endsWith('.map')) {
        url = '/404-not-found.js'; 
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    document.querySelectorAll('script').forEach(script => {
      if (script.textContent && script.textContent.includes('sourceMappingURL')) {
        script.textContent = script.textContent.replace(/\/\/# sourceMappingURL=.+/, '');
      }
    });
  } catch (error) {
    console.warn('Lỗi khi vô hiệu hóa sourcemap URLs:', error);
  }
};

/**
 * Redirects to the new domain if needed
 */
// const handleDomainRedirect = () => {
//   try {
//     const currentDomain = window.location.hostname;
//     const newDomain = "tailieuehou.id.vn";
    
//     // Skip if already on the new domain or in development
//     if (currentDomain === newDomain || currentDomain === 'localhost') {
//       return;
//     }
    
//     // Construct the new URL with the same path, query and hash
//     const newUrl = `https://${newDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
    
//     // Redirect to the new domain
//     window.location.href = newUrl;
//   } catch (error) {
//     console.warn('Lỗi khi chuyển hướng đến tên miền mới:', error);
//   }
// };

export default {
  initialize,
  overrideErrorForSourceHiding,
  hideWebpackInfo,
  disableSourcemapURLs,
  // handleDomainRedirect
};
