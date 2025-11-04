// Simple entry point that loads the main app
import('./main.js').then(module => {
}).catch(error => {
  console.error('Failed to load main module:', error);
});
