// Content script for Tailieu Questions Extension
console.log('Tailieu Questions Extension content script loaded');

// Store questions from extension for comparison
let extensionQuestions = [];

// Cache key for questions
const QUESTIONS_CACHE_KEY = 'tailieu_questions';

// Debug flags and throttling
let isComparing = false;
let lastCompareTime = 0;
const COMPARE_DEBOUNCE_MS = 2000; // 2 seconds
let debugMode = false; // Set to true for verbose logging

// Load cached questions when page loads
loadCachedQuestions();

// Auto-compare questions when page is fully loaded
function initAutoCompareOnLoad() {
    // Wait for DOM to be ready and page to be stable
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(performAutoCompare, 1000);
        });
    } else {
        // DOM is already loaded
        setTimeout(performAutoCompare, 1000);
    }
    
    // Also listen for dynamic content changes
    let contentChangeTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(contentChangeTimer);
        contentChangeTimer = setTimeout(performAutoCompare, 2000);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
}

// Perform auto-compare if we have cached questions
async function performAutoCompare() {
    // Throttle auto-compare to avoid too frequent calls
    const now = Date.now();
    if (now - lastCompareTime < COMPARE_DEBOUNCE_MS) {
        debugLog('Auto-compare throttled, too soon since last compare');
        return;
    }
    
    if (extensionQuestions.length === 0) {
        // Try to load from cache first
        await loadCachedQuestions();
    }
    
    if (extensionQuestions.length > 0) {
        debugLog('Auto-comparing questions on page load:', extensionQuestions.length);
        lastCompareTime = now;
        
        const result = compareAndHighlightQuestions();
        
        if (result.matched > 0) {
            console.log(`🎯 Tự động so sánh: Tìm thấy ${result.matched}/${extensionQuestions.length} câu hỏi trên trang`);
            showAutoCompareNotification(result.matched, extensionQuestions.length);
        } else {
            debugLog('Auto-compare completed, no matches found');
        }
    }
}

// Show notification for auto-compare results
function showAutoCompareNotification(matched, total) {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            🎯 <span>Tự động tìm thấy ${matched}/${total} câu hỏi</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(76, 175, 80, 0.95);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 13px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Initialize auto-compare
initAutoCompareOnLoad();

// Monitor URL changes for Single Page Applications
let currentUrl = window.location.href;
function monitorUrlChanges() {
    const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            debugLog('URL changed, performing auto-compare:', currentUrl);
            
            // Wait a bit for new content to load
            setTimeout(performAutoCompare, 1500);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Start monitoring URL changes
monitorUrlChanges();

// Also listen to popstate events (back/forward buttons)
window.addEventListener('popstate', () => {
    debugLog('Popstate event detected, performing auto-compare');
    setTimeout(performAutoCompare, 1000);
});

// Listen to pushstate/replacestate events (common in SPAs)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
    originalPushState.apply(this, args);
    debugLog('PushState detected, performing auto-compare');
    setTimeout(performAutoCompare, 1000);
};

history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    debugLog('ReplaceState detected, performing auto-compare');
    setTimeout(performAutoCompare, 1000);
};

// Conditional logging function
function debugLog(...args) {
    if (debugMode) {
        console.log(...args);
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    try {
        if (request.action === 'getPageInfo') {
            sendResponse({
                url: window.location.href,
                title: document.title,
                domain: window.location.hostname
            });
            return true; // Keep message channel open
        }
    } catch (error) {
        console.error('Error handling getPageInfo:', error);
        sendResponse({ error: error.message });
        return true;
    }
    
    if (request.action === 'compareQuestions') {
        try {
            extensionQuestions = request.questions || [];
            
            // Save to cache
            saveCachedQuestions();
            
            const result = compareAndHighlightQuestions();
            sendResponse({ 
                success: true, 
                matchedQuestions: result.matched,
                totalPageQuestions: result.pageQuestions.length 
            });
        } catch (error) {
            console.error('Error handling compareQuestions:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
    
    if (request.action === 'setExtensionQuestions') {
        try {
            extensionQuestions = request.questions || [];
            
            // Save to cache
            saveCachedQuestions();
            
            console.log('Extension questions updated from popup:', extensionQuestions.length);
            showCachedQuestionsIndicator();
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error handling setExtensionQuestions:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
    
    if (request.action === 'clearHighlights') {
        try {
            clearAllHighlights();
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error handling clearHighlights:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
    
    if (request.action === 'toggleDebug') {
        try {
            debugMode = !debugMode;
            console.log('Debug mode:', debugMode ? 'ON' : 'OFF');
            sendResponse({ success: true, debugMode: debugMode });
        } catch (error) {
            console.error('Error handling toggleDebug:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
});

// Load cached questions from storage
async function loadCachedQuestions() {
    try {
        const result = await chrome.storage.local.get(QUESTIONS_CACHE_KEY);
        if (result[QUESTIONS_CACHE_KEY] && result[QUESTIONS_CACHE_KEY].length > 0) {
            extensionQuestions = result[QUESTIONS_CACHE_KEY];
            console.log('Questions loaded from cache:', extensionQuestions.length);
            
            // Show cached questions indicator
            showCachedQuestionsIndicator();
        }
    } catch (error) {
        console.error('Error loading cached questions:', error);
    }
}

// Save questions to cache
async function saveCachedQuestions() {
    try {
        await chrome.storage.local.set({ [QUESTIONS_CACHE_KEY]: extensionQuestions });
        debugLog('Questions saved to cache:', extensionQuestions.length);
    } catch (error) {
        console.error('Error saving questions to cache:', error);
    }
}

// Function to extract questions from current page
function extractQuestionsFromPage() {
    const questions = [];
    
    // Enhanced patterns for Vietnamese questions
    const questionPatterns = [
        /Câu\s*\d+[:\.\)\s]/gi,
        /Bài\s*\d+[:\.\)\s]/gi,
        /Question\s*\d+[:\.\)\s]/gi,
        /\d+[\.\)]\s*/g,
        /^[A-Z].*[?？]\s*$/,  // Questions ending with question marks
        /^.{10,}[?？]\s*$/,    // Any text ending with question mark
        /.+\s+(là|gì|nào|thế nào|như thế nào|sao|tại sao|vì sao)\s*[?？]?\s*$/gi // Vietnamese question words
    ];
    
    // Look for question-like elements with enhanced selectors
    const questionSelectors = [
        'div', 'p', 'span', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
        '.question', '.question-text', '.question-item', 
        '[class*="question"]', '[class*="cau"]', '[class*="bai"]'
    ];
    
    const questionElements = document.querySelectorAll(questionSelectors.join(', '));
    
    debugLog('Scanning', questionElements.length, 'elements for questions');
    
    questionElements.forEach((element, index) => {
        const text = element.textContent.trim();
        
        // Skip if too short, too long, or just whitespace
        if (text.length < 5 || text.length > 1000 || !text.match(/[a-zA-ZÀ-ỹ]/)) return;
        
        // Check if text looks like a question using multiple criteria
        let isQuestion = false;
        let questionReason = '';
        
        // Pattern matching
        if (questionPatterns.some(pattern => pattern.test(text))) {
            isQuestion = true;
            questionReason = 'pattern match';
        }
        
        // Class name hints
        if (element.className && element.className.match(/(question|cau|bai)/i)) {
            isQuestion = true;
            questionReason = 'class name';
        }
        
        // Parent element hints
        const parent = element.closest('.question, .question-item, [class*="question"]');
        if (parent) {
            isQuestion = true;
            questionReason = 'parent container';
        }
        
        // Content-based detection for questions
        const questionWords = ['là gì', 'là ai', 'như thế nào', 'thế nào', 'tại sao', 'vì sao', 'khi nào', 'ở đâu', 'bao nhiêu'];
        if (questionWords.some(word => text.toLowerCase().includes(word))) {
            isQuestion = true;
            questionReason = 'question words';
        }
        
        // Question mark detection
        if (text.includes('?') || text.includes('？')) {
            isQuestion = true;
            questionReason = 'question mark';
        }
        
        // Length and structure-based detection
        if (text.length > 20 && text.length < 300 && /^[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ]/.test(text)) {
            const sentences = text.split(/[.!?]/);
            if (sentences.length <= 3) {  // Likely a question if not too many sentences
                isQuestion = true;
                questionReason = 'structure analysis';
            }
        }
        
        if (isQuestion) {
            questions.push({
                element: element,
                text: text,
                originalText: text,
                index: index,
                reason: questionReason
            });
            
            debugLog(`Q${questions.length}: ${text.substring(0, 60)}... (${questionReason})`);
        }
    });
    
    console.log('Found', questions.length, 'potential questions on page');
    
    // Also look specifically in our test page structure
    const testQuestions = document.querySelectorAll('.question-text');
    if (testQuestions.length > 0) {
        console.log('Found test page questions:', testQuestions.length);
        testQuestions.forEach((element, index) => {
            const text = element.textContent.trim();
            if (text && !questions.find(q => q.text === text)) {
                questions.push({
                    element: element,
                    text: text,
                    originalText: text,
                    index: `test-${index}`,
                    reason: 'test page structure'
                });
                console.log(`Test Q${index + 1}: ${text}`);
            }
        });
    }
    
    return questions;
}

// Clean question text for better matching
function cleanQuestionText(text) {
    return text
        .replace(/Câu\s*\d+[:\.\)\s]*/gi, '')
        .replace(/Bài\s*\d+[:\.\)\s]*/gi, '')
        .replace(/Question\s*\d+[:\.\)\s]*/gi, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/^\s*[A-D][\.\)]\s*/, '')
        .trim()
        .toLowerCase();
}

// Compare questions and highlight matches
function compareAndHighlightQuestions() {
    // Prevent excessive calls and logging
    const now = Date.now();
    if (isComparing || (now - lastCompareTime) < COMPARE_DEBOUNCE_MS) {
        console.log('Skipping comparison - too soon or already in progress');
        return { matched: [], pageQuestions: [] };
    }
    
    isComparing = true;
    lastCompareTime = now;
    
    const pageQuestions = extractQuestionsFromPage();
    const matched = [];
    
    console.log('=== QUESTION COMPARISON START ===');
    console.log('Extension questions:', extensionQuestions.length);
    console.log('Page questions found:', pageQuestions.length);
    
    pageQuestions.forEach((pageQ, pageIndex) => {
        const cleanPageQuestion = cleanQuestionText(pageQ.text);
        
        extensionQuestions.forEach((extQ, extIndex) => {
            const cleanExtQuestion = cleanQuestionText(extQ.question);
            
            // Check for similarity (exact match or high similarity)
            if (isQuestionSimilar(cleanPageQuestion, cleanExtQuestion)) {
                console.log(`✅ MATCH FOUND! Page Q${pageIndex + 1} = Extension Q${extIndex + 1}`);
                console.log(`Answer: "${extQ.answer}"`);
                
                // Highlight the question and try to find/highlight the answer
                highlightMatchedQuestion(pageQ, extQ);
                
                matched.push({
                    pageQuestion: pageQ.text,
                    extensionQuestion: extQ.question,
                    answer: extQ.answer
                });
            }
        });
    });
    
    console.log(`Total matches: ${matched.length}`);
    console.log('=== COMPARISON COMPLETE ===');
    
    // Reset comparison flag
    isComparing = false;
    
    return { matched, pageQuestions };
}

// Check if two questions are similar
function isQuestionSimilar(q1, q2) {
    // Exact match
    if (q1 === q2) return true;
    
    // Remove punctuation and check again
    const clean1 = q1.replace(/[^\w\s]/g, '').trim();
    const clean2 = q2.replace(/[^\w\s]/g, '').trim();
    
    if (clean1 === clean2) return true;
    
    // Check if one contains the other (for partial matches)
    if (clean1.length > 20 && clean2.length > 20) {
        return clean1.includes(clean2) || clean2.includes(clean1);
    }
    
    // Calculate similarity score
    const similarity = calculateSimilarity(clean1, clean2);
    return similarity > 0.8; // 80% similarity threshold
}

// Calculate similarity between two strings
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight text content within an element without affecting HTML structure
function highlightTextInElement(element, searchText) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    
    // Collect all text nodes
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    // Search for the text in text nodes
    const searchLower = searchText.toLowerCase();
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const textLower = text.toLowerCase();
        
        // Check if this text node contains the search text
        const index = textLower.indexOf(searchLower);
        if (index !== -1) {
            const parent = textNode.parentNode;
            
            // Create highlighted version
            const beforeText = text.substring(0, index);
            const matchedText = text.substring(index, index + searchText.length);
            const afterText = text.substring(index + searchText.length);
            
            // Create new nodes
            const fragment = document.createDocumentFragment();
            
            if (beforeText) {
                fragment.appendChild(document.createTextNode(beforeText));
            }
            
            // Create highlighted span
            const highlightSpan = document.createElement('span');
            highlightSpan.style.cssText = `
                background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
                border-radius: 3px !important;
                padding: 2px 4px !important;
                font-weight: bold !important;
                box-shadow: 0 1px 3px rgba(255,107,53,0.3) !important;
            `;
            highlightSpan.className = 'tailieu-text-highlight';
            highlightSpan.textContent = matchedText;
            fragment.appendChild(highlightSpan);
            
            if (afterText) {
                fragment.appendChild(document.createTextNode(afterText));
            }
            
            // Replace the original text node
            parent.replaceChild(fragment, textNode);
        }
    });
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Highlight matched question and try to find the answer
function highlightMatchedQuestion(pageQuestion, extensionQuestion) {
    const element = pageQuestion.element;
    
    // Highlight only the text content, not the entire element
    if (!element.classList.contains('tailieu-highlighted-question')) {
        // Create a wrapper span for highlighting text only
        const questionText = pageQuestion.text.trim();
        
        // Store original HTML for restoration
        if (!element.dataset.originalHTML) {
            element.dataset.originalHTML = element.innerHTML;
        }
        
        // Use a more sophisticated approach to highlight text content
        highlightTextInElement(element, questionText);
        
        // Add a subtle border to the container for better visibility
        element.style.cssText += `
            border-left: 4px solid #ff6b35 !important;
            padding-left: 8px !important;
            margin: 5px 0 !important;
            position: relative !important;
        `;
        element.classList.add('tailieu-highlighted-question');
        
        // Add answer tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'tailieu-answer-tooltip';
        tooltip.innerHTML = `
            <div style="
                background: #2c3e50;
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10001;
                line-height: 1.4;
            ">
                <strong>📝 Đáp án:</strong><br>
                ${extensionQuestion.answer}
            </div>
        `;
        tooltip.style.cssText = `
            position: absolute;
            top: -10px;
            right: -10px;
            display: none;
            z-index: 10001;
        `;
        
        element.appendChild(tooltip);
        
        // Show/hide tooltip on hover
        element.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }
}



// Clear all highlights
function clearAllHighlights() {
    // Remove question highlights - restore original HTML
    document.querySelectorAll('.tailieu-highlighted-question').forEach(element => {
        // Remove inline styles added to the container
        element.style.borderLeft = '';
        element.style.paddingLeft = '';
        element.style.margin = '';
        element.style.position = '';
        
        // Restore original HTML if available
        if (element.dataset.originalHTML) {
            element.innerHTML = element.dataset.originalHTML;
            delete element.dataset.originalHTML;
        } else {
            // Fallback: remove highlighting spans
            const highlightedSpans = element.querySelectorAll('.tailieu-text-highlight');
            highlightedSpans.forEach(span => {
                span.outerHTML = span.textContent;
            });
        }
        
        element.classList.remove('tailieu-highlighted-question');
        
        // Remove tooltips (they should be restored with original HTML, but just in case)
        const tooltips = element.querySelectorAll('.tailieu-answer-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    });
    
    console.log('All highlights cleared');
}

// Show cached questions indicator
function showCachedQuestionsIndicator() {
    // Remove existing indicator
    const existingIndicator = document.getElementById('tailieu-cached-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    if (extensionQuestions.length === 0) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'tailieu-cached-indicator';
    indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            📚 <span>${extensionQuestions.length} câu hỏi sẵn sàng</span>
            <button id="tailieu-compare-now" style="background: #4caf50; color: white; border: none; border-radius: 3px; padding: 2px 8px; font-size: 11px; cursor: pointer;">
                So sánh ngay
            </button>
            <button id="tailieu-hide-indicator" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 11px; cursor: pointer;">
                ✕
            </button>
        </div>
    `;
    
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(33, 150, 243, 0.95);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 13px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add CSS animation
    if (!document.getElementById('tailieu-indicator-styles')) {
        const styles = document.createElement('style');
        styles.id = 'tailieu-indicator-styles';
        styles.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(indicator);
    
    // Add event listeners
    const compareNowBtn = document.getElementById('tailieu-compare-now');
    if (compareNowBtn) {
        compareNowBtn.addEventListener('click', () => {
            compareAndHighlightQuestions();
            indicator.remove();
        });
    }
    
    const hideBtn = document.getElementById('tailieu-hide-indicator');
    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            indicator.remove();
        });
    }
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        if (indicator && indicator.parentNode) {
            indicator.remove();
        }
    }, 8000);
}

// Add a floating button to show extension (optional)
function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'tailieu-floating-btn';
    button.innerHTML = '📚';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => {
        // Open extension popup programmatically (if possible)
        // Note: In Manifest V3, you can't open popup programmatically
        // This is just for visual feedback
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    });
    
    document.body.appendChild(button);
}

// Uncomment the line below if you want a floating button on every page
// createFloatingButton();