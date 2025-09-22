# Troubleshooting Extension Errors

## ✅ Fixed Issues

### 1. `document.createElement is not a function`

**Problem**: Variable naming conflict in forEach loops using `document` parameter

**Solution**:

- Changed variable names from `document` to `doc` in forEach loops
- Use `window.document.createElement()` explicitly to avoid conflicts

```javascript
// ❌ Before (causing error)
documents.forEach((document) => {
  const option = document.createElement("option"); // Error!
});

// ✅ After (fixed)
documents.forEach((doc) => {
  const option = window.document.createElement("option"); // Works!
});
```

### 2. Extension không dừng ghi log

**Problem**: Continuous logging spam from comparison function

**Solutions Applied**:

- Added debounce mechanism (2 second delay between comparisons)
- Added `isComparing` flag to prevent multiple simultaneous calls
- Reduced verbose logging (only show first 3 questions, use debugLog)
- Added debug mode toggle to control logging levels

## 🔧 Debug Controls

### Toggle Debug Mode

- Click **🐛 Debug** button in popup to toggle verbose logging
- When ON: Shows detailed comparison logs
- When OFF: Only shows essential logs

### Manual Debug Commands

Run in browser console on target page:

```javascript
// Enable debug mode
chrome.runtime.sendMessage({ action: "toggleDebug" });

// Check if content script is loaded
console.log("Extension loaded:", !!window.extensionQuestions);

// Force clear all highlights
chrome.runtime.sendMessage({ action: "clearHighlights" });
```

## 🚀 Performance Optimizations

### Comparison Throttling

- Maximum 1 comparison every 2 seconds
- Prevents infinite loops and excessive CPU usage
- Automatic debounce on page interactions

### Logging Reduction

- Only log when `debugMode = true`
- Limit question logging to first 3 items
- Use conditional logging based on element count

### Memory Management

- Clear comparison flags after completion
- Remove old highlights before adding new ones
- Proper cleanup of event listeners

## 📋 Best Practices

### For Users

1. Use Debug toggle to control log verbosity
2. If extension seems stuck, reload the page
3. Check browser console for specific errors
4. Use "Clear Highlights" to reset page state

### For Developers

1. Always use `debugLog()` instead of `console.log()` for non-critical logs
2. Implement debounce for frequently called functions
3. Add proper error handling with try-catch blocks
4. Use meaningful variable names to avoid conflicts

## 🐛 Common Issues & Solutions

### Extension not responding

- Reload the page and try again
- Check if content script is properly injected
- Look for JavaScript errors in console

### Too much logging

- Click Debug button to turn OFF verbose mode
- Logs will be minimal and only show important events

### Comparison not working

- Ensure questions are loaded in popup first
- Check if page has detectable question elements
- Try manual comparison with "So sánh với trang" button
