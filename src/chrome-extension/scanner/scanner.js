// Scanner Module - Quét câu hỏi và đáp án trên trang
// Tạo button kính lúp và popup hiển thị kết quả

(function() {
    'use strict';

    // Tránh load nhiều lần
    if (window.tailieuScannerLoaded) return;
    window.tailieuScannerLoaded = true;

    // ==================== SCANNER STATE ====================
    let scannedQuestions = [];
    let isScanning = false;
    let scannerButton = null;
    let scannerPopup = null;

    // ==================== SCANNER BUTTON ====================
    function createScannerButton() {
        if (scannerButton) return;

        scannerButton = document.createElement('div');
        scannerButton.id = 'tailieu-scanner-btn';
        scannerButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>
        `;
        scannerButton.title = 'Quét câu hỏi trên trang';

        // Styles cho button
        Object.assign(scannerButton.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #42A5F5, #1E88E5)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            zIndex: '10000',
            transition: 'all 0.3s ease',
            border: 'none',
            outline: 'none'
        });

        // Hover effect
        scannerButton.addEventListener('mouseenter', () => {
            scannerButton.style.transform = 'scale(1.1)';
            scannerButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });

        scannerButton.addEventListener('mouseleave', () => {
            if (!isScanning) {
                scannerButton.style.transform = 'scale(1)';
                scannerButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }
        });

        // Click handler
        scannerButton.addEventListener('click', handleScanClick);

        document.body.appendChild(scannerButton);
        console.log('[Tailieu Scanner] Button đã được tạo');
    }

    // ==================== SCAN HANDLER ====================
    async function handleScanClick() {
        if (isScanning) return;

        isScanning = true;
        updateButtonState('scanning');

        try {
            // Quét câu hỏi
            scannedQuestions = scanQuestionsFromPage();
            console.log('[Tailieu Scanner] Đã quét được', scannedQuestions.length, 'câu hỏi');

            // Hiển thị popup kết quả
            showScannerPopup(scannedQuestions);
        } catch (error) {
            console.error('[Tailieu Scanner] Lỗi khi quét:', error);
            showNotification('Lỗi khi quét câu hỏi: ' + error.message, 'error');
        } finally {
            isScanning = false;
            updateButtonState('normal');
        }
    }

    // ==================== UPDATE BUTTON STATE ====================
    function updateButtonState(state) {
        if (!scannerButton) return;

        if (state === 'scanning') {
            scannerButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="scanner-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
            `;
            scannerButton.style.background = 'linear-gradient(135deg, #42A5F5, #1E88E5)';
            scannerButton.style.animation = 'pulse 1s infinite';
        } else {
            scannerButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
            `;
            scannerButton.style.background = 'linear-gradient(135deg, #42A5F5, #1E88E5)';
            scannerButton.style.animation = 'none';
        }
    }

    // ==================== SCAN QUESTIONS FROM PAGE ====================
    function scanQuestionsFromPage() {
        const questions = [];
        const seenTexts = new Set();

        // ===== MOODLE STRUCTURE =====
        const moodleQuestions = document.querySelectorAll('.que');
        if (moodleQuestions.length > 0) {
            console.log('[Tailieu Scanner] Phát hiện cấu trúc Moodle:', moodleQuestions.length, 'câu hỏi');

            moodleQuestions.forEach((queContainer, index) => {
                if (isExtensionElement(queContainer)) return;

                const qtextElement = queContainer.querySelector('.qtext');
                if (!qtextElement) return;

                const questionText = qtextElement.textContent?.trim() || '';
                if (questionText.length < 5 || seenTexts.has(questionText)) return;
                seenTexts.add(questionText);

                // Tìm các đáp án
                const answers = extractAnswersFromContainer(queContainer);

                questions.push({
                    index: index + 1,
                    question: questionText,
                    answers: answers,
                    element: qtextElement,
                    type: 'moodle'
                });
            });

            if (questions.length > 0) return questions;
        }

        // ===== GENERIC QUESTION PATTERNS =====
        const questionSelectors = [
            '.question-text',
            '.question-content',
            '.question-item',
            '[class*="question"]',
            '.qtext',
            'p',
            'div',
            'li'
        ];

        const elements = document.querySelectorAll(questionSelectors.join(', '));

        elements.forEach((element, idx) => {
            if (isExtensionElement(element)) return;

            const text = element.textContent?.trim() || '';
            if (text.length < 10 || text.length > 1000 || seenTexts.has(text)) return;

            // Kiểm tra có phải câu hỏi không
            if (!isQuestionLike(text)) return;

            seenTexts.add(text);

            // Tìm các đáp án gần đó
            const answers = findNearbyAnswers(element);

            questions.push({
                index: questions.length + 1,
                question: cleanQuestionText(text),
                answers: answers,
                element: element,
                type: 'generic'
            });
        });

        return questions;
    }

    // ==================== HELPER FUNCTIONS ====================

    function isExtensionElement(element) {
        if (!element) return true;
        const id = element.id || '';
        const className = element.className || '';
        return id.includes('tailieu') || className.includes('tailieu');
    }

    function isQuestionLike(text) {
        // Có prefix câu hỏi
        if (/^(Câu|Bài|Question)\s*\d+/i.test(text)) return true;
        // Có dấu hỏi
        if (text.includes('?') || text.includes('？')) return true;
        // Dạng điền từ
        if (/([_.‥…]{2,}|\.{2,}|…{1,}|___{1,})/.test(text)) return true;
        // Từ khóa câu hỏi
        const questionWords = ['là gì', 'là ai', 'như thế nào', 'thế nào', 'tại sao', 'vì sao', 'khi nào', 'ở đâu', 'bao nhiêu'];
        if (questionWords.some(word => text.toLowerCase().includes(word))) return true;
        // Loại trừ
        if (/^[A-D][\.\)]\s*$/.test(text)) return false;
        if (/^\d+\s*[:\.\)]*\s*$/.test(text)) return false;

        return false;
    }

    function cleanQuestionText(text) {
        // Loại bỏ prefix
        return text.replace(/^(Câu\s*\d+[:\.\)\s]*|Bài\s*\d+[:\.\)\s]*|Question\s*\d+[:\.\)\s]*|\d+[\.\)]\s*)/i, '').trim();
    }

    // Normalize and extract visible text from an element
    function normalizeText(text) {
        if (!text) return '';
        // Collapse whitespace and trim punctuation/bullets around
        return text.replace(/\s+/g, ' ').replace(/^[\s\u2022\-\.|•]+|[\s\u2022\-\.|•]+$/g, '').trim();
    }

    function getElementVisibleText(el) {
        if (!el) return '';
        // Clone to avoid modifying original DOM and remove irrelevant nodes
        try {
            const clone = el.cloneNode(true);
            // remove inputs, svgs, icons, and numbering helper nodes
            clone.querySelectorAll('input, svg, button, img, .answernumber, .bullet, .icon').forEach(n => n.remove());
            return normalizeText(clone.textContent || '');
        } catch (e) {
            return normalizeText(el.textContent || '');
        }
    }

    function extractAnswersFromContainer(container) {
        const answers = [];
        const seen = new Set();

        // Prefer dedicated answer containers but fall back to container itself
        const answerContainer = container.querySelector('.answer, .answers, .options, .choices') || container;

        // Select immediate child answer-like elements to avoid nested duplicates
        const answerElements = answerContainer.querySelectorAll(':scope > .r0, :scope > .r1, :scope > label, :scope > li, :scope > [class*="answer"], :scope > [class*="option"], :scope > div');

        answerElements.forEach(el => {
            if (!el || isExtensionElement(el)) return;

            const text = getElementVisibleText(el);
            if (!text || text.length > 500) return;

            // Detect label inside (e.g., A., B.)
            const explicitLabelEl = el.querySelector('.answernumber');
            let label = '';
            let answerText = text;

            if (explicitLabelEl) {
                label = normalizeText(explicitLabelEl.textContent || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                answerText = text.replace(explicitLabelEl.textContent || '', '').trim();
            } else {
                const labelMatch = text.match(/^([A-Da-d])[\.\):\s]+/);
                if (labelMatch) {
                    label = labelMatch[1].toUpperCase();
                    answerText = text.replace(/^([A-Da-d])[\.\):\s]+/, '').trim();
                }
            }

            answerText = normalizeText(answerText);
            if (!answerText) return;

            // dedupe
            if (seen.has(answerText)) return;
            seen.add(answerText);

            const input = el.querySelector('input[type="radio"], input[type="checkbox"]');
            const isSelected = !!(input?.checked || el.classList.contains('checked') || el.querySelector('input:checked'));
            const isCorrect = el.classList.contains('correct') || !!el.querySelector('.correct') || !!el.closest('.correct');

            answers.push({
                label: label || '',
                text: answerText,
                fullText: text,
                isSelected: isSelected,
                isCorrect: isCorrect
            });
        });

        // Fallback: search inputs if none found or too few
        if (answers.length === 0) {
            const inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            const seenFallback = new Set();
            inputs.forEach((input, idx) => {
                if (!input) return;
                const labelEl = input.closest('label') || container.querySelector(`label[for="${input.id}"]`);
                const text = normalizeText(labelEl?.textContent || input.nextSibling?.textContent || input.value || '');
                if (!text || seenFallback.has(text)) return;
                seenFallback.add(text);
                answers.push({
                    label: String.fromCharCode(65 + idx),
                    text: text,
                    fullText: text,
                    isSelected: !!input.checked,
                    isCorrect: false
                });
            });
        }

        return answers;
    }

    function findNearbyAnswers(questionElement) {
        const answers = [];
        const seen = new Set();

        // Find the nearest sensible container (list, answer block, or parent)
        const container = questionElement.closest('li, ul, ol, .answer, .answers, .options, .question') || questionElement.parentElement;
        if (!container) return answers;

        // Look for immediate children only to avoid duplicated nested nodes
        const candidates = container.querySelectorAll(':scope > li, :scope > label, :scope > [class*="answer"], :scope > [class*="option"], :scope > div');

        candidates.forEach((el, idx) => {
            if (!el || el === questionElement || isExtensionElement(el)) return;
            const text = getElementVisibleText(el);
            if (!text || text.length > 500) return;

            // Accept patterns like 'A. text' or other visible answer lines
            const labelMatch = text.match(/^([A-Da-d])[\.\):\s]+/);
            let label = '';
            let answerText = text;
            if (labelMatch) {
                label = labelMatch[1].toUpperCase();
                answerText = text.replace(/^([A-Da-d])[\.\):\s]+/, '').trim();
            }

            answerText = normalizeText(answerText);
            if (!answerText) return;
            if (seen.has(answerText)) return;
            seen.add(answerText);

            answers.push({
                label: label || String.fromCharCode(65 + idx),
                text: answerText,
                fullText: text,
                isSelected: false,
                isCorrect: false
            });
        });

        return answers;
    }

    // ==================== SCANNER POPUP ====================
    function showScannerPopup(questions) {
        // Đóng popup cũ nếu có
        closeScannerPopup();

        // Tạo overlay
        const overlay = document.createElement('div');
        overlay.id = 'tailieu-scanner-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: '10001',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        // Tạo popup
        scannerPopup = document.createElement('div');
        scannerPopup.id = 'tailieu-scanner-popup';
        
        const questionsHTML = questions.length > 0 
            ? questions.map(q => createQuestionItemHTML(q)).join('')
            : '<div class="scanner-empty">Không tìm thấy câu hỏi nào trên trang này.</div>';

        scannerPopup.innerHTML = `
            <div class="scanner-popup-header">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    Kết quả quét
                </h2>
                <span class="scanner-count">${questions.length} câu hỏi</span>
                <button class="scanner-close-btn" title="Đóng">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="scanner-popup-body">
                <div class="scanner-questions-list">
                    ${questionsHTML}
                </div>
            </div>
            <div class="scanner-popup-footer">
                <button class="scanner-btn scanner-btn-secondary" id="scanner-copy-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                    </svg>
                    Copy tất cả
                </button>
                <button class="scanner-btn scanner-btn-primary" id="scanner-highlight-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m9 11-6 6v3h9l3-3"></path>
                        <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
                    </svg>
                    Highlight trên trang
                </button>
            </div>
        `;

        // Styles cho popup
        Object.assign(scannerPopup.style, {
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            transform: 'scale(0.9)',
            opacity: '0',
            transition: 'all 0.3s ease'
        });

        overlay.appendChild(scannerPopup);
        document.body.appendChild(overlay);

        // Inject styles
        injectScannerStyles();

        // Animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            scannerPopup.style.transform = 'scale(1)';
            scannerPopup.style.opacity = '1';
        });

        // Event listeners
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeScannerPopup();
        });

        scannerPopup.querySelector('.scanner-close-btn').addEventListener('click', closeScannerPopup);
        
        scannerPopup.querySelector('#scanner-copy-all').addEventListener('click', () => {
            copyAllQuestions(questions);
        });

        scannerPopup.querySelector('#scanner-highlight-all').addEventListener('click', () => {
            highlightAllQuestions(questions);
            closeScannerPopup();
        });

        // Click vào câu hỏi để scroll đến
        scannerPopup.querySelectorAll('.scanner-question-item').forEach((item, idx) => {
            item.addEventListener('click', () => {
                const question = questions[idx];
                if (question && question.element) {
                    closeScannerPopup();
                    question.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    highlightElement(question.element);
                }
            });
        });
    }

    function createQuestionItemHTML(q) {
        const answersHTML = q.answers.length > 0 
            ? `<div class="scanner-answers">
                ${q.answers.map(a => `
                    <div class="scanner-answer ${a.isSelected ? 'selected' : ''} ${a.isCorrect ? 'correct' : ''}">
                        <span class="answer-label">${a.label || '•'}</span>
                        <span class="answer-text">${escapeHTML(a.text)}</span>
                    </div>
                `).join('')}
               </div>`
            : '';

        return `
            <div class="scanner-question-item" data-index="${q.index}">
                <div class="scanner-question-header">
                    <span class="question-number">Câu ${q.index}</span>
                    <span class="question-type">${q.type}</span>
                </div>
                <div class="scanner-question-text">${escapeHTML(q.question)}</div>
                ${answersHTML}
            </div>
        `;
    }

    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function closeScannerPopup() {
        const overlay = document.getElementById('tailieu-scanner-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            if (scannerPopup) {
                scannerPopup.style.transform = 'scale(0.9)';
                scannerPopup.style.opacity = '0';
            }
            setTimeout(() => overlay.remove(), 300);
        }
        scannerPopup = null;
    }

    function copyAllQuestions(questions) {
        const text = questions.map(q => {
            let str = `Câu ${q.index}: ${q.question}`;
            if (q.answers.length > 0) {
                str += '\n' + q.answers.map(a => `  ${a.label || '•'}. ${a.text}`).join('\n');
            }
            return str;
        }).join('\n\n');

        navigator.clipboard.writeText(text).then(() => {
            showNotification('Đã copy ' + questions.length + ' câu hỏi!', 'success');
        }).catch(err => {
            showNotification('Không thể copy: ' + err.message, 'error');
        });
    }

    function highlightAllQuestions(questions) {
        questions.forEach(q => {
            if (q.element) {
                highlightElement(q.element);
            }
        });
        showNotification('Đã highlight ' + questions.length + ' câu hỏi trên trang!', 'success');
    }

    function highlightElement(element) {
        element.style.transition = 'all 0.3s ease';
        element.style.backgroundColor = '#fff3cd';
        element.style.boxShadow = '0 0 0 3px #ffc107';
        element.style.borderRadius = '4px';
        
        setTimeout(() => {
            element.style.backgroundColor = '';
            element.style.boxShadow = '';
        }, 3000);
    }

    // ==================== NOTIFICATION ====================
    function showNotification(message, type = 'info') {
        const existing = document.getElementById('tailieu-scanner-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'tailieu-scanner-notification';
        
        const colors = {
            success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
            error: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
            info: { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' }
        };
        const color = colors[type] || colors.info;

        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '90px',
            left: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            background: color.bg,
            border: `2px solid ${color.border}`,
            color: color.text,
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10002',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(-100%)',
            opacity: '0',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        setTimeout(() => {
            notification.style.transform = 'translateX(-100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ==================== INJECT STYLES ====================
    function injectScannerStyles() {
        if (document.getElementById('tailieu-scanner-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'tailieu-scanner-styles';
        styles.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes scanner-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            #tailieu-scanner-btn .scanner-spin {
                animation: scanner-spin 1s linear infinite;
            }

            .scanner-popup-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px 24px;
                border-bottom: 1px solid #e9ecef;
                background: linear-gradient(135deg, #42A5F5, #1E88E5);
                border-radius: 16px 16px 0 0;
                color: white;
            }

            .scanner-popup-header h2 {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                flex: 1;
            }

            .scanner-count {
                background: rgba(255,255,255,0.2);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 13px;
            }

            .scanner-close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: white;
                transition: all 0.2s;
            }

            .scanner-close-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: rotate(90deg);
            }

            .scanner-popup-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                max-height: 50vh;
            }

            .scanner-questions-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .scanner-question-item {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid transparent;
            }

            .scanner-question-item:hover {
                background: #e9ecef;
                border-color: #667eea;
                transform: translateX(4px);
            }

            .scanner-question-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .question-number {
                font-weight: 600;
                color: #667eea;
                font-size: 13px;
            }

            .question-type {
                font-size: 11px;
                padding: 2px 8px;
                background: #e9ecef;
                border-radius: 10px;
                color: #6c757d;
                text-transform: uppercase;
            }

            .scanner-question-text {
                font-size: 14px;
                line-height: 1.5;
                color: #212529;
                margin-bottom: 12px;
            }

            .scanner-answers {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding-left: 12px;
                border-left: 3px solid #dee2e6;
            }

            .scanner-answer {
                display: flex;
                gap: 8px;
                font-size: 13px;
                padding: 6px 10px;
                border-radius: 6px;
                background: white;
            }

            .scanner-answer.selected {
                background: #e3f2fd;
                border: 1px solid #2196f3;
            }

            .scanner-answer.correct {
                background: #e8f5e9;
                border: 1px solid #4caf50;
            }

            .answer-label {
                font-weight: 600;
                color: #667eea;
                min-width: 20px;
            }

            .answer-text {
                color: #495057;
            }

            .scanner-empty {
                text-align: center;
                padding: 40px;
                color: #6c757d;
                font-size: 15px;
            }

            .scanner-popup-footer {
                display: flex;
                gap: 12px;
                padding: 16px 24px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
                border-radius: 0 0 16px 16px;
            }

            .scanner-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
                flex: 1;
                justify-content: center;
            }

            .scanner-btn-primary {
                background: linear-gradient(135deg, #42A5F5, #1E88E5);
                color: white;
            }

            .scanner-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .scanner-btn-secondary {
                background: white;
                color: #495057;
                border: 2px solid #dee2e6;
            }

            .scanner-btn-secondary:hover {
                border-color: #667eea;
                color: #667eea;
            }
        `;

        document.head.appendChild(styles);
    }

    // ==================== INITIALIZE ====================
    function init() {
        // Đợi DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createScannerButton);
        } else {
            createScannerButton();
        }
    }

    // Start
    init();

    // Export để có thể sử dụng từ bên ngoài
    window.tailieuScanner = {
        scan: () => handleScanClick(),
        getScannedQuestions: () => scannedQuestions,
        showPopup: () => showScannerPopup(scannedQuestions)
    };

    console.log('[Tailieu Scanner] Module đã được khởi tạo');
})();
