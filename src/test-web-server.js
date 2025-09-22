const express = require('express');
const path = require('path');

const app = express();
const port = 3002;

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve the test page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-questions-page.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-questions-page.html'));
});

app.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}`);
    console.log(`Test questions page: http://localhost:${port}/test`);
});