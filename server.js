import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Set correct MIME types for module scripts
app.use((req, res, next) => {
  const url = req.url.toLowerCase();
  
  if (url.endsWith('.jsx') || url.endsWith('.js') || url.endsWith('.ts') || url.endsWith('.tsx')) {
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
  } else if (url.endsWith('.css')) {
    res.set({
      'Content-Type': 'text/css; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
  } else if (url.endsWith('.json')) {
    res.set('Content-Type', 'application/json; charset=utf-8');
  } else if (url.endsWith('.html')) {
    res.set('Content-Type', 'text/html; charset=utf-8');
  }
  
  next();
});

// Serve static files
app.use(express.static(join(__dirname, 'dist')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
