// Question Scanner - Quét câu hỏi và đáp án từ web
// Chức năng: Quét câu hỏi và tìm đáp án theo pattern "Đáp án đúng là: ..."

(function() {
    'use strict';

    // Prevent multiple injections
    if (window.tailieuScannerLoaded) {
        return;
    }
    window.tailieuScannerLoaded = true;

    let scannedQuestions = [];
    let existingQuestions = [];

    // Normalize text for comparison
    function normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/gi, '');
    }

    // Check if question is invalid/noise
    function isInvalidQuestion(text) {
        if (!text || text.length < 10) return true;
        
        const trimmedText = text.trim();
        
        // Pattern: "Question 1 Trang này", "Question 2 Trang này", etc.
        if (/^Question\s+\d+\s+Trang\s+này$/i.test(trimmedText)) {
            return true;
        }
        
        // Pattern: "Mô tả câu hỏi" (exact match or starts with)
        if (/^Mô tả câu hỏi/i.test(trimmedText)) {
            return true;
        }
        
        // Pattern: Contains only "Mô tả câu hỏi"
        if (trimmedText.toLowerCase() === 'mô tả câu hỏi') {
            return true;
        }
        
        // Pattern: Just "Question N" or "Câu N"
        if (/^(Question|Câu)\s+\d+$/i.test(trimmedText)) {
            return true;
        }
        
        // Pattern: "Trang này" alone
        if (/^Trang\s+này$/i.test(trimmedText)) {
            return true;
        }
        
        // Pattern: Contains only "Question N Trang này" pattern repeatedly
        if (/^(Question\s+\d+\s+Trang\s+này\s*)+$/i.test(trimmedText)) {
            return true;
        }
        
        // Pattern: Contains "Mô tả câu hỏi" followed by Question N Trang này
        if (/Mô tả câu hỏi.*Question\s+\d+\s+Trang\s+này/i.test(trimmedText)) {
            return true;
        }
        
        return false;
    }

    // Clean question text - remove "Mô tả câu hỏi" prefix and everything from "Chọn một câu trả lời:" onwards
    function cleanQuestionText(text) {
        if (!text) return '';
        
        let cleaned = text.trim();
        
        // Remove "Mô tả câu hỏi" prefix with optional whitespace
        cleaned = cleaned.replace(/^Mô tả câu hỏi\s*/i, '');
        
        // Remove everything from "Chọn một câu trả lời:" onwards (and the phrase itself)
        cleaned = cleaned.replace(/\s*Chọn một câu trả lời:[\s\S]*/i, '');
        
        // Remove "Choose one answer:" and everything after
        cleaned = cleaned.replace(/\s*Choose one answer:[\s\S]*/i, '');
        
        // Remove "Select one:" and everything after
        cleaned = cleaned.replace(/\s*Select one:[\s\S]*/i, '');
        
        // Remove other common patterns that indicate start of answer section
        cleaned = cleaned.replace(/\s*(a|A)\.\s+/g, ' '); // Remove answer choices
        cleaned = cleaned.replace(/\s+(b|B)\.\s+/g, ' ');
        cleaned = cleaned.replace(/\s+(c|C)\.\s+/g, ' ');
        cleaned = cleaned.replace(/\s+(d|D)\.\s+/g, ' ');
        
        // Clean up extra whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    }

    // Extract core question (without answer choices)
    function extractCoreQuestion(questionText) {
        let core = cleanQuestionText(questionText);
        
        // Split by newline and get first meaningful line (actual question)
        const lines = core.split('\n');
        let firstLine = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]?.trim();
            if (!line) continue;
            
            // Skip if it looks like an answer choice (a. b. c. d.)
            if (line.match(/^[a-d]\.\s*/i)) continue;
            
            firstLine = line;
            break;
        }
        
        return firstLine || core;
    }

    // Check if two questions are duplicates (same core question)
    function isDuplicateQuestion(q1Text, q2Text) {
        const core1 = normalizeText(extractCoreQuestion(q1Text));
        const core2 = normalizeText(extractCoreQuestion(q2Text));
        
        return core1 === core2;
    }

    // Extract questions from page
    function extractQuestionsFromPage() {
        const questions = [];
        
        // Pattern 1: Tìm các thẻ chứa câu hỏi
        const questionElements = document.querySelectorAll('.qtext, .question-text, [class*="question"], .formulation');
        
        questionElements.forEach((element, index) => {
            try {
                const questionText = element.innerText?.trim();
                if (!questionText || questionText.length < 10) return;

                // Tìm đáp án theo pattern "Đáp án đúng là: ..."
                let answer = null;
                
                // Tìm trong element hiện tại và các element xung quanh
                const searchContext = element.closest('.que, .question, .quiz-question, [class*="question-container"]') || element.parentElement;
                
                if (searchContext) {
                    const contextText = searchContext.innerText || '';
                    
                    // Pattern: "Đáp án đúng là: ABC" hoặc "Đáp án đúng là ABC"
                    const answerPatterns = [
                        /Đáp án đúng là:\s*(.+?)(?:\n|$)/i,
                        /Đáp án đúng là\s+(.+?)(?:\n|$)/i,
                        /Correct answer is:\s*(.+?)(?:\n|$)/i,
                        /Đáp án:\s*(.+?)(?:\n|$)/i,
                        /Answer:\s*(.+?)(?:\n|$)/i
                    ];

                    for (const pattern of answerPatterns) {
                        const match = contextText.match(pattern);
                        if (match && match[1]) {
                            answer = match[1].trim();
                            // Loại bỏ các ký tự không cần thiết
                            answer = answer.replace(/[.。,，;；]+$/, '').trim();
                            if (answer.length > 0 && answer.length < 500) {
                                break;
                            }
                        }
                    }
                }

                questions.push({
                    question: questionText,
                    answer: answer,
                    element: element,
                    index: index
                });

            } catch (error) {
                console.error('Error extracting question:', error);
            }
        });

        return questions;
    }

    // Load existing questions from extension storage
    async function loadExistingQuestions() {
        try {
            const result = await chrome.storage.local.get(['tailieu_questions']);
            existingQuestions = result.tailieu_questions || [];
            console.log(`Loaded ${existingQuestions.length} existing questions from storage`);
        } catch (error) {
            console.error('Error loading existing questions:', error);
            existingQuestions = [];
        }
    }

    // Check if question already exists in database
    function isQuestionNew(questionText) {
        const normalizedQuestion = normalizeText(questionText);
        
        return !existingQuestions.some(existingQ => {
            const existingNormalized = normalizeText(existingQ.question);
            return existingNormalized === normalizedQuestion;
        });
    }

    // Merge duplicate questions (only merge if both question AND answer are the same)
    function mergeDuplicateQuestions(questions) {
        if (questions.length === 0) return [];
        
        const merged = [];
        const processed = new Set();
        
        for (let i = 0; i < questions.length; i++) {
            if (processed.has(i)) continue;
            
            const currentQ = questions[i];
            const duplicates = [currentQ];
            
            // Find all duplicates of current question (must have same question AND same answer)
            for (let j = i + 1; j < questions.length; j++) {
                if (processed.has(j)) continue;
                
                const otherQ = questions[j];
                
                // Only merge if both question and answer are the same
                if (isDuplicateQuestion(currentQ.question, otherQ.question)) {
                    // Check if answers are also the same (or both null)
                    const currentAnswer = (currentQ.answer || '').trim().toLowerCase();
                    const otherAnswer = (otherQ.answer || '').trim().toLowerCase();
                    
                    if (currentAnswer === otherAnswer) {
                        duplicates.push(otherQ);
                        processed.add(j);
                    }
                }
            }
            
            // Merge duplicates only if we found actual duplicates
            if (duplicates.length > 1) {
                // Keep the first question
                const mergedItem = {
                    question: currentQ.question,
                    answer: currentQ.answer || null,
                    duplicateCount: duplicates.length
                };
                
                merged.push(mergedItem);
            } else {
                merged.push(currentQ);
            }
            
            processed.add(i);
        }
        
        return merged;
    }

    // Scan and show new questions
    async function scanQuestions() {
        console.log('🔍 Starting question scan...');
        
        // Show loading notification
        showNotification('Đang quét câu hỏi...', 'info', 2000);

        // Load existing questions first
        await loadExistingQuestions();

        // Extract questions from page
        const allQuestions = extractQuestionsFromPage();
        console.log(`Found ${allQuestions.length} questions on page`);

        // Filter new questions only and clean question text
        let newQuestions = allQuestions
            .filter(q => isQuestionNew(q.question))
            .map(q => ({
                ...q,
                question: cleanQuestionText(q.question)
            }));
        
        // Merge duplicate questions
        scannedQuestions = mergeDuplicateQuestions(newQuestions);
        
        console.log(`Found ${scannedQuestions.length} new questions (after merging duplicates)`);

        if (scannedQuestions.length === 0) {
            showNotification('Không tìm thấy câu hỏi mới', 'info', 3000);
            return;
        }

        // Show popup with scanned questions
        showScannerPopup();
        
        showNotification(`Đã quét được ${scannedQuestions.length} câu hỏi mới`, 'success', 3000);
    }

    // Show notification
    function showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Show scanner popup with results
    function showScannerPopup() {
        // Remove existing popup if any
        const existingPopup = document.getElementById('tailieu-scanner-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        const popup = document.createElement('div');
        popup.id = 'tailieu-scanner-popup';
        popup.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 500px;
            max-height: 600px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10003;
            display: flex;
            flex-direction: column;
            font-family: Arial, sans-serif;
            animation: slideInLeft 0.3s ease-out;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const title = document.createElement('div');
        const titleMain = document.createElement('div');
        titleMain.style.cssText = 'font-size: 18px; font-weight: bold;';
        titleMain.textContent = '📝 Câu hỏi mới';

        const titleSub = document.createElement('div');
        titleSub.style.cssText = 'font-size: 12px; opacity: 0.9; margin-top: 4px;';
        titleSub.textContent = `${scannedQuestions.length} câu hỏi chưa có trong database`;

        title.appendChild(titleMain);
        title.appendChild(titleSub);
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
        closeBtn.onclick = () => popup.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Question list container
        const listContainer = document.createElement('div');
        listContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: #f5f5f5;
        `;

        // Render list from the merged `scannedQuestions` array so numbering follows merged order
        function renderList() {
            // Clear container
            listContainer.innerHTML = '';

            scannedQuestions.forEach((item, index) => {
                const questionItem = document.createElement('div');
                questionItem.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: transform 0.2s, box-shadow 0.2s;
                `;
                questionItem.onmouseover = () => {
                    questionItem.style.transform = 'translateY(-2px)';
                    questionItem.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                };
                questionItem.onmouseout = () => {
                    questionItem.style.transform = 'translateY(0)';
                    questionItem.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                };

                const questionNumber = document.createElement('div');
                questionNumber.style.cssText = `
                    font-size: 12px;
                    color: #667eea;
                    font-weight: bold;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                const numberText = document.createElement('span');
                numberText.textContent = `Câu ${index + 1}`;
                questionNumber.appendChild(numberText);

                // Delete button for removing scanned item
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Xóa';
                deleteBtn.title = 'Xóa câu hỏi khỏi danh sách quét';
                deleteBtn.style.cssText = `
                    margin-left: 8px;
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                `;
                deleteBtn.onmouseover = () => deleteBtn.style.opacity = '0.9';
                deleteBtn.onmouseout = () => deleteBtn.style.opacity = '1';
                deleteBtn.onclick = () => {
                    try {
                        if (!confirm('Xóa câu hỏi này khỏi danh sách quét?')) return;
                        // Remove by index (from current merged order)
                        scannedQuestions.splice(index, 1);
                        // Update header/sub text
                        titleSub.textContent = `${scannedQuestions.length} câu hỏi chưa có trong database`;
                        // Re-render list so numbering reflects merged order
                        renderList();
                        // If no more items, remove popup
                        if (scannedQuestions.length === 0) {
                            popup.remove();
                            showNotification('Không còn câu hỏi trong danh sách quét', 'info', 2500);
                        }
                    } catch (e) {
                        console.error('Error deleting scanned item', e);
                    }
                };
                questionNumber.appendChild(deleteBtn);

                // Add merge badge if this question was merged from duplicates
                if (item.duplicateCount && item.duplicateCount > 1) {
                    const mergeBadge = document.createElement('span');
                    mergeBadge.style.cssText = `
                        background: #FF9800;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: bold;
                    `;
                    mergeBadge.textContent = `🔀 Hợp nhất ${item.duplicateCount} câu`;
                    questionNumber.appendChild(mergeBadge);
                }

                const questionText = document.createElement('div');
                questionText.style.cssText = `
                    font-size: 14px;
                    color: #333;
                    line-height: 1.6;
                    margin-bottom: 8px;
                    font-weight: 500;
                `;
                questionText.textContent = item.question;

                questionItem.appendChild(questionNumber);
                questionItem.appendChild(questionText);

                // Add answer if found
                if (item.answer) {
                    const answerLabel = document.createElement('div');
                    answerLabel.style.cssText = `
                        font-size: 12px;
                        color: #4CAF50;
                        font-weight: bold;
                        margin-top: 12px;
                        margin-bottom: 4px;
                    `;
                    answerLabel.textContent = '✓ Đáp án:';

                    const answerText = document.createElement('div');
                    answerText.style.cssText = `
                        font-size: 13px;
                        color: #2E7D32;
                        padding: 8px 12px;
                        background: #E8F5E9;
                        border-radius: 6px;
                        border-left: 3px solid #4CAF50;
                    `;
                    answerText.textContent = item.answer;

                    questionItem.appendChild(answerLabel);
                    questionItem.appendChild(answerText);
                } else {
                    const noAnswer = document.createElement('div');
                    noAnswer.style.cssText = `
                        font-size: 12px;
                        color: #FF9800;
                        font-style: italic;
                        margin-top: 8px;
                        padding: 6px 10px;
                        background: #FFF3E0;
                        border-radius: 6px;
                        border-left: 3px solid #FF9800;
                    `;
                    noAnswer.textContent = '⚠ Chưa quét được đáp án';
                    questionItem.appendChild(noAnswer);
                }

                listContainer.appendChild(questionItem);
            });
        }

        // Initial render
        renderList();

        // Footer with actions
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
            border-radius: 0 0 12px 12px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        `;

        const exportBtn = document.createElement('button');
        exportBtn.textContent = '📥 Xuất JSON';
        exportBtn.style.cssText = `
            padding: 10px 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        exportBtn.onmouseover = () => exportBtn.style.background = '#1976D2';
        exportBtn.onmouseout = () => exportBtn.style.background = '#2196F3';
        exportBtn.onclick = () => exportToJSON();

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy';
        copyBtn.style.cssText = `
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        copyBtn.onmouseover = () => copyBtn.style.background = '#45a049';
        copyBtn.onmouseout = () => copyBtn.style.background = '#4CAF50';
        copyBtn.onclick = () => copyToClipboard();

        footer.appendChild(exportBtn);
        footer.appendChild(copyBtn);

        // Assemble popup
        popup.appendChild(header);
        popup.appendChild(listContainer);
        popup.appendChild(footer);

        document.body.appendChild(popup);

        // Add slide in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        if (!document.getElementById('tailieu-scanner-styles')) {
            style.id = 'tailieu-scanner-styles';
            document.head.appendChild(style);
        }
    }

    // Export to JSON file
    // Export to JSON file
    function exportToJSON() {
        const data = scannedQuestions.map((item, index) => {
            const exported = {
                id: index + 1,
                question: item.question,
                answer: item.answer || null
            };
            
            // Add merge info if this question was merged
            if (item.duplicateCount && item.duplicateCount > 1) {
                exported.duplicateCount = item.duplicateCount;
                exported.mergedFrom = `${item.duplicateCount} câu hỏi giống nhau`;
            }
            
            // Add other answers if available
            if (item.answers && item.answers.length > 1) {
                exported.alternativeAnswers = item.answers.slice(1);
            }
            
            return exported;
        });

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tailieu-questions-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Đã xuất file JSON', 'success', 3000);
    }

    // Copy to clipboard
    function copyToClipboard() {
        let text = `📝 CÂU HỎI MỚI (${scannedQuestions.length})\n\n`;
        
        scannedQuestions.forEach((item, index) => {
            text += `${index + 1}. ${item.question}\n`;
            
            // Add merge info if available
            if (item.duplicateCount && item.duplicateCount > 1) {
                text += `   🔀 Hợp nhất ${item.duplicateCount} câu hỏi giống nhau\n`;
            }
            
            if (item.answer) {
                text += `   ✓ Đáp án: ${item.answer}\n`;
            } else {
                text += `   ⚠ Chưa có đáp án\n`;
            }
            
            // Add alternative answers if available
            if (item.answers && item.answers.length > 1) {
                text += `   📋 Các đáp án khác: ${item.answers.slice(1).join(', ')}\n`;
            }
            
            text += '\n';
        });

        navigator.clipboard.writeText(text).then(() => {
            showNotification('Đã copy vào clipboard', 'success', 3000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Lỗi copy clipboard', 'error', 3000);
        });
    }

    // Create floating scanner button
    function createScannerButton() {
        const button = document.createElement('button');
        button.id = 'tailieu-scanner-btn';
        button.innerHTML = '🔍';
        button.title = 'Quét câu hỏi mới';
        button.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            z-index: 10001;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        button.onmouseover = () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        };

        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        };

        button.onclick = scanQuestions;

        document.body.appendChild(button);
    }

    // Initialize scanner when page is ready
    function initScanner() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(createScannerButton, 1000);
            });
        } else {
            setTimeout(createScannerButton, 1000);
        }
    }

    // Start scanner
    initScanner();

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'scanQuestions') {
            scanQuestions();
            sendResponse({ success: true });
        }
    });

})();
