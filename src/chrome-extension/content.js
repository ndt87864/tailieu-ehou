// Content script for Tailieu Questions Extension
// Prevent multiple script injections
if (window.tailieuExtensionLoaded) {
    console.log('Tailieu Questions Extension already loaded, skipping');
} else {
    window.tailieuExtensionLoaded = true;
    console.log('Tailieu Questions Extension content script loaded');

// Store questions from extension for comparison
let extensionQuestions = [];
let answerHighlightingEnabled = true; // New setting

// Cache key for questions
const QUESTIONS_CACHE_KEY = 'tailieu_questions';

// Debug flags and throttling
let isComparing = false;
let lastCompareTime = 0;
const COMPARE_DEBOUNCE_MS = 2000; // 2 seconds
let debugMode = true; // Enable debug mode for troubleshooting

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
    
    // Also listen for dynamic content changes (only if not already observing)
    if (!window.tailieuMutationObserver) {
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
        
        window.tailieuMutationObserver = observer;
    }
}

// Perform auto-compare if we have cached questions
async function performAutoCompare(force = false) {
    // Throttle auto-compare to avoid too frequent calls (unless forced)
    const now = Date.now();
    if (!force && now - lastCompareTime < COMPARE_DEBOUNCE_MS) {
        debugLog('Auto-compare throttled, too soon since last compare');
        return;
    }
    
    // Skip if currently comparing
    if (isComparing) {
        debugLog('Auto-compare skipped, already comparing');
        return;
    }
    
    if (extensionQuestions.length === 0) {
        // Try to load from cache first
        await loadCachedQuestions();
    }
    
    if (extensionQuestions.length > 0) {
        debugLog('Auto-comparing questions on page:', extensionQuestions.length);
        lastCompareTime = now;
        isComparing = true;
        
        try {
            // Wait for page to be ready
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        window.addEventListener('load', resolve, { once: true });
                    }
                });
                
                // Additional small delay for dynamic content
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const result = await compareAndHighlightQuestions();
            
            if (result.matched > 0) {
                console.log(` Tự động so sánh: Tìm thấy ${result.matched}/${extensionQuestions.length} câu hỏi trên trang`);
                showAutoCompareNotification(result.matched, extensionQuestions.length);
                
                // Notify popup about successful comparison
                try {
                    // Check if extension context is valid before sending message
                    if (chrome?.runtime?.sendMessage) {
                        chrome.runtime.sendMessage({
                            action: 'comparisonComplete',
                            matched: result.matched,
                            total: extensionQuestions.length
                        });
                    }
                } catch (err) {
                    if (err.message.includes('Extension context invalidated')) {
                        console.log('Extension was reloaded, message sending skipped');
                    } else {
                        debugLog('Could not notify popup:', err.message);
                    }
                }
            } else {
                debugLog('Auto-compare completed, no matches found');
            }
        } finally {
            isComparing = false;
        }
    } else {
        debugLog('Auto-compare skipped, no questions available');
    }
}

// Show notification for auto-compare results
function showAutoCompareNotification(matched, total) {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
             <span>Tự động tìm thấy ${matched}/${total} câu hỏi</span>
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
    if (!window.tailieuUrlObserver) {
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(performAutoCompare, 1500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        window.tailieuUrlObserver = observer;
    }
}

// Start monitoring URL changes
monitorUrlChanges();

// Also listen to popstate events (back/forward buttons)
if (!window.tailieuPopstateListener) {
    window.addEventListener('popstate', () => {
        debugLog('Popstate event detected, performing auto-compare');
        setTimeout(performAutoCompare, 1000);
    });
    window.tailieuPopstateListener = true;
}

// Listen to pushstate/replacestate events (common in SPAs)
// Only override if not already overridden
if (!window.tailieuHistoryOverridden) {
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
    
    window.tailieuHistoryOverridden = true;
}

// Listen for storage changes to auto-trigger comparison
if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[QUESTIONS_CACHE_KEY]) {
            console.log('Questions cache updated, triggering auto-compare');
            
            // Update local questions cache
            if (changes[QUESTIONS_CACHE_KEY].newValue) {
                extensionQuestions = changes[QUESTIONS_CACHE_KEY].newValue;
                setTimeout(() => performAutoCompare(true), 500);
            }
        }
    });

    // Also listen for more specific cache changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            // Check for any tailieu cache updates
            const tailieusKeys = ['tailieu_selected_category', 'tailieu_selected_document'];
            const hasRelevantChanges = tailieusKeys.some(key => changes[key]);
            
            if (hasRelevantChanges) {
                setTimeout(async () => {
                    await loadCachedQuestions();
                    if (extensionQuestions.length > 0) {
                        performAutoCompare(true); // Force comparison
                    }
                }, 1000);
            }
        }
    });
}

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
        (async () => {
            try {
                extensionQuestions = request.questions || [];
                
                // Save to cache
                saveCachedQuestions();
                
                const result = await compareAndHighlightQuestions();
                sendResponse({ 
                    success: true, 
                    matchedQuestions: result.matched.length,
                    totalPageQuestions: result.pageQuestions.length 
                });
            } catch (error) {
                console.error('Error handling compareQuestions:', error);
                sendResponse({ error: error.message });
            }
        })();
        return true;
    }
    
    if (request.action === 'setExtensionQuestions') {
        try {
            extensionQuestions = request.questions || [];
            
            // Save to cache
            saveCachedQuestions();
            showCachedQuestionsIndicator();
            
            // Update questions popup with new questions
            updateQuestionsPopup(extensionQuestions);
            
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
    
    if (request.action === 'updateQuestionsPopup') {
        try {
            updateQuestionsPopup(request.questions || []);
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error handling updateQuestionsPopup:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
    
    if (request.action === 'clearCache') {
        try {
            // Clear extension questions
            extensionQuestions = [];
            
            // Clear localStorage cache
            localStorage.removeItem(QUESTIONS_CACHE_KEY);
            localStorage.removeItem('tailieu-questions-popup-visible');
            localStorage.removeItem('tailieu-questions-popup-minimized');
            localStorage.removeItem('tailieu-questions-popup-position');
            
            // Clear chrome storage cache
            if (chrome?.storage?.local) {
                chrome.storage.local.remove([QUESTIONS_CACHE_KEY]);
            }
            
            // Clear all highlights
            clearAllHighlights();
            
            // Hide cached questions indicator
            hideCachedQuestionsIndicator();
            
            // Clear questions popup
            updateQuestionsPopup([]);
            
            console.log('Content script cache cleared');
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error handling clearCache:', error);
            sendResponse({ error: error.message });
        }
        return true;
    }
    
    if (request.action === 'setAnswerHighlighting') {
        console.log('Setting answer highlighting:', request.enabled);
        answerHighlightingEnabled = request.enabled;
        sendResponse({ success: true });
        return;
    }
});

// Load cached questions from storage
async function loadCachedQuestions() {
    try {
        // Check if extension context is still valid
        if (!chrome?.storage?.local) {
            console.log('Extension context not available, skipping cache load');
            return;
        }
        
        const result = await chrome.storage.local.get(QUESTIONS_CACHE_KEY);
        if (result[QUESTIONS_CACHE_KEY] && result[QUESTIONS_CACHE_KEY].length > 0) {
            extensionQuestions = result[QUESTIONS_CACHE_KEY];
            console.log('Questions loaded from cache:', extensionQuestions.length);
            
            // Show cached questions indicator
            showCachedQuestionsIndicator();
            
            // Update questions popup with cached questions
            updateQuestionsPopup(extensionQuestions);
        }
    } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
            console.log('Extension was reloaded, cache loading skipped');
            return;
        }
        console.error('Error loading cached questions:', error);
    }
}

// Save questions to cache
async function saveCachedQuestions() {
    try {
        // Check if extension context is still valid
        if (!chrome?.storage?.local) {
            console.log('Extension context not available, skipping cache save');
            return;
        }
        
        await chrome.storage.local.set({ [QUESTIONS_CACHE_KEY]: extensionQuestions });
    } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
            console.log('Extension was reloaded, cache saving skipped');
            return;
        }
        console.error('Error saving questions to cache:', error);
    }
}

// Function to extract questions from current page
function extractQuestionsFromPage() {
    const questions = [];
    
    // Enhanced patterns for Vietnamese questions - focus on content, not labels
    const questionPatterns = [
        /Câu\s*\d+[:\.\)\s]/gi,
        /Bài\s*\d+[:\.\)\s]/gi,
        /Question\s*\d+[:\.\)\s]/gi,
        /\d+[\.\)]\s*/g,
        /^[A-Z].*[?？]\s*$/,  // Questions ending with question marks
        /^.{10,}[?？]\s*$/,    // Any text ending with question mark
        /.+\s+(là|gì|nào|thế nào|như thế nào|sao|tại sao|vì sao)\s*[?？]?\s*$/gi // Vietnamese question words
    ];
    
    // Look for question-like elements with enhanced selectors, prioritize content over labels
    // Exclude extension elements directly in selector
    const questionSelectors = [
        '.question-text:not([id*="tailieu"]):not([class*="tailieu"])', 
        '.question-content:not([id*="tailieu"]):not([class*="tailieu"])', 
        '.question-item:not([id*="tailieu"]):not([class*="tailieu"])', 
        '[class*="question"]:not([class*="number"]):not([class*="label"]):not([id*="tailieu"]):not([class*="tailieu"])', 
        '[class*="cau"]:not([class*="so"]):not([class*="stt"]):not([id*="tailieu"]):not([class*="tailieu"])', 
        '[class*="bai"]:not([class*="so"]):not([class*="stt"]):not([id*="tailieu"]):not([class*="tailieu"])',
        'div:not([class*="number"]):not([class*="label"]):not([id*="tailieu"]):not([class*="tailieu"])', 
        'p:not([class*="number"]):not([class*="label"]):not([id*="tailieu"]):not([class*="tailieu"])', 
        'span:not([class*="number"]):not([class*="label"]):not([id*="tailieu"]):not([class*="tailieu"])', 
        'li:not([id*="tailieu"]):not([class*="tailieu"])', 
        'h1:not([id*="tailieu"]):not([class*="tailieu"])', 
        'h2:not([id*="tailieu"]):not([class*="tailieu"])', 
        'h3:not([id*="tailieu"]):not([class*="tailieu"])', 
        'h4:not([id*="tailieu"]):not([class*="tailieu"])', 
        'h5:not([id*="tailieu"]):not([class*="tailieu"])', 
        'h6:not([id*="tailieu"]):not([class*="tailieu"])'
    ];
    
    // Additional filter to exclude elements inside extension containers
    let questionElements = document.querySelectorAll(questionSelectors.join(', '));
    
    // Filter out elements inside extension containers
    questionElements = Array.from(questionElements).filter(element => {
        // Skip if element is inside extension popup
        const extensionContainer = element.closest('#tailieu-questions-popup, [id*="tailieu"], [class*="tailieu"], [data-extension="true"]');
        if (extensionContainer) {
            debugLog('Filtering out element inside extension container:', element);
            return false;
        }
        
        // Additional check for high z-index containers (likely extension UI)
        const highZIndexContainer = element.closest('[style*="z-index"]');
        if (highZIndexContainer && highZIndexContainer.style.zIndex && parseInt(highZIndexContainer.style.zIndex) > 9999) {
            debugLog('Filtering out element inside high z-index container:', element);
            return false;
        }
        
        return true;
    });
    
    debugLog('Original elements found:', Array.from(document.querySelectorAll(questionSelectors.join(', '))).length);
    debugLog('Filtered elements after extension check:', questionElements.length);
    debugLog('Scanning', questionElements.length, 'elements for questions');
    
    questionElements.forEach((element, index) => {
        // Skip elements that belong to the extension
        if (isExtensionElement(element)) {
            debugLog('Skipping extension element:', element);
            return;
        }
        
        const text = element.textContent.trim();
        
        // Skip if too short, too long, or just whitespace
        if (text.length < 5 || text.length > 1000 || !text.match(/[a-zA-ZÀ-ỹ]/)) return;
        
        // Skip elements that are likely just question numbers or labels
        if (/^(Câu|Bài|Question)\s*\d+\s*[:\.\)]*\s*$/.test(text)) return;
        if (/^[A-D][\.\)]\s*$/.test(text)) return;
        if (/^\d+\s*[:\.\)]*\s*$/.test(text)) return;
        
        // Check if text looks like a question using multiple criteria
        let isQuestion = false;
        let questionReason = '';
        let cleanText = text;
        
        // Extract main content, removing prefixes
        const prefixMatch = text.match(/^(Câu\s*\d+[:\.\)\s]*|Bài\s*\d+[:\.\)\s]*|Question\s*\d+[:\.\)\s]*|\d+[\.\)]\s*)/i);
        if (prefixMatch) {
            cleanText = text.replace(prefixMatch[0], '').trim();
            if (cleanText.length > 10) {
                isQuestion = true;
                questionReason = 'has question prefix';
            }
        }
        
        // Pattern matching on clean text
        if (!isQuestion && questionPatterns.some(pattern => pattern.test(cleanText))) {
            isQuestion = true;
            questionReason = 'pattern match';
        }
        
        // Class name hints - prefer content classes
        if (!isQuestion && element.className) {
            const className = element.className.toLowerCase();
            if (className.match(/(question-text|question-content|question-item)/)) {
                isQuestion = true;
                questionReason = 'content class name';
            } else if (className.match(/(question|cau|bai)/) && !className.match(/(number|label|so|stt)/)) {
                isQuestion = true;
                questionReason = 'general class name';
            }
        }
        
        // Parent element hints
        if (!isQuestion) {
            const parent = element.closest('.question-text, .question-content, .question-item, [class*="question"]');
            if (parent && parent !== element) {
                isQuestion = true;
                questionReason = 'parent container';
            }
        }
        
        // Content-based detection for questions
        if (!isQuestion) {
            const questionWords = ['là gì', 'là ai', 'như thế nào', 'thế nào', 'tại sao', 'vì sao', 'khi nào', 'ở đâu', 'bao nhiêu', 'có phải', 'có đúng'];
            if (questionWords.some(word => cleanText.toLowerCase().includes(word))) {
                isQuestion = true;
                questionReason = 'question words';
            }
        }
        
        // Question mark detection
        if (!isQuestion && (cleanText.includes('?') || cleanText.includes('？'))) {
            isQuestion = true;
            questionReason = 'question mark';
        }
        
        // Structure-based detection - better filtering
        if (!isQuestion && cleanText.length > 15 && cleanText.length < 500) {
            // Check if starts with capital letter and has question-like structure
            if (/^[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ]/.test(cleanText)) {
                const sentences = cleanText.split(/[.!?]/);
                if (sentences.length <= 2 && cleanText.split(' ').length >= 4) {
                    isQuestion = true;
                    questionReason = 'structure analysis';
                }
            }
        }
        
        // Additional Vietnamese question patterns
        if (!isQuestion) {
            const vietnamesePatterns = [
                /\b(có|được|cần|phải|nên|là|gì|nào|đâu|sao|ai|khi|lúc|bao|thế|như|vì|tại)\b.*\?/gi,
                /.*(ưu điểm|nhược điểm|lợi ích|tác dụng|vai trò|chức năng|đặc điểm).*/gi,
                /.*(tình đến năm|khi đăng ký|theo|dựa vào|căn cứ).*/gi
            ];
            if (vietnamesePatterns.some(pattern => pattern.test(cleanText))) {
                isQuestion = true;
                questionReason = 'Vietnamese question pattern';
            }
        }

        if (isQuestion && cleanText.length > 5) {
            questions.push({
                element: element,
                text: cleanText,  // Use clean text for matching
                originalText: text,  // Keep full text for context
                index: index,
                reason: questionReason
            });
            
            debugLog(`Question found (${questionReason}): "${cleanText.substring(0, 50)}..."`);
        }
    });
    
    console.log('Found', questions.length, 'potential questions on page');
    
    // Also look specifically in our test page structure
    const testQuestions = document.querySelectorAll('.question-text');
    if (testQuestions.length > 0) {
        console.log('Found test page questions:', testQuestions.length);
        testQuestions.forEach((element, index) => {
            const text = element.textContent.trim();
            if (text && !questions.find(q => q.text === text || q.originalText === text)) {
                questions.push({
                    element: element,
                    text: text,
                    originalText: text,
                    index: `test-${index}`,
                    reason: 'test page structure'
                });
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
async function compareAndHighlightQuestions() {
    // Prevent excessive calls and logging
    const now = Date.now();
    if (isComparing || (now - lastCompareTime) < COMPARE_DEBOUNCE_MS) {
        console.log('Skipping comparison - too soon or already in progress');
        return { matched: [], pageQuestions: [] };
    }
    
    isComparing = true;
    lastCompareTime = now;
    
    // Update compare button to show comparing state
    updateCompareButtonProgress();
    
    const pageQuestions = extractQuestionsFromPage();
    const matched = [];
    
    console.log('=== QUESTION COMPARISON START ===');
    console.log('Extension questions:', extensionQuestions.length);
    console.log('Page questions found:', pageQuestions.length);
    
    // Debug: Log sample questions
    if (debugMode && extensionQuestions.length > 0) {
        console.log('Extension questions sample:', extensionQuestions.slice(0, 2).map(q => 
            `"${q.question?.substring(0, 50)}..." -> "${q.answer?.substring(0, 30)}..."`
        ));
    }
    if (debugMode && pageQuestions.length > 0) {
        console.log('Page questions sample:', pageQuestions.slice(0, 2).map(q => 
            `"${q.text?.substring(0, 50)}..." (${q.reason})`
        ));
    }
    
    const totalComparisons = pageQuestions.length * extensionQuestions.length;
    let comparisons = 0;
    
    for (let pageIndex = 0; pageIndex < pageQuestions.length; pageIndex++) {
        const pageQ = pageQuestions[pageIndex];
        const cleanPageQuestion = cleanQuestionText(pageQ.text);
        let matched_for_this_page = false;
        
        for (let extIndex = 0; extIndex < extensionQuestions.length && !matched_for_this_page; extIndex++) {
            const extQ = extensionQuestions[extIndex];
            const cleanExtQuestion = cleanQuestionText(extQ.question);
            comparisons++;
            
            // Check for similarity (exact match or high similarity)
            if (isQuestionSimilar(cleanPageQuestion, cleanExtQuestion)) {
                console.log(`✓ MATCH #${matched.length + 1}:`);
                console.log(`  Page: "${cleanPageQuestion.substring(0, 60)}..."`);
                console.log(`  DB:   "${cleanExtQuestion.substring(0, 60)}..."`);
                console.log(`  Answer: "${extQ.answer?.substring(0, 40)}..."`);
                
                // Highlight the question and try to find/highlight the answer
                highlightMatchedQuestion(pageQ, extQ);
                
                matched.push({
                    pageQuestion: pageQ.text,
                    extensionQuestion: extQ.question,
                    answer: extQ.answer,
                    similarity: calculateSimilarity(cleanPageQuestion, cleanExtQuestion)
                });
                
                matched_for_this_page = true; // Stop searching for this page question
            }
        }
        
        // Show progress for long lists
        if (totalComparisons > 100 && pageIndex % 10 === 0) {
            debugLog(`Progress: ${pageIndex}/${pageQuestions.length} page questions processed`);
        }
        
        // Small delay every 10 items to allow UI updates
        if ((pageIndex + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }
    
    console.log('=== COMPARISON COMPLETE ===');
    console.log(`Total comparisons made: ${comparisons}`);
    console.log(`Matches found: ${matched.length}/${pageQuestions.length}`);
    
    if (matched.length > 0) {
        console.log('Summary of matches:', matched.map((m, i) => 
            `${i+1}. "${m.pageQuestion.substring(0, 40)}..." (sim: ${m.similarity?.toFixed(2)})`
        ));
    }
    
    // Reset comparison flag and button after completion with small delay for visual feedback
    isComparing = false;
    setTimeout(() => {
        resetCompareButton(matched.length);
    }, 100); // Very short delay to show completion
    
    return { matched, pageQuestions };
}

// Update compare button to comparing state
function updateCompareButtonProgress() {
    const compareBtn = document.getElementById('tailieu-compare-now');
    if (compareBtn) {
        compareBtn.textContent = 'Đang so sánh...';
        compareBtn.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
        compareBtn.style.animation = 'pulse 1.5s ease-in-out infinite';
        compareBtn.disabled = true;
        
        // Add CSS animation if not exists
        if (!document.getElementById('tailieu-progress-styles')) {
            const styles = document.createElement('style');
            styles.id = 'tailieu-progress-styles';
            styles.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(styles);
        }
    }
}

// Reset compare button after completion
function resetCompareButton(matchedCount) {
    const compareBtn = document.getElementById('tailieu-compare-now');
    if (compareBtn) {
        // Remove animation
        compareBtn.style.animation = '';
        
        if (matchedCount > 0) {
            compareBtn.textContent = ` Hoàn thành (${matchedCount})`;
            compareBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45A049)';
            compareBtn.style.transform = 'scale(1.05)';
            compareBtn.disabled = true;
            
            // Small celebration effect
            setTimeout(() => {
                if (compareBtn) {
                    compareBtn.style.transform = 'scale(1)';
                }
            }, 200);
            
            // Auto-hide indicator after showing result
            setTimeout(() => {
                const indicator = document.getElementById('tailieu-cached-indicator');
                if (indicator) {
                    indicator.style.transform = 'translateX(100%)';
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 300);
                }
            }, 3000);
        } else {
            compareBtn.textContent = 'Không tìm thấy';
            compareBtn.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
            compareBtn.disabled = true;
            
            // Reset button after 2 seconds
            setTimeout(() => {
                if (compareBtn) {
                    compareBtn.textContent = ' So sánh ngay';
                    compareBtn.style.background = 'linear-gradient(135deg, #4caf50, #45A049)';
                    compareBtn.disabled = false;
                }
            }, 2000);
        }
    }
}

// Check if two questions are similar
function isQuestionSimilar(q1, q2) {
    // Exact match first
    if (q1 === q2) return true;
    
    // Clean both questions for better comparison
    const clean1 = cleanQuestionText(q1).toLowerCase();
    const clean2 = cleanQuestionText(q2).toLowerCase();
    
    if (clean1 === clean2) return true;
    
    // If one is much shorter than the other, unlikely to be similar
    const minLen = Math.min(clean1.length, clean2.length);
    const maxLen = Math.max(clean1.length, clean2.length);
    if (minLen < maxLen * 0.5) return false;
    
    // Check substring matches (one contains the other with high percentage)
    if (clean1.length > 20 && clean2.length > 20) {
        if (clean1.includes(clean2) && clean2.length / clean1.length > 0.7) return true;
        if (clean2.includes(clean1) && clean1.length / clean2.length > 0.7) return true;
    }
    
    // Calculate similarity using Levenshtein distance
    const similarity = calculateSimilarity(clean1, clean2);
    
    // Use dynamic threshold based on question length
    let threshold = 0.8; // Default threshold
    if (minLen < 50) threshold = 0.85;  // Shorter questions need higher similarity
    if (minLen > 100) threshold = 0.75; // Longer questions can have lower threshold
    
    // Additional check for key words matching
    const words1 = clean1.split(/\s+/).filter(w => w.length > 3);
    const words2 = clean2.split(/\s+/).filter(w => w.length > 3);
    
    if (words1.length > 0 && words2.length > 0) {
        const commonWords = words1.filter(w => words2.includes(w)).length;
        const wordSimilarity = (commonWords * 2) / (words1.length + words2.length);
        
        // If word similarity is high, lower the threshold
        if (wordSimilarity > 0.6) {
            threshold = Math.max(0.65, threshold - 0.1);
        }
    }
    
    const result = similarity >= threshold;
    
    if (result) {
        debugLog(`Question match found (${similarity.toFixed(3)}):`, clean1.substring(0, 50), '<=>', clean2.substring(0, 50));
    }
    
    return result;
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
    // Don't highlight within extension elements  
    if (isExtensionElement(element)) return;
    
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
        // Skip text nodes within extension elements
        if (!isExtensionElement(node.parentNode)) {
            textNodes.push(node);
        }
    }
    
    // Search for the text in text nodes - be more precise
    const searchLower = searchText.toLowerCase();
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const textLower = text.toLowerCase();
        
        // Check if this text node contains the search text
        let bestMatch = { index: -1, length: 0 };
        
        // Try exact match first
        let index = textLower.indexOf(searchLower);
        if (index !== -1) {
            bestMatch = { index: index, length: searchText.length };
        } else {
            // Try partial matches for longer texts
            if (searchText.length > 20) {
                const words = searchText.split(' ').filter(w => w.length > 3);
                for (const word of words) {
                    const wordIndex = textLower.indexOf(word.toLowerCase());
                    if (wordIndex !== -1 && word.length > bestMatch.length) {
                        bestMatch = { index: wordIndex, length: word.length };
                    }
                }
            }
        }
        
        if (bestMatch.index !== -1) {
            const parent = textNode.parentNode;
            
            // Skip if parent already has highlighting
            if (parent.classList.contains('tailieu-text-highlight')) return;
            
            // Create highlighted version
            const beforeText = text.substring(0, bestMatch.index);
            const matchedText = text.substring(bestMatch.index, bestMatch.index + bestMatch.length);
            const afterText = text.substring(bestMatch.index + bestMatch.length);
            
            // Create new nodes
            const fragment = document.createDocumentFragment();
            
            if (beforeText) {
                fragment.appendChild(document.createTextNode(beforeText));
            }
            
            // Create highlighted span - make it more subtle for questions
            const highlightSpan = document.createElement('span');
            highlightSpan.style.cssText = `
                background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
                border-radius: 3px !important;
                padding: 1px 3px !important;
                font-weight: bold !important;
                box-shadow: 0 1px 2px rgba(255,107,53,0.2) !important;
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
                <strong>Đáp án:</strong><br>
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
        
        // Try to highlight the answer on the page (only if enabled)
        if (answerHighlightingEnabled) {
            highlightAnswerOnPage(extensionQuestion.answer, element);
        }
    }
}

// Function to highlight answer text on the page
function highlightAnswerOnPage(answerText, questionElement) {
    if (!answerText || answerText.trim() === '' || !answerHighlightingEnabled) return;
    
    const cleanAnswer = cleanAnswerText(answerText);
    debugLog('Looking for answer on page:', cleanAnswer);
    
    // Search for answer in nearby elements and the whole page
    const searchContainers = [
        questionElement.parentElement || document.body, // Near question first
        questionElement, // Within question element
        document.body // Whole page as fallback
    ];
    
    const candidateElements = new Set(); // Use Set to avoid duplicates
    
    for (const container of searchContainers) {
        // Get elements near the question
        if (container === questionElement.parentElement) {
            const siblings = Array.from(container.children);
            const questionIndex = siblings.indexOf(questionElement);
            
            // Check elements around the question (before and after)
            for (let i = Math.max(0, questionIndex - 2); i < Math.min(questionIndex + 15, siblings.length); i++) {
                // Skip extension elements
                if (!isExtensionElement(siblings[i])) {
                    candidateElements.add(siblings[i]);
                    // Also check children of siblings
                    siblings[i].querySelectorAll('*').forEach(el => {
                        // Skip script, style, hidden elements and extension elements
                        if (el.tagName && !['SCRIPT', 'STYLE'].includes(el.tagName.toUpperCase()) && 
                            !el.hidden && el.textContent.trim().length > 0 && !isExtensionElement(el)) {
                            candidateElements.add(el);
                        }
                    });
                }
            }
        } else if (container === questionElement) {
            // Check within the question element itself
            questionElement.querySelectorAll('*').forEach(el => {
                if (!isExtensionElement(el)) {
                    candidateElements.add(el);
                }
            });
        } else {
            // Search in common answer container selectors
            const commonSelectors = [
                '.answer', '.answers', '.option', '.options', 
                '.choice', '.choices', '.response', '.responses',
                '[class*="answer"]', '[class*="option"]', '[class*="choice"]',
                '[class*="correct"]', '[class*="dap-an"]',
                'li', 'span', 'div', 'p', 'label'
            ];
            
            commonSelectors.forEach(selector => {
                try {
                    container.querySelectorAll(selector).forEach(el => {
                        // Skip extension elements
                        if (el.textContent.trim().length > 0 && !isExtensionElement(el)) {
                            candidateElements.add(el);
                        }
                    });
                } catch (e) {
                    // Ignore selector errors
                }
            });
        }
    }
    
    // Convert Set back to Array and filter out extension elements
    const elementsArray = Array.from(candidateElements).filter(el => 
        el && el.textContent && el.textContent.trim().length > 2 && !isExtensionElement(el)
    );
    
    // Look for various answer patterns
    const answerPatterns = generateAnswerPatterns(cleanAnswer);
    
    let found = false;
    let bestMatch = null;
    let bestScore = 0;
    
    // Search in candidate elements
    for (const candidateElement of elementsArray) {
        if (found && bestScore >= 0.95) break; // Stop if we found a very good match
        
        // Double check to skip extension elements
        if (isExtensionElement(candidateElement)) continue;
        
        const elementText = candidateElement.textContent?.toLowerCase().trim() || '';
        if (elementText.length < 2) continue; // Skip empty or very short elements
        
        // Skip if element is already highlighted
        if (candidateElement.classList.contains('tailieu-answer-highlight')) continue;
        
        for (const pattern of answerPatterns) {
            const patternLower = pattern.toLowerCase().trim();
            if (patternLower.length < 2) continue;
            
            // Calculate similarity score with better scoring
            const similarity = calculateAnswerSimilarity(elementText, patternLower);
            
            // Boost score for exact matches or elements with answer-like classes
            let boostedScore = similarity;
            if (elementText === patternLower || elementText.includes(patternLower)) {
                boostedScore = Math.min(1.0, similarity + 0.1);
            }
            
            if (candidateElement.className && 
                candidateElement.className.match(/(answer|correct|option|choice|dap-an)/i)) {
                boostedScore = Math.min(1.0, boostedScore + 0.05);
            }
            
            if (boostedScore > 0.6 && boostedScore > bestScore) { // Lowered threshold for better matching
                bestMatch = { element: candidateElement, pattern: pattern, score: boostedScore };
                bestScore = boostedScore;
                
                if (boostedScore >= 0.9) {
                    found = true;
                    break;
                }
            }
        }
    }
    
    // Highlight the best match if found
    if (bestMatch && bestScore > 0.6) {
        highlightAnswerTextInElement(bestMatch.element, bestMatch.pattern);
        debugLog('Answer highlighted:', bestMatch.pattern, 'in element:', bestMatch.element, 'score:', bestScore);
        found = true;
    }
    
    if (!found) {
        debugLog('Answer not found on page for:', cleanAnswer);
        
        // Try more aggressive search if no answer found
        const aggressivePatterns = [
            cleanAnswer.split(' ').slice(0, 3).join(' '), // First 3 words
            cleanAnswer.split(' ').slice(-3).join(' '), // Last 3 words
            cleanAnswer.replace(/[^\w\sÀ-ỹ]/g, '').trim() // Remove special chars
        ].filter(p => p.length > 3);
        
        for (const pattern of aggressivePatterns) {
            const found = tryHighlightPartialAnswer(pattern, elementsArray);
            if (found) break;
        }
    }
    
    return found;
}

// Helper function to check if element belongs to the extension
function isExtensionElement(element) {
    if (!element) return false;
    
    // Check if element itself has extension classes or IDs
    if (element.id && (element.id.includes('tailieu') || element.id.includes('extension'))) return true;
    if (element.className && element.className.includes && 
        (element.className.includes('tailieu') || element.className.includes('extension'))) return true;
    
    // Check for specific extension selectors
    const extensionSelectors = [
        '#tailieu-questions-popup',
        '#tailieu-floating-btn', 
        '#tailieu-compare-now',
        '.tailieu-answer-tooltip',
        '.tailieu-highlighted-question',
        '.tailieu-answer-highlight',
        '.tailieu-text-highlight',
        '[class*="tailieu"]',
        '[id*="tailieu"]',
        // Chrome extension popup and UI elements
        'body > [style*="z-index: 10"]', // High z-index elements
        '[data-extension]',
        '[data-tailieu]',
        '.chrome-extension-popup',
        '.extension-popup',
        '.extension-ui'
    ];
    
    for (const selector of extensionSelectors) {
        try {
            if (element.matches && element.matches(selector)) return true;
        } catch (e) {
            // Ignore selector errors
        }
    }
    
    // Check parent elements up to a reasonable depth
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 8) {
        // Check parent IDs and classes
        if (parent.id && (parent.id.includes('tailieu') || parent.id.includes('extension'))) return true;
        if (parent.className && parent.className.includes && 
            (parent.className.includes('tailieu') || parent.className.includes('extension'))) return true;
        
        // Check for common extension container attributes or high z-index
        if (parent.hasAttribute('data-extension') || 
            parent.hasAttribute('data-tailieu') ||
            (parent.style.zIndex && parseInt(parent.style.zIndex) > 9999)) return true;
            
        // Check if parent matches extension selectors
        for (const selector of extensionSelectors) {
            try {
                if (parent.matches && parent.matches(selector)) return true;
            } catch (e) {
                // Ignore selector errors
            }
        }
        
        parent = parent.parentElement;
        depth++;
    }
    
    return false;
}// Helper function for partial answer matching
function tryHighlightPartialAnswer(pattern, elementsArray) {
    const patternLower = pattern.toLowerCase();
    
    for (const element of elementsArray) {
        // Skip extension elements
        if (isExtensionElement(element)) continue;
        
        const elementText = element.textContent?.toLowerCase().trim() || '';
        if (elementText.includes(patternLower) && patternLower.length > 3) {
            highlightAnswerTextInElement(element, pattern);
            debugLog('Partial answer highlighted:', pattern);
            return true;
        }
    }
    return false;
}

// Generate various answer patterns to search for
function generateAnswerPatterns(cleanAnswer) {
    const patterns = new Set();
    
    // Add the clean answer
    patterns.add(cleanAnswer);
    
    // Add with common prefixes
    const prefixes = ['A.', 'B.', 'C.', 'D.', 'a)', 'b)', 'c)', 'd)', '1.', '2.', '3.', '4.', 'A)', 'B)', 'C)', 'D)'];
    prefixes.forEach(prefix => {
        patterns.add(`${prefix} ${cleanAnswer}`);
        patterns.add(`${prefix}${cleanAnswer}`); // Without space
    });
    
    // Add with Vietnamese answer markers
    const vietnameseMarkers = ['Đáp án:', 'Trả lời:', 'Kết quả:', 'Phương án:', 'Chọn:', 'Lựa chọn:'];
    vietnameseMarkers.forEach(marker => {
        patterns.add(`${marker} ${cleanAnswer}`);
        patterns.add(`${marker}${cleanAnswer}`); // Without space
    });
    
    // Add variations of the answer without common words
    const words = cleanAnswer.split(' ').filter(word => word.length > 0);
    if (words.length > 1) {
        // Try with only the most important words (skip common words)
        const importantWords = words.filter(word => 
            word.length > 2 && 
            !['là', 'của', 'được', 'có', 'và', 'hoặc', 'với', 'cho', 'từ', 'đến', 
              'trong', 'trên', 'dưới', 'về', 'theo', 'như', 'khi', 'nếu', 'nhưng',
              'để', 'đã', 'sẽ', 'đang', 'các', 'những', 'một', 'hai', 'ba'].includes(word.toLowerCase())
        );
        if (importantWords.length > 0 && importantWords.length < words.length) {
            patterns.add(importantWords.join(' '));
        }
        
        // Try first and last parts
        if (words.length > 3) {
            patterns.add(words.slice(0, Math.ceil(words.length / 2)).join(' '));
            patterns.add(words.slice(Math.floor(words.length / 2)).join(' '));
        }
    }
    
    // Add without special characters and extra spaces
    const cleanedAnswer = cleanAnswer.replace(/[^\w\sÀ-ỹ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanedAnswer !== cleanAnswer) {
        patterns.add(cleanedAnswer);
    }
    
    // Add shorter versions for long answers
    if (cleanAnswer.length > 50) {
        // First 30 characters
        patterns.add(cleanAnswer.substring(0, 30).trim());
        // Last 30 characters
        patterns.add(cleanAnswer.substring(cleanAnswer.length - 30).trim());
    }
    
    // Filter out very short patterns and return as array
    return Array.from(patterns).filter(p => p.trim().length > 2);
}

// Clean answer text for better matching
function cleanAnswerText(text) {
    return text
        .replace(/^[A-Da-d][\.\)]\s*/, '') // Remove A. B. C. D. prefixes
        .replace(/^\d+[\.\)]\s*/, '') // Remove number prefixes
        .replace(/^(Đáp án|Trả lời|Kết quả|Phương án|Chọn|Lựa chọn):\s*/gi, '') // Remove Vietnamese answer markers
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

// Calculate similarity between element text and answer pattern
function calculateAnswerSimilarity(elementText, pattern) {
    // Direct substring match gets high score
    if (elementText.includes(pattern)) {
        const ratio = pattern.length / elementText.length;
        return Math.min(0.95, 0.8 + ratio * 0.15); // Bonus for exact match
    }
    
    // Check for word-based similarity
    const elementWords = elementText.toLowerCase().split(/\s+/);
    const patternWords = pattern.toLowerCase().split(/\s+/);
    
    let matchedWords = 0;
    patternWords.forEach(patternWord => {
        if (elementWords.some(elementWord => 
            elementWord.includes(patternWord) || 
            patternWord.includes(elementWord) ||
            levenshteinDistance(elementWord, patternWord) <= Math.max(1, Math.floor(patternWord.length * 0.2))
        )) {
            matchedWords++;
        }
    });
    
    const wordSimilarity = matchedWords / patternWords.length;
    
    // Use Levenshtein distance for overall similarity
    const maxLen = Math.max(elementText.length, pattern.length);
    const levenSimilarity = maxLen > 0 ? 1 - (levenshteinDistance(elementText, pattern) / maxLen) : 0;
    
    // Combine both similarities
    return Math.max(wordSimilarity * 0.7 + levenSimilarity * 0.3, levenSimilarity);
}

// Clean answer text for better matching
function cleanAnswerText(text) {
    return text
        .replace(/^[A-Da-d][\.\)]\s*/, '') // Remove A. B. C. D. prefixes
        .replace(/^\d+[\.\)]\s*/, '') // Remove number prefixes
        .replace(/^(Đáp án|Trả lời|Kết quả):\s*/gi, '') // Remove Vietnamese answer markers
        .trim();
}

// Highlight answer text within an element
function highlightAnswerTextInElement(element, searchText) {
    // Don't highlight within extension elements
    if (isExtensionElement(element)) return;
    
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
        // Skip text nodes within extension elements
        if (!isExtensionElement(node.parentNode)) {
            textNodes.push(node);
        }
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
            
            // Skip if already highlighted
            if (parent.classList.contains('tailieu-answer-highlight')) return;
            
            // Create highlighted version
            const beforeText = text.substring(0, index);
            const matchedText = text.substring(index, index + searchText.length);
            const afterText = text.substring(index + searchText.length);
            
            // Create new nodes
            const fragment = document.createDocumentFragment();
            
            if (beforeText) {
                fragment.appendChild(document.createTextNode(beforeText));
            }
            
            // Create highlighted span for answer
            const highlightSpan = document.createElement('span');
            highlightSpan.style.cssText = `
                background: linear-gradient(135deg, #4CAF50, #8BC34A) !important;
                color: white !important;
                border-radius: 4px !important;
                padding: 3px 6px !important;
                font-weight: bold !important;
                box-shadow: 0 2px 4px rgba(76, 175, 80, 0.4) !important;
                border: 2px solid #2E7D32 !important;
            `;
            highlightSpan.className = 'tailieu-answer-highlight';
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



// Clear all highlights
function clearAllHighlights() {
    // Remove question highlights - restore original HTML (but skip extension elements)
    document.querySelectorAll('.tailieu-highlighted-question').forEach(element => {
        if (isExtensionElement(element)) return; // Skip extension elements
        
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
                if (!isExtensionElement(span)) {
                    span.outerHTML = span.textContent;
                }
            });
        }
        
        element.classList.remove('tailieu-highlighted-question');
        
        // Remove tooltips (they should be restored with original HTML, but just in case)
        const tooltips = element.querySelectorAll('.tailieu-answer-tooltip');
        tooltips.forEach(tooltip => {
            if (!isExtensionElement(tooltip)) {
                tooltip.remove();
            }
        });
    });
    
    // Remove answer highlights throughout the page (but skip extension elements)
    document.querySelectorAll('.tailieu-answer-highlight').forEach(span => {
        if (isExtensionElement(span)) return; // Skip extension elements
        
        const parent = span.parentNode;
        if (parent && !isExtensionElement(parent)) {
            parent.replaceChild(document.createTextNode(span.textContent), span);
            parent.normalize(); // Merge adjacent text nodes
        }
    });
    
    console.log('All highlights cleared (excluding extension elements)');
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
             <span>${extensionQuestions.length} câu hỏi sẵn sàng</span>
            <button id="tailieu-compare-now" style="background: linear-gradient(135deg, #4caf50, #45A049); color: white; border: none; border-radius: 3px; padding: 2px 8px; font-size: 11px; cursor: pointer; transition: all 0.2s ease;">
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
        compareNowBtn.addEventListener('click', async () => {
            if (!compareNowBtn.disabled) {
                await compareAndHighlightQuestions();
                // Don't remove indicator immediately, let resetCompareButton handle it
            }
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

// Hide cached questions indicator
function hideCachedQuestionsIndicator() {
    const existingIndicator = document.getElementById('tailieu-cached-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
}

// Add a floating button to show extension (optional)
function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'tailieu-floating-btn';
    button.innerHTML = `<?xml version="1.0" encoding="utf-8"?>
<!-- License: MIT. Made by Lucide Contributors: https://lucide.dev/ -->
<svg 
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="#ffffff"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
</svg>`;
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

// Create questions popup at bottom right
function createQuestionsPopup() {
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'tailieu-questions-popup';
    popup.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        display: block;
        overflow: hidden;
        transition: all 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        cursor: move;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'Danh sách câu hỏi';
    
    const controls = document.createElement('div');
    controls.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: center;
    `;
    
    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '−';
    minimizeBtn.style.cssText = `
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    // Create content area
    const content = document.createElement('div');
    content.id = 'tailieu-questions-content';
    content.style.cssText = `
        max-height: 400px;
        overflow-y: auto;
        padding: 0;
    `;

    // Create empty state
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
        padding: 40px 20px;
        text-align: center;
        color: #666;
    `;
    emptyState.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 16px;">
            <?xml version="1.0" encoding="utf-8"?>
            <!-- License: MIT. Made by Lucide Contributors: https://lucide.dev/ -->
            <svg 
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666666"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
        </div>
        <div style="font-weight: 500; margin-bottom: 8px;">Chưa có câu hỏi</div>
        <div style="font-size: 12px;">Vui lòng chọn tài liệu từ popup chính</div>
    `;
    content.appendChild(emptyState);

    popup.appendChild(header);
    popup.appendChild(content);
    document.body.appendChild(popup);

    // Add event listeners
    closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        // Save state
        localStorage.setItem('tailieu-questions-popup-visible', 'false');
    });

    let isMinimized = false;
    minimizeBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            content.style.display = 'none';
            popup.style.height = 'auto';
            minimizeBtn.innerHTML = '□';
        } else {
            content.style.display = 'block';
            minimizeBtn.innerHTML = '−';
        }
        localStorage.setItem('tailieu-questions-popup-minimized', isMinimized.toString());
    });

    // Make header draggable
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - popup.offsetLeft;
        dragOffset.y = e.clientY - popup.offsetTop;
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            popup.style.left = (e.clientX - dragOffset.x) + 'px';
            popup.style.top = (e.clientY - dragOffset.y) + 'px';
            popup.style.right = 'auto';
            popup.style.bottom = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
            // Save position
            localStorage.setItem('tailieu-questions-popup-position', JSON.stringify({
                left: popup.style.left,
                top: popup.style.top,
                right: popup.style.right,
                bottom: popup.style.bottom
            }));
        }
    });

    // Create toggle button to show/hide popup
    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'tailieu-questions-toggle-btn';
    toggleBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 80px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999998;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        font-size: 24px;
    `;
    toggleBtn.innerHTML = `
        <?xml version="1.0" encoding="utf-8"?>
        <!-- License: MIT. Made by Lucide Contributors: https://lucide.dev/ -->
        <svg 
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    `;
    toggleBtn.title = 'Hiển thị/Ẩn danh sách câu hỏi';

    toggleBtn.addEventListener('click', () => {
        const isVisible = popup.style.display !== 'none';
        popup.style.display = isVisible ? 'none' : 'block';
        localStorage.setItem('tailieu-questions-popup-visible', (!isVisible).toString());
        console.log('Toggle button clicked, popup now:', !isVisible ? 'visible' : 'hidden');
    });

    toggleBtn.addEventListener('mouseenter', () => {
        toggleBtn.style.transform = 'scale(1.1)';
    });

    toggleBtn.addEventListener('mouseleave', () => {
        toggleBtn.style.transform = 'scale(1)';
    });

    document.body.appendChild(toggleBtn);
    console.log('Toggle button created and added to DOM');

    // Restore saved state
    const savedVisible = localStorage.getItem('tailieu-questions-popup-visible');
    const savedMinimized = localStorage.getItem('tailieu-questions-popup-minimized');
    
    // Initially hide popup - only show when there are questions
    popup.style.display = 'none';

    if (savedMinimized === 'true') {
        isMinimized = true;
        content.style.display = 'none';
        minimizeBtn.innerHTML = '□';
    }

    const savedPosition = localStorage.getItem('tailieu-questions-popup-position');
    if (savedPosition) {
        try {
            const position = JSON.parse(savedPosition);
            if (position.left && position.left !== 'auto') popup.style.left = position.left;
            if (position.top && position.top !== 'auto') popup.style.top = position.top;
            if (position.right && position.right !== 'auto') popup.style.right = position.right;
            if (position.bottom && position.bottom !== 'auto') popup.style.bottom = position.bottom;
        } catch (e) {
            console.log('Could not restore popup position:', e);
        }
    }

    console.log('Questions popup created successfully');
    return popup;
}

// Update questions popup content
function updateQuestionsPopup(questions = []) {
    const popup = document.getElementById('tailieu-questions-popup');
    const content = document.getElementById('tailieu-questions-content');
    
    if (!popup || !content) {
        console.log('Popup or content not found, creating popup...');
        createQuestionsPopup();
        // Try again after creating
        setTimeout(() => updateQuestionsPopup(questions), 100);
        return;
    }

    if (questions.length === 0) {
        // Hide popup when no questions
        popup.style.display = 'none';
        localStorage.setItem('tailieu-questions-popup-visible', 'false');
        
        content.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #666;">
                <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 16px;">
                    <?xml version="1.0" encoding="utf-8"?>
                    <!-- License: MIT. Made by Lucide Contributors: https://lucide.dev/ -->
                    <svg 
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#666666"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </div>
                <div style="font-weight: 500; margin-bottom: 8px;">Chưa có câu hỏi</div>
                <div style="font-size: 12px;">Vui lòng chọn tài liệu từ popup chính</div>
            </div>
        `;
        return;
    }

    // Show popup when questions are available
    popup.style.display = 'block';
    localStorage.setItem('tailieu-questions-popup-visible', 'true');

    // Create questions list
    content.innerHTML = '';
    
    // Add search bar
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
        padding: 15px 20px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Tìm kiếm câu hỏi...';
    searchInput.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 13px;
        box-sizing: border-box;
    `;
    
    searchContainer.appendChild(searchInput);
    content.appendChild(searchContainer);

    // Questions container
    const questionsContainer = document.createElement('div');
    questionsContainer.id = 'questions-list-container';
    
    questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item-popup';
        questionItem.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background-color 0.2s;
        `;
        
        questionItem.addEventListener('mouseenter', () => {
            questionItem.style.backgroundColor = '#f8f9fa';
        });
        
        questionItem.addEventListener('mouseleave', () => {
            questionItem.style.backgroundColor = 'white';
        });

        // Question number and text
        const questionHeader = document.createElement('div');
        questionHeader.style.cssText = `
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 13px;
            line-height: 1.4;
        `;
        questionHeader.innerHTML = `<span style="color: #667eea;">#${index + 1}</span> ${question.question}`;

        // Answer
        const answerDiv = document.createElement('div');
        answerDiv.style.cssText = `
            color: #666;
            font-size: 12px;
            background: #f0f8ff;
            padding: 8px 12px;
            border-radius: 6px;
            border-left: 3px solid #667eea;
            margin-top: 8px;
            line-height: 1.4;
        `;
        answerDiv.innerHTML = `<strong>Đáp án:</strong> ${question.answer}`;

        questionItem.appendChild(questionHeader);
        questionItem.appendChild(answerDiv);

        // Click to highlight on page
        questionItem.addEventListener('click', () => {
            // Try to find and highlight this question on the page
            highlightQuestionOnPage(question.question);
            
            // Visual feedback
            questionItem.style.backgroundColor = '#e3f2fd';
            setTimeout(() => {
                questionItem.style.backgroundColor = '';
            }, 1000);
        });

        questionsContainer.appendChild(questionItem);
    });

    content.appendChild(questionsContainer);

    // Add search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const questionItems = questionsContainer.querySelectorAll('.question-item-popup');
        
        questionItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });

    // Update header title with count
    const header = popup.querySelector('div');
    if (header) {
        const title = header.querySelector('div');
        if (title) {
            title.textContent = `Danh sách câu hỏi (${questions.length})`;
        }
    }
}

// Highlight question on page when clicked from popup
function highlightQuestionOnPage(questionText) {
    // Clear previous highlights
    clearAllHighlights();
    
    const pageQuestions = extractQuestionsFromPage();
    const cleanTargetText = cleanQuestionText(questionText);
    
    for (const pageQuestion of pageQuestions) {
        const cleanPageText = cleanQuestionText(pageQuestion.text);
        if (isQuestionSimilar(cleanTargetText, cleanPageText)) {
            // Highlight this element
            pageQuestion.element.style.cssText += `
                background: linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%) !important;
                padding: 8px !important;
                border-radius: 6px !important;
                border: 2px solid #ff9800 !important;
                box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3) !important;
                animation: highlightPulse 2s ease-in-out !important;
            `;
            
            // Scroll to element
            pageQuestion.element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Show notification
            showHighlightNotification(questionText);
            break;
        }
    }
}

// Show highlight notification
function showHighlightNotification(questionText) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10001;
        font-size: 13px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        max-width: 400px;
        text-align: center;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;"> Đã tìm thấy câu hỏi</div>
        <div style="font-size: 11px; opacity: 0.9;">${questionText.substring(0, 60)}${questionText.length > 60 ? '...' : ''}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Create questions popup at bottom right
console.log('Creating questions popup...');
const questionsPopup = createQuestionsPopup();
console.log('Questions popup created:', questionsPopup ? 'Success' : 'Failed');

// Expose functions for debugging
window.tailieuDebug = {
    updateQuestionsPopup: updateQuestionsPopup,
    createQuestionsPopup: createQuestionsPopup,
    extensionQuestions: () => extensionQuestions,
    showPopup: () => {
        const popup = document.getElementById('tailieu-questions-popup');
        if (popup) {
            popup.style.display = 'block';
            console.log('Popup forced to show');
        }
    },
    hidePopup: () => {
        const popup = document.getElementById('tailieu-questions-popup');
        if (popup) {
            popup.style.display = 'none';
            console.log('Popup hidden');
        }
    }
};


} 