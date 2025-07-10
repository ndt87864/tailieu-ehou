// Simple entry point that loads the main app
import('./main.js').then(module => {
  console.log('Main module loaded successfully');
}).catch(error => {
  console.error('Failed to load main module:', error);
});
