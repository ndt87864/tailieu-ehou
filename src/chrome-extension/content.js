// Content script for Tailieu Questions Extension
console.log('Tailieu Questions Extension content script loaded');

// Store questions from extension for comparison
let extensionQuestions = [];

// Debug flags and throttling
let isComparing = false;
let lastCompareTime = 0;
const COMPARE_DEBOUNCE_MS = 2000; // 2 seconds
let debugMode = false; // Set to true for verbose logging

// Conditional logging function
function debugLog(...args) {
    if (debugMode) {
        console.log(...args);
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'getPageInfo') {
        sendResponse({
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname
        });
    }
    
    if (request.action === 'compareQuestions') {
        extensionQuestions = request.questions || [];
        const result = compareAndHighlightQuestions();
        sendResponse({ 
            success: true, 
            matchedQuestions: result.matched,
            totalPageQuestions: result.pageQuestions.length 
        });
    }
    
    if (request.action === 'clearHighlights') {
        clearAllHighlights();
        sendResponse({ success: true });
    }
    
    if (request.action === 'toggleDebug') {
        debugMode = !debugMode;
        console.log('Debug mode:', debugMode ? 'ON' : 'OFF');
        sendResponse({ success: true, debugMode: debugMode });
    }
});

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
    
    // Highlight the question
    if (!element.classList.contains('tailieu-highlighted-question')) {
        element.style.cssText += `
            background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
            border: 2px solid #ff6b35 !important;
            border-radius: 5px !important;
            padding: 8px !important;
            margin: 5px 0 !important;
            position: relative !important;
            box-shadow: 0 2px 8px rgba(255,107,53,0.3) !important;
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
    
    // Try to find and highlight answer options near the question
    highlightAnswerOptions(element, extensionQuestion.answer);
}

// Try to highlight answer options
function highlightAnswerOptions(questionElement, correctAnswer) {
    console.log('Looking for answers for:', correctAnswer);
    
    // Try multiple container strategies
    const containers = [
        // 1. Look in immediate parent
        questionElement.parentElement,
        // 2. Look in closest common container
        questionElement.closest('div.question, .question-item, .question'),
        // 3. Look in next siblings area
        questionElement.closest('div, section, article'),
        // 4. Look in document wide for nearby elements
        document
    ].filter(Boolean);
    
    let foundAnswer = false;
    
    for (const container of containers) {
        if (foundAnswer) break;
        
        // Find ALL possible answer elements with different strategies
        let answerElements = [];
        
        if (container === document) {
            // For document-wide search, look around the question position
            const questionRect = questionElement.getBoundingClientRect();
            const allElements = document.querySelectorAll('div, p, span, li, td, th');
            
            answerElements = Array.from(allElements).filter(el => {
                const rect = el.getBoundingClientRect();
                // Look for elements within reasonable distance from question
                return rect.top > questionRect.bottom - 50 && 
                       rect.top < questionRect.bottom + 300;
            });
        } else {
            answerElements = container.querySelectorAll('div, p, span, li, td, th, .answer-option, .option');
        }
        
        console.log(`Checking ${answerElements.length} potential answer elements in container`);
        
        answerElements.forEach(element => {
            if (foundAnswer) return;
            
            const text = element.textContent.trim();
            if (!text || text.length < 2) return;
            
            // Enhanced answer option detection patterns
            const answerPatterns = [
                /^[A-D][\.\)]\s*/i,           // A. B. C. D.
                /^\d+[\.\)]\s*/,             // 1. 2. 3. 4.
                /^[A-D]\s*[:]\s*/i,          // A: B: C: D:
                /^[A-D]\s*[-]\s*/i,          // A- B- C- D-
                /^Đáp án\s*[A-D]/i,          // Đáp án A
                /^Câu trả lời\s*[A-D]/i     // Câu trả lời A
            ];
            
            const isAnswerOption = answerPatterns.some(pattern => pattern.test(text)) ||
                                 element.classList.contains('answer') ||
                                 element.classList.contains('option') ||
                                 element.classList.contains('answer-option') ||
                                 element.closest('.answer-options, .answers, .options');
            
            if (isAnswerOption) {
                // Clean the answer text more thoroughly
                let cleanAnswerText = text
                    .replace(/^[A-D][\.\):\-]\s*/i, '')
                    .replace(/^\d+[\.\)]\s*/, '')
                    .replace(/^Đáp án\s*[A-D][\.\):\-]?\s*/i, '')
                    .replace(/^Câu trả lời\s*[A-D][\.\):\-]?\s*/i, '')
                    .trim()
                    .toLowerCase();
                
                let cleanCorrectAnswer = correctAnswer.toLowerCase().trim();
                
                // Multiple comparison strategies
                const isMatch = (
                    // Exact match
                    cleanAnswerText === cleanCorrectAnswer ||
                    
                    // Contains match (either direction)
                    (cleanAnswerText.length > 5 && cleanAnswerText.includes(cleanCorrectAnswer)) ||
                    (cleanCorrectAnswer.length > 5 && cleanCorrectAnswer.includes(cleanAnswerText)) ||
                    
                    // Remove punctuation and compare
                    cleanAnswerText.replace(/[^\w\s]/g, '') === cleanCorrectAnswer.replace(/[^\w\s]/g, '') ||
                    
                    // Similarity check for longer texts
                    (cleanAnswerText.length > 10 && cleanCorrectAnswer.length > 10 && 
                     calculateSimilarity(cleanAnswerText, cleanCorrectAnswer) > 0.7)
                );
                
                if (isMatch) {
                    console.log('Found matching answer:', text);
                    console.log('Clean answer text:', cleanAnswerText);
                    console.log('Clean correct answer:', cleanCorrectAnswer);
                    
                    // Highlight the answer
                    element.style.cssText += `
                        background: linear-gradient(135deg, #4CAF50, #45a049) !important;
                        color: white !important;
                        font-weight: bold !important;
                        border-radius: 8px !important;
                        padding: 8px 12px !important;
                        margin: 3px 0 !important;
                        border: 3px solid #2e7d32 !important;
                        box-shadow: 0 4px 12px rgba(76,175,80,0.5) !important;
                        position: relative !important;
                        z-index: 1000 !important;
                    `;
                    element.classList.add('tailieu-highlighted-answer');
                    
                    // Add animated checkmark
                    if (!element.querySelector('.tailieu-checkmark')) {
                        const checkmark = document.createElement('span');
                        checkmark.className = 'tailieu-checkmark';
                        checkmark.innerHTML = ' ✅';
                        checkmark.style.cssText = `
                            color: #fff !important;
                            font-weight: bold !important;
                            margin-left: 8px !important;
                            font-size: 16px !important;
                            animation: bounce 0.6s ease-in-out !important;
                        `;
                        element.appendChild(checkmark);
                    }
                    
                    // Add success indicator
                    if (!element.querySelector('.tailieu-success-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'tailieu-success-indicator';
                        indicator.innerHTML = '🎯 ĐÚNG';
                        indicator.style.cssText = `
                            position: absolute !important;
                            top: -8px !important;
                            right: -8px !important;
                            background: #ff6b35 !important;
                            color: white !important;
                            padding: 2px 6px !important;
                            border-radius: 10px !important;
                            font-size: 10px !important;
                            font-weight: bold !important;
                            z-index: 1001 !important;
                        `;
                        element.style.position = 'relative';
                        element.appendChild(indicator);
                    }
                    
                    foundAnswer = true;
                }
            }
        });
    }
    
    if (!foundAnswer) {
        console.log('No matching answer found for:', correctAnswer);
        // Try a fallback search for any element containing the answer
        const fallbackElements = document.querySelectorAll('*');
        Array.from(fallbackElements).forEach(el => {
            if (foundAnswer) return;
            const text = el.textContent?.trim();
            if (text && text.length > 3 && text.length < 200) {
                const cleanText = text.toLowerCase().trim();
                const cleanAnswer = correctAnswer.toLowerCase().trim();
                
                if (cleanText.includes(cleanAnswer) && calculateSimilarity(cleanText, cleanAnswer) > 0.8) {
                    console.log('Fallback match found:', text);
                    el.style.cssText += `
                        background: linear-gradient(135deg, #4CAF50, #45a049) !important;
                        color: white !important;
                        border-radius: 5px !important;
                        padding: 4px 8px !important;
                    `;
                    el.classList.add('tailieu-highlighted-answer');
                    foundAnswer = true;
                }
            }
        });
    }
}

// Clear all highlights
function clearAllHighlights() {
    // Remove question highlights
    document.querySelectorAll('.tailieu-highlighted-question').forEach(element => {
        element.style.background = '';
        element.style.border = '';
        element.style.borderRadius = '';
        element.style.padding = '';
        element.style.margin = '';
        element.style.position = '';
        element.style.boxShadow = '';
        element.classList.remove('tailieu-highlighted-question');
        
        // Remove tooltips
        const tooltip = element.querySelector('.tailieu-answer-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    });
    
    // Remove answer highlights
    document.querySelectorAll('.tailieu-highlighted-answer').forEach(element => {
        element.style.background = '';
        element.style.color = '';
        element.style.fontWeight = '';
        element.style.borderRadius = '';
        element.style.padding = '';
        element.style.margin = '';
        element.style.border = '';
        element.style.boxShadow = '';
        element.classList.remove('tailieu-highlighted-answer');
        
        // Remove checkmarks
        const checkmark = element.querySelector('.tailieu-checkmark');
        if (checkmark) {
            checkmark.remove();
        }
    });
    
    console.log('All highlights cleared');
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