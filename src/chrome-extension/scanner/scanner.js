// Scanner Module - Quét câu hỏi và đáp án trên trang
// Tạo button kính lúp và popup hiển thị kết quả

(function () {
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

        // KIỂM TRA HIGHLIGHT CỦA "SO SÁNH NGAY"
        // Nếu đã có highlight, thực hiện reload trang trước khi quét để tránh nhiễu
        const highlightSelectors = [
            '.tailieu-answer-highlight',
            '.tailieu-highlighted-question',
            '.tailieu-text-highlight',
            '.tailieu-fillblank-highlighted',
            '.tailieu-blank-marker',
            '.tailieu-multiple-answers-warning'
        ];
        const hasHighlights = document.querySelector(highlightSelectors.join(','));

        if (hasHighlights) {
            console.log('[Tailieu Scanner] Đã phát hiện highlight từ chức năng "So sánh ngay". Đang reload trang...');
            try {
                sessionStorage.setItem('tailieu_auto_scan_trigger', 'true');
                window.location.reload();
                return;
            } catch (e) {
                console.error('[Tailieu Scanner] Lỗi khi lưu state và reload:', e);
            }
        }

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
        // Use signatures (question text + answers) to dedupe so
        // identical question text with different answer sets are kept
        // as separate items.
        const seenSignatures = new Set();

        // ===== FILL-BLANK WITH INPUT FIELDS (e.g., "Br" + [a][z][i][l] = Brazil) =====
        // Xử lý dạng câu hỏi điền từ với chữ cái + input liên tiếp
        const fillBlankQuestions = scanFillBlankWithInputs();
        if (fillBlankQuestions.length > 0) {
            fillBlankQuestions.forEach((fbq, idx) => {
                const signature = cleanQuestionText(fbq.question) + '||' + fbq.answers.map(a => normalizeText(a.text)).join('||');
                if (seenSignatures.has(signature)) return;
                seenSignatures.add(signature);

                questions.push({
                    index: questions.length + 1,
                    question: fbq.question,
                    answers: fbq.answers,
                    element: fbq.element,
                    type: 'điền từ'
                });
            });
            console.log('[Scanner] Tìm thấy', fillBlankQuestions.length, 'câu điền từ');
        }

        // ===== MOODLE STRUCTURE =====
        const moodleQuestions = document.querySelectorAll('.que');
        if (moodleQuestions.length > 0) {
            moodleQuestions.forEach((queContainer, index) => {
                if (isExtensionElement(queContainer)) return;

                const qtextElement = queContainer.querySelector('.qtext');
                if (!qtextElement) return;

                // Use visible text extraction to avoid script/audio fragments
                const questionText = getElementVisibleText(qtextElement) || qtextElement.textContent?.trim() || '';
                if (questionText.length < 5) return;

                // Tìm các đáp án (do dedupe phải bao gồm đáp án)
                const answers = extractAnswersFromContainer(queContainer);
                if (!answers || answers.length === 0) return;

                // Chỉ thêm câu hỏi nếu có ít nhất 1 đáp án được tích
                const hasTickedAnswer = answers.some(a => a.isTicked || a.isSelected || a.isCorrect);
                if (!hasTickedAnswer) return;

                // Build signature using question text + normalized answer texts
                const signature = cleanQuestionText(questionText, qtextElement) + '||' + answers.map(a => normalizeText(a.text)).join('||');
                if (seenSignatures.has(signature)) return;
                seenSignatures.add(signature);

                questions.push({
                    index: questions.length + 1,
                    question: cleanQuestionText(questionText, qtextElement),
                    answers: answers,
                    element: qtextElement,
                    type: 'câu hỏi'
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

            const text = getElementVisibleText(element) || element.textContent?.trim() || '';
            if (text.length < 10 || text.length > 1000) return;

            // Kiểm tra có phải câu hỏi không
            if (!isQuestionLike(text)) return;

            // Tìm các đáp án gần đó
            const answers = findNearbyAnswers(element);
            if (!answers || answers.length === 0) return;

            // Chỉ thêm câu hỏi nếu có ít nhất 1 đáp án được tích
            const hasTickedAnswer = answers.some(a => a.isTicked || a.isSelected || a.isCorrect);
            if (!hasTickedAnswer) return;

            // Build signature and dedupe by full signature
            const signature = cleanQuestionText(text, element) + '||' + answers.map(a => normalizeText(a.text)).join('||');
            if (seenSignatures.has(signature)) return;
            seenSignatures.add(signature);

            questions.push({
                index: questions.length + 1,
                question: cleanQuestionText(text, element),
                answers: answers,
                element: element,
                type: 'generic'
            });
        });

        return questions;
    }

    // ==================== FILL-BLANK WITH INPUTS SCANNER ====================
    /**
     * Quét các câu hỏi điền từ dạng: chữ cái + input fields liên tiếp
     * Ví dụ: "Br" + [a][z][i][l] = "Brazil"
     * - Question: "Br...." (thay input bằng "...")
     * - Answer: các ký tự trong input đúng (correct/green)
     */
    function scanFillBlankWithInputs() {
        const results = [];

        // Tìm các container Moodle có câu hỏi điền từ
        const queContainers = document.querySelectorAll('.que');

        queContainers.forEach((queContainer) => {
            if (isExtensionElement(queContainer)) return;

            // Lấy instruction/header của câu hỏi
            const qtext = queContainer.querySelector('.qtext');
            const instructionText = getElementVisibleText(qtext) || qtext?.textContent?.trim() || '';

            // Kiểm tra có input fields trong container không (bất kể instruction)
            const hasInputs = queContainer.querySelectorAll('input[type="text"], input:not([type]), select').length > 0;

            // Kiểm tra có phải dạng fill-blank không (qua instruction HOẶC có inputs)
            const isFillBlank = isFillBlankInstruction(instructionText) || hasInputs;
            if (!isFillBlank) return;

            console.log('[Scanner FillBlank] Processing container:', instructionText.substring(0, 60), '| hasInputs:', hasInputs);

            // Tìm các sub-questions (dạng a. Italy, b. Brazil, etc.)
            const subQuestions = extractFillBlankSubQuestions(queContainer);

            if (subQuestions.length > 0) {
                console.log('[Scanner FillBlank] Tìm thấy', subQuestions.length, 'sub-questions trong:', instructionText.substring(0, 50));

                subQuestions.forEach((sq, idx) => {
                    // Chỉ thêm nếu có đáp án đúng (correct inputs)
                    if (sq.correctAnswer && sq.correctAnswer.length > 0) {
                        results.push({
                            question: sq.questionText,
                            answers: [{
                                label: sq.label || String.fromCharCode(65 + idx),
                                text: sq.correctAnswer,
                                fullText: sq.correctAnswer,
                                isSelected: true,
                                isCorrect: true,
                                isTicked: true
                            }],
                            element: sq.element,
                            instruction: instructionText
                        });
                    }
                });
            }
        });

        return results;
    }

    /**
     * Kiểm tra xem instruction có phải dạng fill-blank không
     */
    function isFillBlankInstruction(text) {
        if (!text) return false;
        const patterns = [
            /write\s+(the\s+)?missing/i,
            /fill\s+(in\s+)?(the\s+)?(blank|gap|missing)/i,
            /complete\s+(these|the|this)/i,
            /điền\s+(từ|vào)/i,
            /hoàn\s+(thành|thiện)/i,
            /missing\s+(vowels?|letters?|words?)/i,
            /match\s+(these|the|this)/i,
            /appropriate\s+form/i,
            /verb\s+to\s+be/i,
            /in\s+these\s+(countries|sentences|words)/i,
            /to\s+the\s+(countries|words)/i
        ];
        return patterns.some(p => p.test(text));
    }

    /**
     * Trích xuất các sub-questions từ container fill-blank
     * Mỗi sub-question có dạng: label + text + inputs
     */
    function extractFillBlankSubQuestions(container) {
        const subQuestions = [];
        const processedTexts = new Set();

        // Tìm các dòng/row chứa label (a., b., c.) hoặc subquestion containers
        // Moodle thường dùng các class như: .subquestion, .answer, table rows, etc.

        // Method 1: Tìm theo structure .ablock .answer hoặc table rows
        const answerBlocks = container.querySelectorAll('.ablock .answer, .answer table tr, .formulation table tr, .subquestion, table.answer tr');

        console.log('[Scanner FillBlank] Method 1 - Found', answerBlocks.length, 'answer blocks');

        if (answerBlocks.length > 0) {
            answerBlocks.forEach((block) => {
                const result = extractSingleFillBlankRow(block);
                if (result && !processedTexts.has(result.questionText)) {
                    processedTexts.add(result.questionText);
                    subQuestions.push(result);
                }
            });
        }

        // Method 2: Tìm các table rows có chứa input + text (dạng matching)
        if (subQuestions.length === 0) {
            const tableRows = container.querySelectorAll('table tr, .matching-question tr');
            console.log('[Scanner FillBlank] Method 2 - Found', tableRows.length, 'table rows');

            tableRows.forEach((row) => {
                const inputs = row.querySelectorAll('input[type="text"], input:not([type]), select');
                if (inputs.length === 0) return;

                const result = extractSingleFillBlankRow(row);
                if (result && !processedTexts.has(result.questionText)) {
                    processedTexts.add(result.questionText);
                    subQuestions.push(result);
                }
            });
        }

        // Method 3: Quét các elements có input trực tiếp
        if (subQuestions.length === 0) {
            // Tìm tất cả inputs và lấy parent có nghĩa
            const allInputs = container.querySelectorAll('input[type="text"], input:not([type]), select');
            console.log('[Scanner FillBlank] Method 3 - Found', allInputs.length, 'inputs');

            allInputs.forEach((input) => {
                // Tìm parent row/container gần nhất
                // Tìm parent row/container gần nhất
                // Ưu tiên block element (P, DIV, LI) trước để lấy context đầy đủ
                let parentRow = input.closest('tr, p, div.answer, div.formulation, li');

                // Nếu không tìm thấy block, mới lấy span/label
                if (!parentRow) {
                    parentRow = input.closest('label, span');
                }

                // CLIMB UP CHECK:
                // Nếu parent tìm được quá nhỏ (vd: <span><input></span>) thì sẽ thiếu context (vd: dấu chấm câu bên ngoài)
                // Cần leo lên để lấy parent rộng hơn chứa cả text xung quanh
                let climbCount = 0;
                while (parentRow && climbCount < 3) {
                    // Check text length (excluding whitespace)
                    const textLen = parentRow.textContent.trim().length;

                    // Nếu text quá ngắn (< 5 chars) hoặc tag là SPAN/LABEL/B/STRONG
                    // Leo lên 1 cấp (trừ khi parent tiếp theo là container quá lớn)
                    const isInline = /^(SPAN|LABEL|B|STRONG|I|EM)$/.test(parentRow.tagName);

                    if (textLen < 10 || isInline) {
                        const nextParent = parentRow.parentElement;
                        if (!nextParent || isExtensionElement(nextParent) || nextParent.classList.contains('que')) break;

                        // Stop if next parent determines broad scope (e.g. many inputs - likely the main container)
                        // But allow up to ~8 inputs (some questions have multiple blanks)
                        if (nextParent.querySelectorAll('input').length > 8) break;

                        parentRow = nextParent;
                        climbCount++;
                    } else {
                        break;
                    }
                }

                if (!parentRow || isExtensionElement(parentRow)) return;

                // Skip nếu parent quá lớn (là container chính)
                if (parentRow.querySelectorAll('input').length > 10) {
                    // Revert to direct parent if we climbed too high
                    parentRow = input.parentElement;
                }

                const result = extractSingleFillBlankRow(parentRow);
                if (result && !processedTexts.has(result.questionText)) {
                    processedTexts.add(result.questionText);
                    subQuestions.push(result);
                }
            });
        }

        // Method 4: Fallback - quét toàn bộ container tìm pattern label + inputs
        if (subQuestions.length === 0) {
            const allElements = container.querySelectorAll('p, div, span, td, li, label');
            console.log('[Scanner FillBlank] Method 4 - Scanning', allElements.length, 'elements');

            allElements.forEach((el) => {
                if (isExtensionElement(el)) return;

                // Kiểm tra có chứa input không
                const inputs = el.querySelectorAll('input[type="text"], input:not([type]), select');
                if (inputs.length === 0) return;

                // Kiểm tra có text đi kèm (không chỉ có input)
                const textLen = el.textContent?.trim().length || 0;
                if (textLen <= inputs.length * 2) return;

                const result = extractSingleFillBlankRow(el);
                if (result && !processedTexts.has(result.questionText)) {
                    processedTexts.add(result.questionText);
                    subQuestions.push(result);
                }
            });
        }

        console.log('[Scanner FillBlank] Total sub-questions found:', subQuestions.length);
        return subQuestions;
    }

    /**
     * Trích xuất thông tin từ một row/element chứa fill-blank
     * @returns {{ label: string, questionText: string, correctAnswer: string, element: Element }}
     */
    function extractSingleFillBlankRow(element) {
        if (!element) return null;

        // Tìm tất cả inputs VÀ selects trong element GỐC (không phải clone)
        const inputs = element.querySelectorAll('input[type="text"], input:not([type]), select');
        if (inputs.length === 0) return null;

        // Lấy label nếu có (a., b., c., 1., 2., etc.)
        let label = '';
        const rawText = element.textContent || '';
        const labelMatch = rawText.match(/^[\s]*([a-z]|[0-9]+)[\.\)]/i);
        if (labelMatch) {
            label = labelMatch[1].toUpperCase();
        }

        // Trích xuất correct answer từ các input có giá trị đúng
        const correctAnswers = [];

        inputs.forEach((input, idx) => {
            let value = '';

            // Handle SELECT elements
            if (input.tagName === 'SELECT') {
                const selectedOption = input.options[input.selectedIndex];
                value = selectedOption?.text?.trim() || selectedOption?.value?.trim() || '';
            } else {
                value = input.value?.trim() || '';
            }

            if (!value) return;

            // Kiểm tra input này có đúng không
            const isCorrect = isInputCorrect(input);

            console.log('[Scanner FillBlank] Input #' + idx + ':', value, '| isCorrect:', isCorrect);

            if (isCorrect && value) {
                correctAnswers.push({
                    index: idx + 1,
                    value: value
                });
            }
        });

        // Nếu không có correct inputs, skip
        if (correctAnswers.length === 0) {
            console.log('[Scanner FillBlank] No correct answers found in row');
            return null;
        }

        // Format answer:
        // - Nếu chỉ có 1 input: chỉ lấy giá trị (ví dụ: "I")
        // - Nếu nhiều input: format "1.a, 2.i"
        let correctAnswer = '';
        if (correctAnswers.length === 1) {
            correctAnswer = correctAnswers[0].value;
        } else {
            correctAnswer = correctAnswers.map(a => `${a.index}.${a.value}`).join(', ');
        }

        // ===== TẠO QUESTION TEXT BẰNG CÁCH XÂY DỰNG TỪ DOM =====
        // Duyệt qua element và thay thế input bằng "..." trong text
        const questionText = buildQuestionTextWithBlanks(element);

        // Validate: question should have at least some text besides "..."
        // FIX: Allow punctuation-only text (like "?", ".", etc) to ensure we don't drop questions like "[Input]?"
        const textWithoutDots = questionText.replace(/\.{3,}/g, '').trim();
        // Relaxed check: accept if there's any content left (even 1 char) OR if original had multiple parts
        if (textWithoutDots.length === 0 && questionText.length < 5) return null;

        console.log('[Scanner FillBlank] Extracted:', label, '|', questionText, '| Answer:', correctAnswer);

        return {
            label: label,
            questionText: questionText,
            correctAnswer: correctAnswer,
            element: element
        };
    }

    /**
     * Xây dựng question text bằng cách thay thế input/select bằng "..."
     * Duyệt qua DOM tree và build text
     */
    function buildQuestionTextWithBlanks(element) {
        if (!element) return '';

        let result = '';

        // Hàm đệ quy duyệt qua các node
        function traverse(node) {
            if (!node) return;

            // Text node - lấy text
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent || '';
                return;
            }

            // Element node
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName?.toUpperCase() || '';

                // Skip các element không cần thiết
                if (/^(SCRIPT|STYLE|SVG|IMG)$/.test(tagName)) return;

                // Skip feedback elements
                const className = node.className || '';
                if (/feedback|feedbackspan/i.test(className)) return;

                // INPUT hoặc SELECT -> thay bằng "..."
                if (tagName === 'INPUT' || tagName === 'SELECT') {
                    result += ' ... ';
                    return;
                }

                // Duyệt qua children
                const children = node.childNodes;
                for (let i = 0; i < children.length; i++) {
                    traverse(children[i]);
                }
            }
        }

        traverse(element);

        // Clean up result
        result = result
            .replace(/[✓✗×✕✔❌]/g, '')  // Remove check/cross marks
            .replace(/\s+/g, ' ')         // Collapse whitespace
            .replace(/^\s*[a-z0-9][\.\)]\s*/i, '')  // Remove label prefix like "a." or "1."
            .trim();

        // ===== XỬ LÝ DẠNG "TEXT + Ô TRỐNG" (trailing blank) =====
        // Nếu "..." chỉ xuất hiện ở cuối (dạng: "German ..." hoặc "German..."), 
        // thì bỏ "..." đi vì đây là dạng text + ô trống đơn giản
        // Chỉ giữ "..." khi nó nằm XEN KẼ trong text (như "Br...z...l")

        // Đếm số lần xuất hiện của "..."
        const dotsMatches = result.match(/\.{3}/g);
        const dotsCount = dotsMatches ? dotsMatches.length : 0;

        // Nếu chỉ có 1 "..." và nó ở cuối -> bỏ đi
        if (dotsCount === 1 && result.endsWith('...')) {
            result = result.slice(0, -3).trim();
        }
        // Nếu có nhiều "..." nhưng tất cả đều ở cuối (dạng: "German ... ... ...") -> bỏ hết
        else if (dotsCount > 0) {
            // Check if all "..." are trailing (no text after last "...")
            const lastDotsIndex = result.lastIndexOf('...');
            const textAfterDots = result.slice(lastDotsIndex + 3).trim();

            // Nếu không có text sau "..." cuối cùng, kiểm tra xem có text xen kẽ không
            if (textAfterDots.length === 0) {
                // Tìm vị trí "..." đầu tiên
                const firstDotsIndex = result.indexOf('...');
                const textBeforeDots = result.slice(0, firstDotsIndex).trim();
                const textBetween = result.slice(firstDotsIndex).replace(/\.{3}/g, '').trim();

                // Nếu không có text xen kẽ giữa các "...", chỉ có text trước -> bỏ tất cả "..."
                if (textBetween.length === 0 && textBeforeDots.length > 0) {
                    result = textBeforeDots;
                }
            }
        }

        return result;
    }

    /**
     * Kiểm tra một input có phải là correct (đúng) không
     * Dựa vào class, parent class, màu nền, icons gần đó
     */
    function isInputCorrect(input) {
        if (!input) return false;

        try {
            // Check 1: Input hoặc parent có class correct
            const inputClass = input.className || '';
            if (/\b(correct|right|ok)\b/i.test(inputClass)) {
                console.log('[Scanner isInputCorrect] CORRECT via input class');
                return true;
            }

            // Check for incorrect in input class first
            if (/\b(incorrect|wrong)\b/i.test(inputClass)) {
                console.log('[Scanner isInputCorrect] INCORRECT via input class');
                return false;
            }

            // Check 2: Parent elements có class correct/incorrect
            let parent = input.parentElement;
            let depth = 0;
            while (parent && depth < 5) {
                const parentClass = parent.className || '';

                // Check for incorrect first (more specific)
                if (/\b(incorrect|wrong)\b/i.test(parentClass)) {
                    console.log('[Scanner isInputCorrect] INCORRECT via parent class:', parentClass);
                    return false;
                }

                if (/\b(correct)\b/i.test(parentClass)) {
                    console.log('[Scanner isInputCorrect] CORRECT via parent class:', parentClass);
                    return true;
                }

                parent = parent.parentElement;
                depth++;
            }

            // Check 3: Sibling hoặc adjacent có icon ✓ hoặc ✗
            const parentEl = input.parentElement;
            if (parentEl) {
                // Check all children and siblings
                const checkElements = [...(parentEl.children || []), ...(parentEl.parentElement?.children || [])];

                for (const el of checkElements) {
                    if (el === input) continue;
                    const elText = el.textContent || '';
                    const elClass = el.className || '';

                    // Có dấu X -> incorrect (check này TRƯỚC)
                    if (/[✗×❌]/.test(elText) && !/[✓✔✅]/.test(elText)) {
                        console.log('[Scanner isInputCorrect] INCORRECT via sibling X mark');
                        return false;
                    }
                    if (/\b(incorrect|wrong|error)\b/i.test(elClass)) {
                        console.log('[Scanner isInputCorrect] INCORRECT via sibling class');
                        return false;
                    }

                    // Có dấu tick
                    if (/[✓✔✅]/.test(elText)) {
                        console.log('[Scanner isInputCorrect] CORRECT via sibling check mark');
                        return true;
                    }
                    if (/\b(correct|check|tick|ok)\b/i.test(elClass)) {
                        console.log('[Scanner isInputCorrect] CORRECT via sibling class');
                        return true;
                    }
                }
            }

            // Check 4: Computed style - background color
            const style = window.getComputedStyle(input);
            const bgColor = style.backgroundColor || '';

            if (/rgb\((\d+),\s*(\d+),\s*(\d+)\)/.test(bgColor)) {
                const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (match) {
                    const r = parseInt(match[1]);
                    const g = parseInt(match[2]);
                    const b = parseInt(match[3]);

                    // Red/pink (incorrect): r > g && r > 180
                    if (r > g + 50 && r > 180) {
                        console.log('[Scanner isInputCorrect] INCORRECT via red background:', bgColor);
                        return false;
                    }

                    // Green: g > r && g > b && g > 150
                    if (g > r + 30 && g > b && g > 150) {
                        console.log('[Scanner isInputCorrect] CORRECT via green background:', bgColor);
                        return true;
                    }
                }
            }

            // Check 5: Border color
            const borderColor = style.borderColor || '';
            if (/green|#4caf50|#8bc34a|#2e7d32|rgb\(76,\s*175,\s*80\)/i.test(borderColor)) {
                console.log('[Scanner isInputCorrect] CORRECT via green border');
                return true;
            }
            if (/red|#f44336|#e53935|#d32f2f/i.test(borderColor)) {
                console.log('[Scanner isInputCorrect] INCORRECT via red border');
                return false;
            }

            // Default: KHÔNG tự động coi là đúng nữa - phải có indicator rõ ràng
            console.log('[Scanner isInputCorrect] No clear indicator found, returning false');
            return false;

        } catch (e) {
            console.warn('[Scanner] Error checking input correct status:', e);
            return false;
        }
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

    function cleanQuestionText(text, element = null) {
        if (!text) return '';

        // 1. Loại bỏ đoạn văn đọc hiểu nếu có marker "Choose the best answer"
        const markers = [
            'Choose the best answer',
            'Choose the correct answer',
            'Select the best answer',
            'Select the correct answer',
            'Chọn câu trả lời đúng nhất',
            'Chọn đáp án đúng nhất',
            'Chọn một câu trả lời',
            'Choose one answer',
            'Trả lời câu hỏi',
            'Answer the question',
            'Are these following sentences true \\(T\\) or false \\(F\\)',
            'Are these following sentences true or false',
            'Are the following sentences true or false',
            'True or False',
            'True \\(T\\) or false \\(F\\)',
            'Read the text and do the activities that follow'
        ];

        let processedText = text;

        // Special Case: "Circle the best title for the reading text" dạng Instruction + Title + Passage
        const titleMarkers = [
            'Circle the best title for the reading text',
            'Circle the best title for the text',
            'Choose the best title',
            'Choose the most suitable title',
            'Select the best title',
            'What is the best title',
            'Which of the following is the best title',
            'Which of the following is the most suitable title',
            'Give a title to the passage',
            'Chọn tiêu đề đúng nhất',
            'Chọn tiêu đề phù hợp nhất',
            'Chọn tiêu đề cho đoạn văn',
            'Chọn tên đúng cho đoạn văn'
        ];

        const textLower = processedText.toLowerCase();
        for (const marker of titleMarkers) {
            if (textLower.includes(marker.toLowerCase())) {
                const markerIdx = textLower.indexOf(marker.toLowerCase());
                const endOfMarker = markerIdx + marker.length;

                // Keep the part until the end of the marker (the instruction)
                const afterMarker = processedText.substring(endOfMarker);
                const firstSentenceMatch = afterMarker.match(/^[\.\s\:\-\n\r]*/);
                const instructionEnd = endOfMarker + (firstSentenceMatch ? firstSentenceMatch[0].length : 0);
                const instruction = processedText.substring(0, instructionEnd).trim();

                let title = "";
                // If element is provided, look for bold text
                if (element) {
                    const bold = element.querySelector('strong, b');
                    if (bold) {
                        title = bold.textContent.trim();
                    }
                }

                // Fallback for title: take the next short part or sentence
                if (!title) {
                    const remaining = processedText.substring(instructionEnd).trim();
                    if (remaining) {
                        const parts = remaining.split(/\r?\n|(?<=[.!?])\s+/);
                        const firstPart = parts[0].trim();
                        if (firstPart.length > 0 && firstPart.length < 150) {
                            title = firstPart;
                        }
                    }
                }

                // If we found a valid instruction and title, use them and ignore the rest of the text
                if (instruction) {
                    return (instruction + (title ? " " + title : "")).trim();
                }
            }
        }

        // 0. Remove audio player scripts / CDATA
        if (processedText.includes('//]]>')) {
            const parts = processedText.split('//]]>');
            if (parts.length > 1) {
                const afterScript = parts[parts.length - 1].trim();
                if (afterScript.length > 5) {
                    processedText = afterScript;
                }
            }
        }

        // Remove or reassign .mp3/.wav/.ogg audio references
        // Improved: if audio is at the start, prefer content after it; if audio is at the end, prefer content before it.
        // Also try to strip labels like "Track 5.1" and leftover separators so we keep only the readable question text.
        const audioExtensions = ['.mp3', '.wav', '.ogg'];
        for (const ext of audioExtensions) {
            const lower = processedText.toLowerCase();
            const idx = lower.lastIndexOf(ext);
            if (idx !== -1) {
                let beforeAudio = processedText.substring(0, idx).trim();
                let afterAudio = processedText.substring(idx + ext.length).trim();

                // Quick cleanup for encoded spaces and common 'track' tokens
                beforeAudio = beforeAudio.replace(/%20/g, ' ').replace(/track\s*[\d\.%-]*/ig, '').replace(/\s+$/, '').replace(/\/\/.*$/, '').trim();
                afterAudio = afterAudio.replace(/%20/g, ' ').trim();

                // If meaningful content exists AFTER audio (audio at start), prefer content after it
                if (afterAudio.length > 5) {
                    processedText = afterAudio.replace(/https?:\/\/\S+/gi, '').trim();
                    // cleanup stray 'Track' left-overs
                    processedText = processedText.replace(/track\s*[\d\.%-]*/ig, '').replace(/(?:\/\/|-{2,}).*/g, '').trim();
                    break;
                }

                // If meaningful content exists BEFORE audio (audio at end), prefer content before it
                if (beforeAudio.length > 5) {
                    processedText = beforeAudio.replace(/https?:\/\/\S+/gi, '').replace(/track\s*[\d\.%-]*/ig, '').replace(/(?:\/\/|-{2,}).*/g, '').trim();
                    break;
                }

                // Otherwise, remove the audio token and continue
                processedText = (beforeAudio + ' ' + afterAudio).replace(/https?:\/\/\S+/gi, '').trim();
            }
        }

        // Also remove bare URLs that might remain (e.g., audio links) to avoid capturing them as question text
        processedText = processedText.replace(/https?:\/\/\S+/gi, '').trim();

        // Tìm marker xuất hiện cuối cùng (gần câu hỏi nhất)
        for (const marker of markers) {
            // Sử dụng regex để match case-insensitive
            const regex = new RegExp(marker, 'gi');
            const matches = [...processedText.matchAll(regex)];

            if (matches.length > 0) {
                // Lấy match cuối cùng
                const lastMatch = matches[matches.length - 1];
                const lastIndex = lastMatch.index || 0;

                // Kiểm tra phần trước và sau marker
                const contentAfter = processedText.substring(lastIndex + lastMatch[0].length).trim();
                const contentBefore = processedText.substring(0, lastIndex).trim();

                // Detect if contentAfter looks like an answer list or instruction for answers
                const looksLikeAnswerList = /(^|\n)\s*([A-Da-d]|\d+)[\.\)]\s+/m.test(contentAfter)
                    || /(^|\n)\s*a\.\s+/im.test(contentAfter)
                    || /\b(chọn|choose|select|circle|tick|đáp án)\b/i.test(contentAfter);

                // If contentAfter looks like answers or non-question instructions, prefer contentBefore (the real question/instruction)
                if ((contentAfter.length === 0 || looksLikeAnswerList) && contentBefore.length > 5) {
                    processedText = contentBefore;
                    break;
                }

                // Otherwise if contentAfter looks like a question/has enough content, take it
                if (contentAfter.length > 5 && /[a-zA-Z0-9]/.test(contentAfter)) {
                    processedText = contentAfter;
                    break;
                }
            }
        }

        // 2. Loại bỏ prefix (Câu 1:, Question 1:, ...)
        processedText = processedText.replace(/^(Câu\s*\d+[:\.\)\s]*|Bài\s*\d+[:\.\)\s]*|Question\s*\d+[:\.\)\s]*|\d+[\.\)]\s*)/i, '').trim();

        // Final sanitization: remove leading/trailing code-like fragments and stray punctuation
        // (e.g., things like '", true); //]]>' or leftover separators)
        processedText = processedText.replace(/^\s*[^A-Za-z0-9À-ʯ\u0400-\u04FF]+/, '').replace(/[^A-Za-z0-9À-ʯ\u0400-\u04FF]+\s*$/, '').trim();
        processedText = processedText.replace(/["'`]\s*,\s*(true|false)\)\s*;?/i, '').trim();

        return processedText;
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
            // remove inputs, svgs, icons, scripts, styles, audio elements and numbering helper nodes
            clone.querySelectorAll('input, svg, button, img, script, style, audio, source, iframe, noscript, .answernumber, .bullet, .icon, .audioplayer, .audio').forEach(n => n.remove());
            // Also remove common inline tokens that sometimes include links or JS fragments
            clone.querySelectorAll('[data-src], [data-audio], [data-track]').forEach(n => n.remove());
            return normalizeText(clone.textContent || '');
        } catch (e) {
            return normalizeText(el.textContent || '');
        }
    }

    function extractAnswersFromContainer(container) {
        const answers = [];
        const seen = new Set();
        function isVisible(el) {
            if (!el) return false;
            try {
                const style = window.getComputedStyle(el);
                return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            } catch (e) {
                return true;
            }
        }

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
            const isCorrect = el.classList.contains('correct') || !!el.querySelector('.correct') || !!el.closest('.correct');
            const isIncorrect = el.classList.contains('incorrect') || el.classList.contains('wrong') || !!el.querySelector('.incorrect') || !!el.closest('.incorrect');

            const isTicked = (() => {
                try {
                    const text = el.textContent || '';
                    const classList = (el.className || '') + ' ' + (el.querySelector?.('*')?.className || '');

                    // BƯỚC 1: Loại trừ ngay nếu có dấu X hoặc incorrect
                    if (isIncorrect) return false;
                    if (/[✗×❌]/.test(text) && !/[✓✔]/.test(text)) return false;
                    if (/\b(incorrect|wrong|false|error)\b/i.test(classList)) return false;
                    if (el.querySelector('.fa-times, .fa-close, .glyphicon-remove, .icon-wrong, .icon-incorrect, .icon-error')) return false;

                    // BƯỚC 2: Kiểm tra CSS styles (viền xanh, background xanh)
                    // BỎ QUA kiểm tra màu CSS vì có thể tất cả đáp án đều có viền xanh

                    // BƯỚC 2: ƯU TIÊN tìm dấu tick thật sự (ký tự, icon, SVG)
                    // Kiểm tra ký tự tick trong nội dung
                    if (/[✓✔✅]/.test(text)) {
                        console.log('[Scanner] Phát hiện ký tự tick:', label, answerText.substring(0, 50));
                        return true;
                    }

                    // Kiểm tra SVG hoặc img có chứa tick/check
                    const svgs = el.querySelectorAll('svg, img, i, span[class*="icon"]');
                    for (const icon of svgs) {
                        const iconClass = icon.className?.baseVal || icon.className || '';
                        const iconSrc = icon.src || icon.getAttribute('xlink:href') || '';
                        const iconContent = icon.textContent || '';

                        // Kiểm tra class có chứa check/tick/ok
                        if (/\b(check|tick|correct|ok|success|selected)\b/i.test(iconClass)) {
                            console.log('[Scanner] Phát hiện icon tick qua class:', label, iconClass);
                            return true;
                        }

                        // Kiểm tra src có chứa check/tick
                        if (/check|tick|correct|ok/i.test(iconSrc)) {
                            console.log('[Scanner] Phát hiện icon tick qua src:', label, iconSrc);
                            return true;
                        }

                        // Kiểm tra nội dung icon có ký tự tick
                        if (/[✓✔✅]/.test(iconContent)) {
                            console.log('[Scanner] Phát hiện ký tự tick trong icon:', label);
                            return true;
                        }
                    }

                    // Kiểm tra FontAwesome/Glyphicon classes
                    if (el.querySelector('.fa-check, .fa-check-circle, .glyphicon-ok, .glyphicon-ok-circle, .icon-checked, .tick-icon, .icon-correct, .icon-ok')) {
                        console.log('[Scanner] Phát hiện icon class tick:', label);
                        return true;
                    }

                    // BƯỚC 3: Kiểm tra input checkbox/radio được checked
                    if (input?.checked) {
                        console.log('[Scanner] Phát hiện input checked:', label);
                        return true;
                    }

                    // BƯỚC 4: Kiểm tra aria và class correct (BỎ QUA CSS màu)
                    if (el.querySelector('[aria-checked="true"]')) return true;
                    // BỎ QUA isCorrect và classList check vì không đáng tin
                    // if (isCorrect) return true;
                    // if (/\b(correct|right)\b/i.test(classList)) return true;

                } catch (e) {
                    console.error('[Scanner] Lỗi khi kiểm tra tick:', e);
                }
                return false;
            })();

            const isSelected = isTicked;



            answers.push({
                label: label || '',
                text: answerText,
                fullText: text,
                isSelected: isSelected,
                isCorrect: isCorrect,
                isTicked: isTicked
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
                    isCorrect: false,
                    isTicked: !!input.checked
                });
            });
        }

        // Extra fallback: if still too few answers (or only detected selected ones), do a broader search
        if (answers.length <= 1) {
            const fallbackEls = answerContainer.querySelectorAll('label, li, .option, .answer, .choice, .choice-text, .answertext, div');
            fallbackEls.forEach((el) => {
                if (!el || isExtensionElement(el) || !isVisible(el)) return;
                const text = getElementVisibleText(el);
                if (!text || text.length > 500) return;

                // Extract label if present
                const labelMatch = text.match(/^([A-Da-d])[\.\)\:\s]+/);
                let label = '';
                let answerText = text;
                if (labelMatch) {
                    label = labelMatch[1].toUpperCase();
                    answerText = text.replace(labelMatch[0], '').trim();
                }

                answerText = normalizeText(answerText);
                if (!answerText) return;
                if (seen.has(answerText)) return;
                seen.add(answerText);

                // Try to find input state if exists
                const input = el.querySelector('input[type="radio"], input[type="checkbox"]') || el.closest('label')?.querySelector('input[type="radio"], input[type="checkbox"]');
                const isSelected = !!(input?.checked || el.classList.contains('checked') || el.querySelector('input:checked'));
                const isCorrect = el.classList.contains('correct') || !!el.querySelector('.correct') || !!el.closest('.correct');
                const isTicked = (() => {
                    try {
                        if (isSelected) return true;
                        if (el.querySelector('[aria-checked="true"]')) return true;
                        if (/check|tick|ok|selected|checked/i.test(el.className || '')) return true;
                        if (/[✓✔]/.test(el.textContent || '')) return true;
                        if (el.querySelector('.fa-check, .glyphicon-ok, .icon-checked, .tick-icon')) return true;
                    } catch (e) { }
                    return false;
                })();

                answers.push({
                    label: label || '',
                    text: answerText,
                    fullText: text,
                    isSelected: isSelected,
                    isCorrect: isCorrect,
                    isTicked: isTicked
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

            const input = el.querySelector('input[type="radio"], input[type="checkbox"]') || el.closest('label')?.querySelector('input[type="radio"], input[type="checkbox"]');
            const isCorrect = el.classList.contains('correct') || !!el.querySelector('.correct') || !!el.closest('.correct');
            const isIncorrect = el.classList.contains('incorrect') || el.classList.contains('wrong') || !!el.querySelector('.incorrect') || !!el.closest('.incorrect');

            const isTicked = (() => {
                try {
                    const text = el.textContent || '';
                    const classList = el.className || '';

                    // BƯỚC 1: Loại trừ ngay nếu có dấu X hoặc incorrect
                    if (isIncorrect) return false;
                    if (/[✗×❌]/.test(text) && !/[✓✔]/.test(text)) return false;
                    if (/\b(incorrect|wrong|false|error)\b/i.test(classList)) return false;
                    if (el.querySelector('.fa-times, .fa-close, .glyphicon-remove, .icon-wrong, .icon-incorrect, .icon-error')) return false;

                    // BƯỚC 2: ƯU TIÊN tìm dấu tick thật sự
                    if (/[✓✔✅]/.test(text)) return true;

                    const svgs = el.querySelectorAll('svg, img, i, span[class*="icon"]');
                    for (const icon of svgs) {
                        const iconClass = icon.className?.baseVal || icon.className || '';
                        const iconSrc = icon.src || icon.getAttribute('xlink:href') || '';
                        const iconContent = icon.textContent || '';

                        if (/\b(check|tick|correct|ok|success|selected)\b/i.test(iconClass)) return true;
                        if (/check|tick|correct|ok/i.test(iconSrc)) return true;
                        if (/[✓✔✅]/.test(iconContent)) return true;
                    }

                    if (el.querySelector('.fa-check, .fa-check-circle, .glyphicon-ok, .glyphicon-ok-circle, .icon-checked, .tick-icon, .icon-correct, .icon-ok')) return true;
                    if (input?.checked) return true;
                    if (el.querySelector('[aria-checked="true"]')) return true;
                    if (isCorrect) return true;
                    if (/\b(correct|right)\b/i.test(classList)) return true;

                } catch (e) { }
                return false;
            })();

            const isSelected = isTicked;

            answers.push({
                label: label || String.fromCharCode(65 + idx),
                text: answerText,
                fullText: text,
                isSelected: isSelected,
                isCorrect: isCorrect,
                isTicked: isTicked
            });
        });

        // If too few candidates were found, do a deeper scan inside the container
        if (answers.length <= 1) {
            const fallbackEls = container.querySelectorAll('label, li, .option, .answer, .choice, [role="option"], div');
            fallbackEls.forEach((el, idx) => {
                if (!el || el === questionElement || isExtensionElement(el)) return;
                const text = getElementVisibleText(el);
                if (!text || text.length > 500) return;

                const labelMatch = text.match(/^([A-Da-d])[\.\)\:\s]+/);
                let label = '';
                let answerText = text;
                if (labelMatch) {
                    label = labelMatch[1].toUpperCase();
                    answerText = text.replace(labelMatch[0], '').trim();
                }

                answerText = normalizeText(answerText);
                if (!answerText) return;
                if (seen.has(answerText)) return;
                seen.add(answerText);

                const input = el.querySelector('input[type="radio"], input[type="checkbox"]') || el.closest('label')?.querySelector('input[type="radio"], input[type="checkbox"]');
                const isSelected = !!(input?.checked || el.classList.contains('checked') || el.querySelector('input:checked'));
                const isCorrect = el.classList.contains('correct') || !!el.querySelector('.correct') || !!el.closest('.correct');

                answers.push({
                    label: label || String.fromCharCode(65 + idx),
                    text: answerText,
                    fullText: text,
                    isSelected: isSelected,
                    isCorrect: isCorrect
                });
            });
        }

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
                <button class="scanner-btn scanner-btn-secondary" id="scanner-select-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Chọn tất cả
                </button>
                <button class="scanner-btn scanner-btn-secondary" id="scanner-delete-selected">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"></path>
                        <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                    </svg>
                    Xóa đã chọn
                </button>
                <button class="scanner-btn scanner-btn-primary" id="scanner-add-db" style="background: linear-gradient(135deg, #10B981, #059669);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Thêm vào DB
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
            if (e.target === overlay) {
                // If an edit form is currently open, ignore accidental overlay clicks
                if (scannerPopup && scannerPopup.querySelector('.scanner-edit-form')) return;
                closeScannerPopup();
            }
        });

        scannerPopup.querySelector('.scanner-close-btn').addEventListener('click', closeScannerPopup);

        scannerPopup.querySelector('#scanner-copy-all').addEventListener('click', () => {
            copyAllQuestions(questions);
        });

        scannerPopup.querySelector('#scanner-add-db').addEventListener('click', () => {
            handleAddToDB(questions);
        });

        // Click vào câu hỏi để scroll đến
        // Helpers to remove question and update UI
        function updateCount() {
            const countEl = scannerPopup.querySelector('.scanner-count');
            if (countEl) countEl.textContent = `${questions.length} câu hỏi`;
        }

        function removeQuestionByIndex(idxValue) {
            const num = Number(idxValue);
            // remove from data array
            for (let i = questions.length - 1; i >= 0; i--) {
                if (questions[i].index === num) questions.splice(i, 1);
            }
            // remove DOM element(s)
            const el = scannerPopup.querySelector(`.scanner-question-item[data-index="${num}"]`);
            if (el) el.remove();
            updateCount();
        }

        // Selection state for bulk actions
        const selectedForDelete = new Set();

        function markItemSelectedDOM(item, selected) {
            if (!item) return;
            if (selected) {
                item.classList.add('marked-for-delete');
                const cb = item.querySelector('.scanner-remove-checkbox');
                if (cb) cb.checked = true;
            } else {
                item.classList.remove('marked-for-delete');
                const cb = item.querySelector('.scanner-remove-checkbox');
                if (cb) cb.checked = false;
            }
        }

        // Click into question to scroll
        scannerPopup.querySelectorAll('.scanner-question-item').forEach((item, idx) => {
            item.addEventListener('click', (ev) => {
                // avoid clicks that originated from controls (remove, checkbox, edit, or edit form)
                if (ev.target.closest('.scanner-remove-btn') || ev.target.closest('.scanner-remove-checkbox') || ev.target.closest('.scanner-edit-btn') || ev.target.closest('.scanner-edit-form')) return;

                // If the click target is the item itself (i.e. blank/padding area), do not close the popup
                if (ev.target === item) return;

                const dataIndex = Number(item.getAttribute('data-index'));
                const question = questions.find(q => q.index === dataIndex) || questions[idx];
                if (question && question.element) {
                    // Scroll to the question but keep the popup open
                    question.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });

        // Attach remove button handlers
        scannerPopup.querySelectorAll('.scanner-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.scanner-question-item');
                if (!item) return;
                const idxValue = item.getAttribute('data-index');
                // remove immediately single item
                removeQuestionByIndex(idxValue);
                // also clear from selection set
                selectedForDelete.delete(Number(idxValue));
            });
        });

        // Attach edit button handlers
        scannerPopup.querySelectorAll('.scanner-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.scanner-question-item');
                if (!item) return;
                const idxValue = Number(item.getAttribute('data-index'));
                const question = questions.find(q => q.index === idxValue);
                if (!question) return;
                openEditFormForItem(item, question);
            });
        });

        // Attach checkbox handlers (mark selection)
        scannerPopup.querySelectorAll('.scanner-remove-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                e.stopPropagation();
                const item = cb.closest('.scanner-question-item');
                if (!item) return;
                const idxValue = Number(item.getAttribute('data-index'));
                if (cb.checked) {
                    selectedForDelete.add(idxValue);
                    markItemSelectedDOM(item, true);
                } else {
                    selectedForDelete.delete(idxValue);
                    markItemSelectedDOM(item, false);
                }
            });
        });

        // Select all button
        const selectAllBtn = scannerPopup.querySelector('#scanner-select-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                scannerPopup.querySelectorAll('.scanner-question-item').forEach(item => {
                    const idxValue = Number(item.getAttribute('data-index'));
                    selectedForDelete.add(idxValue);
                    markItemSelectedDOM(item, true);
                });
            });
        }

        // Delete selected button
        const deleteSelectedBtn = scannerPopup.querySelector('#scanner-delete-selected');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedForDelete.size === 0) {
                    showNotification('Chưa có câu hỏi nào được chọn', 'info');
                    return;
                }
                // Proceed to remove without confirmation
                const toRemove = Array.from(selectedForDelete);
                toRemove.forEach(idx => {
                    removeQuestionByIndex(idx);
                });
                // clear selection
                selectedForDelete.clear();
                showNotification('Đã xóa ' + toRemove.length + ' câu hỏi đã chọn', 'success');
            });
        }

        // --- Edit form helpers ---
        function openEditFormForItem(item, question) {
            // prevent multiple forms
            if (item.querySelector('.scanner-edit-form')) return;

            const originalTextEl = item.querySelector('.scanner-question-text');
            const answersContainer = item.querySelector('.scanner-answers');

            const form = document.createElement('div');
            form.className = 'scanner-edit-form';

            // Question textarea
            const ta = document.createElement('textarea');
            ta.value = question.question || '';
            form.appendChild(ta);

            // Answers editor
            const answersWrapper = document.createElement('div');
            answersWrapper.className = 'edit-answers';

            const answers = question.answers && question.answers.length ? question.answers : [];
            answers.forEach((a, i) => {
                const row = document.createElement('div');
                row.className = 'edit-answer-row';
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = !!a.isTicked;
                chk.title = 'Đánh dấu là đáp án đã tick';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = a.text || '';
                input.placeholder = 'Nội dung đáp án';

                const lbl = document.createElement('div');
                lbl.style.minWidth = '20px';
                lbl.style.fontWeight = '600';
                lbl.style.color = '#667eea';
                lbl.textContent = a.label || String.fromCharCode(65 + i);

                row.appendChild(lbl);
                row.appendChild(chk);
                row.appendChild(input);
                answersWrapper.appendChild(row);
            });

            // allow adding one more answer row
            const addRowBtn = document.createElement('button');
            addRowBtn.type = 'button';
            addRowBtn.textContent = '+ Thêm đáp án';
            Object.assign(addRowBtn.style, { alignSelf: 'flex-start', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' });
            addRowBtn.addEventListener('click', () => {
                const idx = answersWrapper.querySelectorAll('.edit-answer-row').length;
                const row = document.createElement('div');
                row.className = 'edit-answer-row';
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Nội dung đáp án';
                const lbl = document.createElement('div');
                lbl.style.minWidth = '20px';
                lbl.style.fontWeight = '600';
                lbl.style.color = '#667eea';
                lbl.textContent = String.fromCharCode(65 + idx);
                row.appendChild(lbl);
                row.appendChild(chk);
                row.appendChild(input);
                answersWrapper.appendChild(row);
            });

            form.appendChild(answersWrapper);
            form.appendChild(addRowBtn);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'scanner-edit-actions';
            const saveBtn = document.createElement('button');
            saveBtn.className = 'scanner-btn scanner-btn-primary';
            saveBtn.textContent = 'Lưu';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'scanner-btn scanner-btn-secondary';
            cancelBtn.textContent = 'Hủy';

            actions.appendChild(cancelBtn);
            actions.appendChild(saveBtn);
            form.appendChild(actions);

            item.appendChild(form);

            cancelBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                form.remove();
            });

            saveBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                // collect values
                const newQ = ta.value.trim();
                const rows = answersWrapper.querySelectorAll('.edit-answer-row');
                const newAnswers = [];
                rows.forEach((r, i) => {
                    const txt = (r.querySelector('input[type="text"]')?.value || '').trim();
                    if (!txt) return;
                    const checked = !!r.querySelector('input[type="checkbox"]')?.checked;
                    newAnswers.push({
                        label: r.querySelector('div')?.textContent || String.fromCharCode(65 + i),
                        text: txt,
                        fullText: txt,
                        isSelected: checked,
                        isCorrect: false,
                        isTicked: checked
                    });
                });

                // update data model
                const qObj = questions.find(q => q.index === question.index);
                if (qObj) {
                    qObj.question = newQ || qObj.question;
                    qObj.answers = newAnswers.length ? newAnswers : qObj.answers;
                }

                // update DOM: question text
                if (originalTextEl) originalTextEl.innerHTML = escapeHTML(qObj.question);

                // update answers list using DOM nodes to avoid accidental HTML injection/DOM reflow
                // remove any existing .scanner-answers inside this item, then append newly built container
                (function rebuildAnswersInItem() {
                    // ensure we're working with the popup item DOM only
                    const itemRoot = item;
                    if (!itemRoot) return;

                    // build new answers container
                    const newAnswersEl = document.createElement('div');
                    newAnswersEl.className = 'scanner-answers';

                    // only render answers that are marked as ticked
                    (qObj.answers || []).filter(a => !!a.isTicked).forEach(a => {
                        const aDiv = document.createElement('div');
                        const classes = ['scanner-answer'];
                        if (a.isSelected) classes.push('selected');
                        if (a.isCorrect) classes.push('correct');
                        if (a.isTicked) classes.push('ticked');
                        aDiv.className = classes.join(' ');

                        const lbl = document.createElement('span');
                        lbl.className = 'answer-label';
                        lbl.textContent = a.label || '•';

                        const txt = document.createElement('span');
                        txt.className = 'answer-text';
                        txt.innerHTML = escapeHTML(a.text || '');

                        aDiv.appendChild(lbl);
                        aDiv.appendChild(txt);
                        newAnswersEl.appendChild(aDiv);
                    });

                    // remove any existing answer containers inside the popup item
                    const existingContainers = itemRoot.querySelectorAll('.scanner-answers');
                    existingContainers.forEach(c => c.remove());

                    // append newAnswersEl if it has children
                    if (newAnswersEl.children.length > 0) {
                        // append after question text
                        const textEl = itemRoot.querySelector('.scanner-question-text');
                        if (textEl && textEl.parentNode) {
                            textEl.insertAdjacentElement('afterend', newAnswersEl);
                        } else {
                            itemRoot.appendChild(newAnswersEl);
                        }
                    }
                })();

                // remove form
                form.remove();
                showNotification('Đã lưu sửa đổi', 'success');
            });
        }
    }

    function createQuestionItemHTML(q) {
        // Chỉ hiển thị đáp án có tick thật (không phải X)
        const visibleAnswers = q.answers.filter(a => a.isTicked === true);

        // Debug log
        if (visibleAnswers.length === 0) {
            console.warn('[Scanner] Câu hỏi không có đáp án ticked:', q.question, q.answers);
        }

        const answersToRender = visibleAnswers.length > 0 ? visibleAnswers : [];
        const answersHTML = answersToRender.length > 0
            ? `<div class="scanner-answers">
                ${answersToRender.map(a => `
                    <div class="scanner-answer ${a.isSelected ? 'selected' : ''} ${a.isCorrect ? 'correct' : ''} ${a.isTicked ? 'ticked' : ''}">
                        <span class="answer-label">${a.label || '•'}</span>
                        <span class="answer-text">${escapeHTML(a.text)}</span>
                    </div>
                `).join('')}
               </div>`
            : '';

        return `
            <div class="scanner-question-item" data-index="${q.index}">
                <div class="scanner-question-header">
                    <div style="display:flex; align-items:center; gap:8px">
                        <input type="checkbox" class="scanner-remove-checkbox" title="Chọn để xóa" />
                        <span class="question-number">Câu ${q.index}</span>
                        <span class="question-type">${q.type}</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center">
                        <button class="scanner-edit-btn" title="Sửa câu hỏi">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                            </svg>
                        </button>
                        <button class="scanner-remove-btn" title="Xóa câu hỏi">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                        </button>
                    </div>
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

            .scanner-remove-btn {
                background: transparent;
                border: none;
                width: 32px;
                height: 32px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #6c757d;
                border-radius: 6px;
                transition: background 0.15s, color 0.15s, transform 0.12s;
            }

            .scanner-remove-btn:hover {
                background: rgba(0,0,0,0.04);
                color: #dc3545;
                transform: translateY(-1px);
            }

            .scanner-edit-btn {
                background: transparent;
                border: none;
                width: 32px;
                height: 32px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #6c757d;
                border-radius: 6px;
                transition: background 0.12s, color 0.12s, transform 0.12s;
            }

            .scanner-edit-btn:hover {
                background: rgba(0,0,0,0.04);
                color: #2b8cff;
                transform: translateY(-1px);
            }

            .scanner-edit-form {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 8px 0;
                background: #fffaf6;
                border-radius: 8px;
                border: 1px dashed #ffecb5;
                margin-top: 8px;
            }

            .scanner-edit-form textarea {
                width: 100%;
                min-height: 64px;
                padding: 8px;
                font-size: 13px;
            }

            .scanner-edit-form .edit-answers {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .scanner-edit-form .edit-answer-row {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .scanner-edit-form input[type="text"] {
                flex: 1;
                padding: 6px 8px;
                font-size: 13px;
            }

            .scanner-edit-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 6px;
            }

            .scanner-remove-checkbox {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }

            .scanner-question-item.marked-for-delete {
                background: #fff5f5;
                border-color: #f5c6cb;
                box-shadow: 0 0 0 3px rgba(220,53,69,0.06);
            }

            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                margin-left: 8px;
            }
            .status-badge.processing { background: #e3f2fd; color: #2196f3; }
            .status-badge.exists { background: #fff3cd; color: #856404; }
            .status-badge.success { background: #d4edda; color: #155724; }
            .status-badge.error { background: #f8d7da; color: #721c24; }
        `;

        document.head.appendChild(styles);
    }


    // ==================== DB INTEGRATION LOGIC ====================
    // Helper: send runtime message with retries when port closes unexpectedly
    function sendMessageWithRetries(message, maxRetries = 3, delay = 500) {
        let attempt = 0;
        return new Promise((resolve, reject) => {
            function trySend() {
                attempt++;
                try {
                    chrome.runtime.sendMessage(message, (res) => {
                        if (chrome.runtime.lastError) {
                            const errMsg = String(chrome.runtime.lastError.message || chrome.runtime.lastError);
                            // If port closed, we can retry a few times
                            if (errMsg.includes('The message port closed before a response was received') && attempt <= maxRetries) {
                                console.warn('[Scanner] Message port closed, retrying', attempt, 'of', maxRetries);
                                setTimeout(trySend, delay * attempt);
                                return;
                            }
                            return reject(new Error(errMsg));
                        }
                        resolve(res);
                    });
                } catch (e) {
                    if (attempt <= maxRetries) {
                        setTimeout(trySend, delay * attempt);
                    } else {
                        reject(e);
                    }
                }
            }
            trySend();
        });
    }

    async function handleAddToDB(questions) {
        const btn = document.getElementById('scanner-add-db');
        if (!btn) return;

        // Disable button
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="scanner-spin">⟳</span> Đang xử lý...`;

        // Reset status badges
        questions.forEach(q => {
            const item = scannerPopup.querySelector(`.scanner-question-item[data-index="${q.index}"]`);
            if (item) {
                const oldBadge = item.querySelector('.status-badge');
                if (oldBadge) oldBadge.remove();
            }
        });

        try {
            // Get currently selected document(s) from extension storage (popup saves selected documents under this key)
            const selectedDocId = await new Promise((resolve) => {
                try {
                    chrome.storage.local.get(['tailieu_selected_documents'], (res) => {
                        const val = res && res.tailieu_selected_documents;
                        if (Array.isArray(val) && val.length) resolve(val[0]);
                        else resolve(val || null);
                    });
                } catch (e) {
                    resolve(null);
                }
            });

            // Attach documentId and filter answers to only include ticked/selected ones
            const payloadQuestions = (questions || []).map(q => {
                const filteredAnswers = (q.answers || []).filter(a => !!a.isTicked || !!a.isSelected);
                if (!filteredAnswers || filteredAnswers.length === 0) {
                    console.warn('[Scanner] No ticked answers found for question index', q.index, '— payload will include empty answer list');
                }
                return { ...q, answers: filteredAnswers, documentId: selectedDocId };
            });

            // Send to background script
            console.log('[Scanner] Sending batchAddQuestionsToDB message, documentId=', selectedDocId);
            const response = await sendMessageWithRetries({ action: 'batchAddQuestionsToDB', questions: payloadQuestions }, 3, 600);

            if (!response || !response.success) {
                throw new Error(response?.error || 'Unknown error');
            }

            const results = response.results || [];
            let addedCount = 0;
            let existsCount = 0;
            let errorCount = 0;

            // Update UI based on results
            // We assume results are ordered or we can match by index if preserved
            // The background script should return results for each question

            // If background script blindly processes, we map results to questions.
            // Let's assume the background script returns an array of { index, status, message }

            results.forEach(res => {
                const qIndex = res.index;
                const status = res.status;
                const msg = res.message;

                if (status === 'success') addedCount++;
                else if (status === 'exists') existsCount++;
                else errorCount++;

                updateItemStatus(qIndex, status, msg);
            });
            // Include document/category info in overall notification when available
            let extraInfo = '';
            if (results && results.length) {
                const anyWithDoc = results.find(r => r.documentTitle || r.categoryTitle || r.documentId);
                if (anyWithDoc) {
                    const d = anyWithDoc.documentTitle || anyWithDoc.documentId || '';
                    const c = anyWithDoc.categoryTitle || '';
                    extraInfo = d ? ` trong tài liệu: ${d}` : '';
                    if (c) extraInfo += ` (danh mục: ${c})`;
                }
            }

            showNotification(`Hoàn tất! Thêm mới: ${addedCount}, Đã có: ${existsCount}, Lỗi: ${errorCount}${extraInfo}`, 'success');

        } catch (error) {
            console.error('Batch error:', error);
            showNotification('Lỗi: ' + error.message, 'error');

            // Mark all as error if batch failed completely
            questions.forEach(q => updateItemStatus(q.index, 'error', 'Lỗi kết nối'));
        } finally {
            // Restore button
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Đã xong`;
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }, 3000);
        }
    }

    function updateItemStatus(index, status, message) {
        if (!scannerPopup) return;
        const item = scannerPopup.querySelector(`.scanner-question-item[data-index="${index}"]`);
        if (!item) return;

        let badge = item.querySelector('.status-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'status-badge';
            // Insert before edit button or in header
            const header = item.querySelector('.scanner-question-header > div:first-child');
            if (header) header.appendChild(badge);
        }

        badge.className = `status-badge ${status}`;
        badge.textContent = message;
    }

    // ==================== INITIALIZE ====================
    function init() {
        // Đợi DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                createScannerButton();
                checkAutoScanTrigger();
            });
        } else {
            createScannerButton();
            checkAutoScanTrigger();
        }
    }

    // Kiểm tra và tự động kích hoạt quét nếu có yêu cầu (sau khi reload)
    function checkAutoScanTrigger() {
        try {
            if (sessionStorage.getItem('tailieu_auto_scan_trigger') === 'true') {
                sessionStorage.removeItem('tailieu_auto_scan_trigger');
                console.log('[Tailieu Scanner] Tự động kích hoạt quét sau khi reload...');
                // Đợi một lát cho trang ổn định
                setTimeout(() => {
                    handleScanClick();
                }, 1500);
            }
        } catch (e) {
            console.warn('[Tailieu Scanner] Không thể kiểm tra auto scan trigger:', e);
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
