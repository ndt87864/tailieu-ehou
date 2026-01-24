// Fill-in-the-Blank Handler - Xử lý câu hỏi tự luận dạng điền từ
// Chuyên xử lý các câu hỏi dạng "Complete these sentences...", "Complete this conversation..."
// Version 1.1 - Fixed input field detection

(function () {
    'use strict';

    // Tránh load nhiều lần
    if (window.tailieuFillBlankLoaded) return;
    window.tailieuFillBlankLoaded = true;

    console.log('[Tailieu FillBlank] Module loaded v1.1');

    // ==================== CONSTANTS ====================

    // Patterns để nhận diện câu hỏi điền từ
    // Patterns để nhận diện câu hỏi điền từ
    const FILL_BLANK_TRIGGER_PATTERNS = [
        /match\s+(the|these)\s+(word|words|following|sentences)/i,
        /match\s+.*\s+with/i,
        /nối\s+(từ|câu)/i,
        /complete\s+(these|the|this)\s+(sentence|sentences|conversation|conversations|paragraph|paragraphs)/i,
        /fill\s+(in\s+)?(the\s+)?(blank|blanks|gap|gaps)/i,
        /điền\s+(từ|vào\s+chỗ\s+trống)/i,
        /hoàn\s+(thành|thiện)\s+(câu|đoạn)/i,
        /complete\s+the\s+following/i,
        /fill\s+in\s+the\s+missing/i,
        /with\s+time\s+expressions/i,
        /complete\s+.*\s+with/i,
        /true\s+or\s+false/i,
        /true\s*\(t\)\s*or\s*false\s*\(f\)/i,
        /incorrect\s+or\s+correct/i,
        /(sentences|statements).*true.*false/i,
        /correct.*answer/i
    ];

    // Pattern để nhận diện chỗ trống cần điền
    const BLANK_PATTERNS = [
        /\.{2,}/g,           // Dấu chấm liên tiếp: ..., ...., .....
        /…+/g,               // Ellipsis character: …, ……
        /_{2,}/g,            // Gạch dưới liên tiếp: __, ___, ____
        /\[\s*\]/g,          // Ngoặc vuông trống: [], [ ]
        /\(\s*\)/g,          // Ngoặc tròn trống: (), ( )
        /\{\s*\}/g,          // Ngoặc nhọn trống: {}, { }
        /‥+/g,               // Two dot leader
        /[\u2026]+/g,        // Unicode ellipsis
    ];

    // Unified blank placeholder for matching
    const BLANK_PLACEHOLDER = '...';

    // ==================== MAIN FUNCTIONS ====================

    /**
     * Kiểm tra xem một section có phải là câu hỏi điền từ không
     * @param {string} text - Text của section header hoặc instruction
     * @returns {boolean}
     */
    function isFillBlankSection(text) {
        if (!text) return false;
        return FILL_BLANK_TRIGGER_PATTERNS.some(pattern => pattern.test(text));
    }

    /**
     * Kiểm tra xem một câu có chứa chỗ trống để điền không
     * @param {string} text - Text của câu
     * @returns {boolean}
     */
    function hasBlanks(text) {
        if (!text) return false;
        return BLANK_PATTERNS.some(pattern => pattern.test(text));
    }

    /**
     * Đếm số lượng chỗ trống trong câu
     * @param {string} text - Text của câu
     * @returns {number}
     */
    function countBlanks(text) {
        if (!text) return 0;

        // Normalize text first - replace all blank patterns with a standard placeholder
        let normalizedText = text;
        BLANK_PATTERNS.forEach(pattern => {
            normalizedText = normalizedText.replace(pattern, '|||BLANK|||');
        });

        // Count occurrences
        const matches = normalizedText.match(/\|\|\|BLANK\|\|\|/g);
        return matches ? matches.length : 0;
    }

    /**
     * Chuẩn hóa câu để so sánh - thay tất cả chỗ trống thành placeholder thống nhất
     * @param {string} text - Text gốc
     * @returns {string} - Text đã chuẩn hóa
     */
    function normalizeForBlankComparison(text) {
        if (!text) return '';

        let normalized = text;
        const TEMP_PLACEHOLDER = '___BLANK___';

        // 1. Replace all blank patterns with temp placeholder
        BLANK_PATTERNS.forEach(pattern => {
            normalized = normalized.replace(pattern, ` ${TEMP_PLACEHOLDER} `);
        });

        // 2. Remove leading numbers/labels (1. or a))
        normalized = normalized.replace(/^\s*([a-z]|\d+)[\.\):]\s*/i, '');

        // 3. Remove punctuation and special characters
        // We strip dots, commas, brackets, etc., but keep alphanumeric and spaces
        // Important: dashes and underscores might be part of words, but usually safe to remove for sentence matching
        normalized = normalized.replace(/[\.,;?!:"'()\[\]\{\}\-\_\/]+/g, ' ');

        // 4. Restore placeholder
        normalized = normalized.split(TEMP_PLACEHOLDER).join('...');

        // 5. Final normalization
        normalized = normalized
            .replace(/\s+/g, ' ')
            .replace(/\s*\.\.\.\s*/g, ' ... ') // Ensure spaces around blanks
            .trim()
            .toLowerCase();

        return normalized;
    }

    /**
     * So sánh hai câu điền từ (bỏ qua số lượng dấu chấm trong blank)
     * @param {string} sentence1 - Câu từ trang web
     * @param {string} sentence2 - Câu từ database
     * @returns {boolean} - True nếu hai câu giống nhau
     */
    function areFillBlankSentencesSimilar(sentence1, sentence2) {
        const norm1 = normalizeForBlankComparison(sentence1);
        const norm2 = normalizeForBlankComparison(sentence2);

        // Exact match after normalization
        if (norm1 === norm2) return true;

        // Calculate similarity score for fuzzy matching
        const similarity = calculateFillBlankSimilarity(norm1, norm2);

        // Accept if similarity is very high (>95%)
        return similarity > 0.95;
    }

    /**
     * Tính độ tương đồng giữa hai câu điền từ
     * @param {string} str1 
     * @param {string} str2 
     * @returns {number} - Similarity score (0-1)
     */
    function calculateFillBlankSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0;

        // Split into words
        const words1 = str1.split(/\s+/).filter(w => w !== '...');
        const words2 = str2.split(/\s+/).filter(w => w !== '...');

        if (words1.length === 0 && words2.length === 0) return 1.0;
        if (words1.length === 0 || words2.length === 0) return 0;

        // Calculate Jaccard similarity
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(w => set2.has(w)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Parse đáp án từ database format "1.xxx, 2.xxx, 3.xxx"
     * @param {string} answerText - Text đáp án từ DB
     * @returns {Array<{index: number, answer: string}>}
     */
    function parseNumberedAnswers(answerText) {
        if (!answerText) return [];

        const answers = [];

        // Pattern 1: "1.answer1, 2.answer2, 3.answer3" hoặc "1. answer1, 2. answer2"
        const numberedPattern = /(\d+)\s*[.\):\-]\s*([^,;\d]+)/g;
        let match;

        while ((match = numberedPattern.exec(answerText)) !== null) {
            answers.push({
                index: parseInt(match[1]),
                answer: match[2].trim()
            });
        }

        // Nếu không tìm thấy pattern số, thử split bằng dấu phẩy hoặc xuống dòng
        if (answers.length === 0) {
            // Pattern 2: Split by comma, semicolon, or newline
            const parts = answerText.split(/[,;\n]+/).map(p => p.trim()).filter(p => p);

            // Check if parts contain numbered answers
            parts.forEach((part, idx) => {
                const numMatch = part.match(/^(\d+)\s*[.\):\-]?\s*(.+)$/);
                if (numMatch) {
                    answers.push({
                        index: parseInt(numMatch[1]),
                        answer: numMatch[2].trim()
                    });
                } else {
                    // No number prefix, use sequential index
                    answers.push({
                        index: idx + 1,
                        answer: part
                    });
                }
            });
        }

        // Sort by index
        answers.sort((a, b) => a.index - b.index);

        return answers;
    }

    /**
     * Tìm câu hỏi tương ứng trong database cho một câu điền từ
     * @param {string} sentenceText - Câu cần tìm (có thể chứa "..." cho blanks)
     * @param {Array} extensionQuestions - Danh sách câu hỏi từ extension
     * @returns {Object|null} - Câu hỏi matching hoặc null
     */
    function findMatchingQuestion(sentenceText, extensionQuestions) {
        if (!extensionQuestions || extensionQuestions.length === 0) return null;
        if (!sentenceText || sentenceText.length < 5) return null;

        const normalizedSentence = normalizeForBlankComparison(sentenceText);
        console.log('[Tailieu FillBlank] Finding match for:', normalizedSentence.substring(0, 60));

        let bestMatch = null;
        let bestSimilarity = 0;

        for (const q of extensionQuestions) {
            if (!q.question) continue;

            const normalizedDbQuestion = normalizeForBlankComparison(q.question);

            // Method 1: Exact match after normalization
            if (normalizedSentence === normalizedDbQuestion) {
                console.log('[Tailieu FillBlank] ✓ Exact match found!');
                return q;
            }

            // Method 2: Calculate similarity
            const similarity = calculateFillBlankSimilarity(normalizedSentence, normalizedDbQuestion);

            if (similarity > bestSimilarity && similarity > 0.7) {
                bestSimilarity = similarity;
                bestMatch = q;
            }

            // Method 3: Check if words match (ignoring blanks)
            const wordsMatch = checkWordsMatch(normalizedSentence, normalizedDbQuestion);
            if (wordsMatch > 0.85 && wordsMatch > bestSimilarity) {
                bestSimilarity = wordsMatch;
                bestMatch = q;
            }
        }

        if (bestMatch) {
            console.log('[Tailieu FillBlank] Best match (similarity=' + bestSimilarity.toFixed(2) + '):', bestMatch.question.substring(0, 60));
        }

        return bestSimilarity > 0.7 ? bestMatch : null;
    }

    /**
     * Kiểm tra các từ (không kể blank) có khớp không
     * @param {string} str1 
     * @param {string} str2 
     * @returns {number} - Match score (0-1)
     */
    function checkWordsMatch(str1, str2) {
        // Lấy các từ, bỏ qua "..."
        const words1 = str1.split(/\s+/).filter(w => w !== '...' && w.length > 1);
        const words2 = str2.split(/\s+/).filter(w => w !== '...' && w.length > 1);

        if (words1.length === 0 || words2.length === 0) return 0;

        // Đếm số từ giống nhau
        let matchCount = 0;
        const usedIndices = new Set();

        for (const w1 of words1) {
            for (let i = 0; i < words2.length; i++) {
                if (!usedIndices.has(i) && w1 === words2[i]) {
                    matchCount++;
                    usedIndices.add(i);
                    break;
                }
            }
        }

        // Tính tỉ lệ match
        const totalUniqueWords = new Set([...words1, ...words2]).size;
        return matchCount / Math.max(words1.length, words2.length);
    }

    /**
     * Tìm và xử lý tất cả câu hỏi điền từ trên trang
     * @param {Array} extensionQuestions - Danh sách câu hỏi từ extension
     * @param {Object} options - Các tùy chọn
     * @param {boolean} options.autoSelectEnabled - Tự động điền đáp án nếu true
     * @returns {Array} - Danh sách kết quả match
     */
    function processFillBlankQuestions(extensionQuestions, options = {}) {
        const results = [];
        const autoSelectEnabled = options.autoSelectEnabled || false;

        console.log('[Tailieu FillBlank] Processing with autoSelectEnabled:', autoSelectEnabled);

        if (!extensionQuestions || extensionQuestions.length === 0) {
            console.log('[Tailieu FillBlank] Không có câu hỏi extension để so sánh');
            return results;
        }

        // Tìm các section điền từ trên trang
        const fillBlankSections = findFillBlankSections();
        console.log('[Tailieu FillBlank] Tìm thấy', fillBlankSections.length, 'section điền từ');

        fillBlankSections.forEach((section, sectionIdx) => {
            console.log('[Tailieu FillBlank] Xử lý section', sectionIdx + 1, ':', section.instruction?.substring(0, 50));

            // Xử lý từng câu trong section
            section.sentences.forEach((sentenceData, sentIdx) => {
                const { text: sentenceText, element, inputElements } = sentenceData;

                if (!hasBlanks(sentenceText) && inputElements.length === 0) {
                    return; // Skip nếu không có chỗ trống
                }

                // Tìm câu matching trong DB
                const matchedQuestion = findMatchingQuestion(sentenceText, extensionQuestions);

                if (matchedQuestion) {
                    console.log('[Tailieu FillBlank] ✓ Match found for:', sentenceText.substring(0, 50));

                    // Parse đáp án
                    const answers = parseNumberedAnswers(matchedQuestion.answer);
                    const blankCount = countBlanks(sentenceText) || inputElements.length;

                    // Highlight câu và đề xuất đáp án (truyền autoSelectEnabled)
                    highlightFillBlankQuestion(element, sentenceText, answers, inputElements, autoSelectEnabled);

                    results.push({
                        sentence: sentenceText,
                        matchedQuestion: matchedQuestion.question,
                        answers: answers,
                        blankCount: blankCount,
                        element: element,
                        inputElements: inputElements,
                        autoFilled: autoSelectEnabled
                    });
                } else {
                    console.log('[Tailieu FillBlank] ✗ No match for:', sentenceText.substring(0, 50));
                }
            });
        });

        console.log('[Tailieu FillBlank] Tổng cộng', results.length, 'câu được match');

        // Nếu autoSelectEnabled và có kết quả, log số input đã được tự động điền
        if (autoSelectEnabled && results.length > 0) {
            const totalAutoFilled = results.reduce((sum, r) => sum + (r.inputElements?.length || 0), 0);
            console.log('[Tailieu FillBlank] Đã tự động điền', totalAutoFilled, 'input fields');
        }

        return results;
    }

    /**
     * Clean reading passages and instructions from text
     */
    function cleanFillBlankContext(text) {
        if (!text) return text;

        const markers = [
            'Choose the best answer',
            'Choose the correct answer',
            'Select the best answer',
            'Select the correct answer',
            'Chọn câu trả lời đúng nhất',
            'Chọn đáp án đúng nhất',
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

        // Remove .mp3 or similar audio references if they appear at the start
        const audioExtensions = ['.mp3', '.wav', '.ogg'];
        for (const ext of audioExtensions) {
            const idx = processedText.lastIndexOf(ext);
            if (idx !== -1) {
                const afterAudio = processedText.substring(idx + ext.length).trim();
                if (afterAudio.length > 5) {
                    processedText = afterAudio;
                }
            }
        }

        for (const marker of markers) {
            const regex = new RegExp(marker, 'gi');
            const matches = [...processedText.matchAll(regex)];

            if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                const contentAfter = processedText.substring(lastMatch.index + lastMatch[0].length).trim();

                // Only keep if content after is meaningful (length > 5 and has alphanumeric)
                if (contentAfter.length > 5 && /[a-zA-Z0-9]/.test(contentAfter)) {
                    processedText = contentAfter;
                }
            }
        }

        return processedText;
    }

    /**
     * Trích xuất text của một row/sentence có input fields
     * Thay input bằng placeholder "..." để tạo câu chuẩn hóa
     * @param {Element} element - Row element chứa text và input
     * @returns {{text: string, inputs: Array}} 
     */
    function extractSentenceWithInputs(element) {
        if (!element) return { text: '', inputs: [] };

        // Lấy actual inputs từ element gốc TRƯỚC
        const actualInputs = element.querySelectorAll('input[type="text"], input:not([type]), textarea, select');

        if (actualInputs.length === 0) {
            // Không có input, trả về text thường
            return {
                text: element.textContent?.trim() || '',
                inputs: []
            };
        }

        // Clone element để không ảnh hưởng DOM gốc
        const clone = element.cloneNode(true);

        // Xóa các feedback elements (X marks, correct/incorrect indicators)
        const feedbackEls = clone.querySelectorAll('.feedback, .feedbackspan, .incorrect, .correct, [class*="feedback"]');
        feedbackEls.forEach(fb => fb.remove());

        // Xóa các icon, images
        const icons = clone.querySelectorAll('img, svg, i.fa, .icon');
        icons.forEach(icon => icon.remove());

        // Tìm tất cả inputs trong clone và thay bằng marker
        const inputEls = clone.querySelectorAll('input[type="text"], input:not([type]), textarea, select');
        inputEls.forEach((input, idx) => {
            const marker = document.createTextNode(' ... ');
            if (input.parentNode) {
                input.parentNode.replaceChild(marker, input);
            }
        });

        // Lấy text đã chuẩn hóa
        let text = clone.textContent || '';

        // Clean up text
        text = text
            .replace(/[✓✗×✕]/g, '')  // Remove check/cross marks
            .replace(/\s+/g, ' ')
            .replace(/\s*\.\.\.\s*/g, ' ... ')
            .replace(/^\s*[a-z]\.\s*/i, '')  // Remove leading labels like "a."
            .trim();

        // Strip reading passages/instructions
        text = cleanFillBlankContext(text);

        console.log('[Tailieu FillBlank] Extracted sentence:', text.substring(0, 80), '| inputs:', actualInputs.length);

        return {
            text: text,
            inputs: Array.from(actualInputs)
        };
    }

    /**
     * Tìm tất cả section điền từ trên trang - IMPROVED VERSION
     * @returns {Array}
     */
    function findFillBlankSections() {
        const sections = [];
        console.log('[Tailieu FillBlank] Bắt đầu quét trang...');

        // ===== METHOD 1: Moodle .que containers =====
        const moodleQuestions = document.querySelectorAll('.que');
        console.log('[Tailieu FillBlank] Tìm thấy', moodleQuestions.length, 'Moodle .que containers');

        moodleQuestions.forEach((queContainer, qIdx) => {
            if (isExtensionElement(queContainer)) return;

            const qtext = queContainer.querySelector('.qtext');
            if (!qtext) return;

            const questionText = qtext.textContent?.trim() || '';
            console.log('[Tailieu FillBlank] Checking .que #' + qIdx + ':', questionText.substring(0, 60));

            // Kiểm tra xem có phải fill-blank section không
            const isFillBlank = isFillBlankSection(questionText);

            // Kiểm tra có input fields trong container không
            const allInputs = queContainer.querySelectorAll('input[type="text"], input:not([type]), textarea');
            const hasInputs = allInputs.length > 0;

            console.log('[Tailieu FillBlank] .que #' + qIdx + ': isFillBlank=' + isFillBlank + ', hasInputs=' + hasInputs + ' (' + allInputs.length + ' inputs)');

            if (isFillBlank || hasInputs) {
                // Tìm các câu riêng lẻ trong container
                const sentences = extractSentencesFromMoodleContainer(queContainer);
                console.log('[Tailieu FillBlank] Extracted', sentences.length, 'sentences from .que #' + qIdx);

                if (sentences.length > 0) {
                    sections.push({
                        instruction: questionText,
                        instructionElement: qtext,
                        sentences: sentences,
                        container: queContainer
                    });
                }
            }
        });

        // ===== METHOD 2: Look for instruction headers =====
        const headers = document.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, .qtext, .formulation, [class*="question"]');

        headers.forEach(el => {
            if (isExtensionElement(el)) return;

            const text = el.textContent?.trim() || '';

            if (isFillBlankSection(text) && text.length < 200) {
                console.log('[Tailieu FillBlank] Found instruction header:', text.substring(0, 60));

                // Tìm parent container hoặc sibling elements
                const parent = el.closest('.que, .question, .formulation, .content') || el.parentElement;

                if (parent && !sections.some(s => s.container === parent)) {
                    const sentences = extractSentencesFromMoodleContainer(parent);

                    if (sentences.length > 0) {
                        sections.push({
                            instruction: text,
                            instructionElement: el,
                            sentences: sentences,
                            container: parent
                        });
                    }
                }
            }
        });

        // ===== METHOD 3: Direct scan for rows with inputs =====
        const rowsWithInputs = document.querySelectorAll('.answer, .formulation, .ablock, [class*="answer"], tr, p, div');
        const processedElements = new Set();

        rowsWithInputs.forEach(row => {
            if (isExtensionElement(row) || processedElements.has(row)) return;

            // Check if this row has input fields
            const inputs = row.querySelectorAll('input[type="text"], input:not([type]), textarea');

            if (inputs.length > 0) {
                // Make sure this isn't already in a processed section
                const isInSection = sections.some(s => s.container && s.container.contains(row));

                if (!isInSection) {
                    const { text, inputs: inputEls } = extractSentenceWithInputs(row);

                    if (text.length > 5 && inputEls.length > 0) {
                        console.log('[Tailieu FillBlank] Found standalone row with inputs:', text.substring(0, 50));

                        // Add as standalone section
                        if (!sections.some(s => s.instruction === 'Standalone input rows')) {
                            sections.push({
                                instruction: 'Standalone input rows',
                                instructionElement: null,
                                sentences: [],
                                container: null
                            });
                        }

                        const standaloneSection = sections.find(s => s.instruction === 'Standalone input rows');
                        if (standaloneSection && !standaloneSection.sentences.some(s => s.text === text)) {
                            standaloneSection.sentences.push({
                                text: text,
                                element: row,
                                inputElements: inputEls
                            });
                        }

                        processedElements.add(row);
                    }
                }
            }
        });

        console.log('[Tailieu FillBlank] Tổng cộng', sections.length, 'sections');
        return sections;
    }

    /**
     * Trích xuất câu từ Moodle container - IMPROVED
     * @param {Element} container 
     * @returns {Array}
     */
    function extractSentencesFromMoodleContainer(container) {
        const sentences = [];
        const seenTexts = new Set();

        // ===== Moodle Gapfill / Cloze structure =====
        // Moodle thường có các subquestion trong .answer hoặc .formulation

        // Method 1: Look for Moodle subquestion containers
        const subQuestions = container.querySelectorAll(
            '.subq, .sub, [class*="subquestion"], ' +
            '.answer > p, .answer > div, .answer > tr, ' +
            '.formulation > p, .formulation > div, ' +
            '.ablock > p, .ablock > div'
        );

        console.log('[Tailieu FillBlank] Found', subQuestions.length, 'potential subquestion elements');

        if (subQuestions.length > 0) {
            subQuestions.forEach((row, idx) => {
                if (isExtensionElement(row)) return;

                // Kiểm tra có input không
                const inputs = row.querySelectorAll('input[type="text"], input:not([type]), textarea, select');

                if (inputs.length > 0) {
                    const { text, inputs: inputEls } = extractSentenceWithInputs(row);

                    // Bỏ qua nếu text quá ngắn
                    if (text.length < 3) return;

                    // Tránh duplicate
                    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
                    if (seenTexts.has(normalizedText)) return;
                    seenTexts.add(normalizedText);

                    console.log('[Tailieu FillBlank] Subquestion #' + idx + ':', text.substring(0, 60), '(' + inputEls.length + ' inputs)');

                    sentences.push({
                        text: text,
                        element: row,
                        inputElements: inputEls
                    });
                }
            });
        }

        // Method 2: If no subquestions found, look for rows containing inputs directly
        if (sentences.length === 0) {
            // Scan all elements that might contain input fields
            const allElements = container.querySelectorAll('*');
            const inputContainers = new Set();

            // Find the immediate parent of each input
            const inputs = container.querySelectorAll('input[type="text"], input:not([type]), textarea, select');
            inputs.forEach(input => {
                // Find the most specific container for this input
                let parent = input.parentElement;
                while (parent && parent !== container) {
                    const siblingInputs = parent.querySelectorAll('input[type="text"], input:not([type]), textarea, select');
                    // If this parent contains multiple inputs and has meaningful text, use it
                    if (siblingInputs.length >= 1 && parent.textContent.trim().length > 5) {
                        inputContainers.add(parent);
                        break;
                    }
                    parent = parent.parentElement;
                }
            });

            console.log('[Tailieu FillBlank] Found', inputContainers.size, 'input containers via Method 2');

            inputContainers.forEach(row => {
                if (isExtensionElement(row)) return;

                const { text, inputs: inputEls } = extractSentenceWithInputs(row);

                if (text.length < 3 || inputEls.length === 0) return;

                const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
                if (seenTexts.has(normalizedText)) return;
                seenTexts.add(normalizedText);

                sentences.push({
                    text: text,
                    element: row,
                    inputElements: inputEls
                });
            });
        }

        // Method 3: Nếu vẫn không tìm thấy, thử extract toàn bộ container
        if (sentences.length === 0) {
            const allInputs = container.querySelectorAll('input[type="text"], input:not([type]), textarea, select');

            if (allInputs.length > 0) {
                const { text, inputs } = extractSentenceWithInputs(container);

                if (text.length > 10) {
                    console.log('[Tailieu FillBlank] Using full container text:', text.substring(0, 60));
                    sentences.push({
                        text: text,
                        element: container,
                        inputElements: inputs
                    });
                }
            }
        }

        console.log('[Tailieu FillBlank] Total sentences extracted:', sentences.length);
        return sentences;
    }

    /**
     * Tìm các câu sau instruction - IMPROVED
     * @param {Element} instructionEl 
     * @returns {Array}
     */
    function findSentencesAfterInstruction(instructionEl) {
        const sentences = [];
        let currentEl = instructionEl.nextElementSibling;
        let maxLook = 20; // Limit search

        while (currentEl && maxLook > 0) {
            maxLook--;

            if (isExtensionElement(currentEl)) {
                currentEl = currentEl.nextElementSibling;
                continue;
            }

            const text = currentEl.textContent?.trim() || '';

            // Stop if we hit another instruction or header
            if (isFillBlankSection(text) || /^(câu|bài|question|section)\s*\d+/i.test(text)) {
                break;
            }

            // Check for blanks or input fields
            const inputFields = currentEl.querySelectorAll('input[type="text"], textarea');

            if (hasBlanks(text) || inputFields.length > 0) {
                sentences.push({
                    text: text,
                    element: currentEl,
                    inputElements: Array.from(inputFields)
                });
            }

            currentEl = currentEl.nextElementSibling;
        }

        return sentences;
    }

    /**
     * Trích xuất câu từ container (Moodle)
     * @param {Element} container 
     * @returns {Array}
     */
    function extractSentencesFromContainer(container) {
        const sentences = [];

        // Look for text with blanks or input fields
        const textElements = container.querySelectorAll('p, div, span, label, .formulation');

        textElements.forEach(el => {
            if (isExtensionElement(el)) return;

            const text = el.textContent?.trim() || '';
            const inputFields = el.querySelectorAll('input[type="text"], textarea');

            if ((hasBlanks(text) || inputFields.length > 0) && text.length > 5) {
                // Avoid duplicates
                const exists = sentences.some(s => s.text === text);
                if (!exists) {
                    sentences.push({
                        text: text,
                        element: el,
                        inputElements: Array.from(inputFields)
                    });
                }
            }
        });

        return sentences;
    }

    /**
     * Tìm các câu điền từ độc lập (không nằm trong section cụ thể)
     * @returns {Array}
     */
    function findStandaloneFillBlankSentences() {
        const sentences = [];
        const seenTexts = new Set();

        // Look for elements with blanks
        const allTextElements = document.querySelectorAll('p, div, span, li, td');

        allTextElements.forEach(el => {
            if (isExtensionElement(el)) return;

            const text = el.textContent?.trim() || '';

            // Skip too short or already processed
            if (text.length < 10 || seenTexts.has(text)) return;

            // Check for blanks
            if (hasBlanks(text)) {
                // Make sure this isn't an instruction
                if (!isFillBlankSection(text)) {
                    seenTexts.add(text);
                    const inputFields = el.querySelectorAll('input[type="text"], textarea');

                    sentences.push({
                        text: text,
                        element: el,
                        inputElements: Array.from(inputFields)
                    });
                }
            }
        });

        return sentences;
    }

    /**
     * Highlight câu hỏi điền từ và hiển thị đáp án gợi ý
     * @param {Element} element - Element chứa câu
     * @param {string} sentenceText - Text của câu
     * @param {Array} answers - Danh sách đáp án parsed
     * @param {Array} inputElements - Các input field trong câu
     * @param {boolean} autoSelectEnabled - Tự động điền đáp án nếu true
     */
    function highlightFillBlankQuestion(element, sentenceText, answers, inputElements, autoSelectEnabled = false) {
        if (!element) return;

        // Mark as processed
        if (element.classList.contains('tailieu-fillblank-highlighted')) {
            return;
        }
        element.classList.add('tailieu-fillblank-highlighted');

        // Apply highlight style to the sentence
        element.style.cssText += `
            background: linear-gradient(135deg, #fff3e0, #ffe0b2) !important;
            border-left: 4px solid #ff9800 !important;
            padding: 8px 12px !important;
            margin: 4px 0 !important;
            border-radius: 4px !important;
            position: relative !important;
        `;

        // ==================== AUTO-FILL LOGIC ====================
        // Nếu autoSelectEnabled = true, tự động điền đáp án vào input fields
        if (autoSelectEnabled && inputElements && inputElements.length > 0 && answers && answers.length > 0) {
            console.log('[Tailieu FillBlank] AUTO-FILL: Đang tự động điền', answers.length, 'đáp án vào', inputElements.length, 'input fields');

            inputElements.forEach((input, idx) => {
                if (answers[idx] && answers[idx].answer) {
                    // Chỉ điền nếu input chưa có giá trị
                    if (!input.value || input.value.trim() === '') {
                        input.value = answers[idx].answer;
                        input.style.backgroundColor = '#c8e6c9'; // Green tint for auto-filled
                        input.style.borderColor = '#4CAF50';

                        // Trigger events để Moodle nhận biết thay đổi
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('blur', { bubbles: true }));

                        // Mark as auto-filled
                        input.dataset.tailieuAutoFilled = 'true';

                        console.log('[Tailieu FillBlank] AUTO-FILL: Input #' + (idx + 1) + ' = "' + answers[idx].answer + '"');
                    } else {
                        console.log('[Tailieu FillBlank] AUTO-FILL: Input #' + (idx + 1) + ' đã có giá trị, bỏ qua');
                    }
                }
            });

            console.log('[Tailieu FillBlank] AUTO-FILL: Đã tự động điền các đáp án.');
        }
        // ==================== END AUTO-FILL LOGIC ====================

        // Create answer badges for each input (instead of one big tooltip)
        if (inputElements && inputElements.length > 0) {
            displayAnswerBadges(inputElements, answers);
        }

        console.log('[Tailieu FillBlank] Highlighted:', sentenceText.substring(0, 50), 'with', answers.length, 'answers', autoSelectEnabled ? '(auto-filled)' : '(manual)');
    }

    /**
     * Tạo tooltip hiển thị đáp án
     * @param {Array} answers - Danh sách đáp án
     * @param {Array} inputElements - Các input elements
     * @returns {Element}
     */
    function createAnswerTooltip(answers, inputElements) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tailieu-fillblank-tooltip';

        tooltip.style.cssText = `
            position: absolute;
            right: -300px;
            top: 0;
            width: 280px;
            background: linear-gradient(135deg, #4CAF50, #8BC34A);
            color: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10001;
            font-size: 13px;
            max-height: 300px;
            overflow-y: auto;
        `;

        // Header
        const header = document.createElement('div');
        header.innerHTML = `
            <strong style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                Đáp án gợi ý:
            </strong>
        `;
        tooltip.appendChild(header);

        // Answer list
        if (answers && answers.length > 0) {
            const list = document.createElement('div');

            answers.forEach((ans, idx) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    background: rgba(255,255,255,0.2);
                    padding: 6px 10px;
                    margin: 4px 0;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;

                item.innerHTML = `
                    <span style="font-weight: bold; color: #fff;">${ans.index || (idx + 1)}.</span>
                    <span style="color: #fff;">${ans.answer}</span>
                `;

                // Click to copy/fill
                item.addEventListener('click', () => {
                    // Copy to clipboard
                    navigator.clipboard.writeText(ans.answer).then(() => {
                        showCopyFeedback(item, 'Đã copy!');
                    }).catch(() => {
                        showCopyFeedback(item, 'Copy failed');
                    });

                    // Try to fill corresponding input
                    if (inputElements && inputElements[idx]) {
                        inputElements[idx].value = ans.answer;
                        inputElements[idx].style.backgroundColor = '#e8f5e9';
                        inputElements[idx].dispatchEvent(new Event('input', { bubbles: true }));
                        inputElements[idx].dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // Hover effect
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255,255,255,0.4)';
                    item.style.transform = 'translateX(5px)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'rgba(255,255,255,0.2)';
                    item.style.transform = 'translateX(0)';
                });

                list.appendChild(item);
            });

            tooltip.appendChild(list);
        } else {
            tooltip.innerHTML += '<div style="opacity: 0.8;">Không có đáp án</div>';
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            opacity: 0.7;
        `;
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltip.style.display = 'none';
        });
        tooltip.appendChild(closeBtn);

        // Toggle visibility
        tooltip.dataset.visible = 'true';

        return tooltip;
    }

    /**
     * Hiển thị các badge đáp án trực tiếp bên cạnh input
     */
    function displayAnswerBadges(inputElements, answers) {
        inputElements.forEach((input, idx) => {
            if (input.dataset.tailieuBadgeAdded) return;
            input.dataset.tailieuBadgeAdded = 'true';

            if (answers[idx]) {
                const badge = document.createElement('span');
                badge.className = 'tailieu-answer-badge';
                badge.textContent = answers[idx].answer;
                badge.style.cssText = `
                    display: inline-block;
                    margin-left: 8px;
                    padding: 2px 8px;
                    background: #4CAF50;
                    color: white;
                    border-radius: 4px;
                    font-size: 13px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    cursor: pointer;
                    transition: all 0.2s;
                    z-index: 1000;
                    vertical-align: middle;
                    white-space: nowrap;
                `;

                badge.title = 'Nhấn để điền đáp án';

                badge.addEventListener('click', (e) => {
                    e.preventDefault();
                    input.value = answers[idx].answer;
                    input.style.backgroundColor = '#e8f5e9';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));

                    // Visual feedback
                    badge.style.transform = 'scale(0.9)';
                    setTimeout(() => badge.style.transform = 'scale(1)', 100);
                });

                // Insert after input or sibling button
                const target = input.nextSibling || input;
                input.parentNode.insertBefore(badge, target);

                // Style the input too
                input.style.border = '2px solid #4CAF50';
                input.style.backgroundColor = '#f1f8e9';
            }
        });
    }

    /**
     * Thêm helper buttons cho các input fields
     * @param {Array} inputElements 
     * @param {Array} answers 
     */
    function addInputHelpers(inputElements, answers) {
        // This function is now mostly superseded by displayAnswerBadges
        // but we keep it and just call displayAnswerBadges or leave as is.
        displayAnswerBadges(inputElements, answers);
    }

    /**
     * Hiển thị feedback khi copy
     * @param {Element} element 
     * @param {string} message 
     */
    function showCopyFeedback(element, message) {
        const originalBg = element.style.background;
        element.style.background = 'rgba(255,255,255,0.6)';

        const feedback = document.createElement('span');
        feedback.textContent = message;
        feedback.style.cssText = `
            margin-left: 8px;
            font-size: 11px;
            color: #fff;
            font-style: italic;
        `;
        element.appendChild(feedback);

        setTimeout(() => {
            element.style.background = originalBg;
            feedback.remove();
        }, 1500);
    }

    /**
     * Helper: Check if element belongs to extension
     * @param {Element} el 
     * @returns {boolean}
     */
    function isExtensionElement(el) {
        if (!el) return false;

        // Check class names and IDs
        const classAndId = (el.className || '') + ' ' + (el.id || '');
        if (/tailieu|extension/i.test(classAndId)) return true;

        // Check parent elements
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            const parentClassAndId = (parent.className || '') + ' ' + (parent.id || '');
            if (/tailieu|extension/i.test(parentClassAndId)) return true;
            parent = parent.parentElement;
            depth++;
        }

        return false;
    }

    // ==================== AUTO-FILL FUNCTIONALITY ====================

    /**
     * Tự động điền tất cả đáp án vào các input field
     * @param {Array} results - Kết quả từ processFillBlankQuestions
     */
    function autoFillAllAnswers(results) {
        let filledCount = 0;

        results.forEach(result => {
            if (result.inputElements && result.answers) {
                result.inputElements.forEach((input, idx) => {
                    if (result.answers[idx] && !input.value) {
                        input.value = result.answers[idx].answer;
                        input.style.backgroundColor = '#e8f5e9';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        filledCount++;
                    }
                });
            }
        });

        console.log('[Tailieu FillBlank] Auto-filled', filledCount, 'inputs');
        return filledCount;
    }

    // ==================== EXPORT TO GLOBAL SCOPE ====================

    // Export functions for use by content.js and other modules
    window.TailieuFillBlank = {
        // Detection functions
        isFillBlankSection,
        hasBlanks,
        countBlanks,

        // Extraction
        extractSentenceWithInputs,

        // Normalization and comparison
        normalizeForBlankComparison,
        areFillBlankSentencesSimilar,
        calculateFillBlankSimilarity,
        checkWordsMatch,

        // Answer parsing
        parseNumberedAnswers,

        // Main processing
        findMatchingQuestion,
        processFillBlankQuestions,
        findFillBlankSections,
        extractSentencesFromMoodleContainer,

        // UI/Highlighting
        highlightFillBlankQuestion,

        // Auto-fill
        autoFillAllAnswers,

        // Debug function - manually trigger scan
        debugScan: function () {
            console.log('=== TAILIEU FILL-BLANK DEBUG SCAN ===');
            const sections = findFillBlankSections();
            console.log('Found sections:', sections.length);
            sections.forEach((s, i) => {
                console.log('Section #' + i + ':', s.instruction?.substring(0, 50));
                console.log('  Sentences:', s.sentences.length);
                s.sentences.forEach((sent, j) => {
                    console.log('    [' + j + ']', sent.text.substring(0, 60), '| inputs:', sent.inputElements.length);
                });
            });
            return sections;
        }
    };

    // ==================== INTEGRATION WITH CONTENT.JS ====================

    /**
     * Hook into content.js comparison process
     * Called when compareAndHighlightQuestions runs
     */
    function integrateWithCompareProcess() {
        // Store original compare function reference if exists
        const originalCompare = window.compareAndHighlightQuestions;

        // Override or extend the compare function
        window.extendedCompareWithFillBlank = async function (extensionQuestions, isManual = false) {
            // First, run fill-blank processing
            const fillBlankResults = processFillBlankQuestions(extensionQuestions);

            // Return results for potential use
            return {
                fillBlankMatches: fillBlankResults,
                fillBlankCount: fillBlankResults.length
            };
        };
    }

    // Initialize integration when content.js is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', integrateWithCompareProcess);
    } else {
        integrateWithCompareProcess();
    }

    console.log('[Tailieu FillBlank] Module initialized and ready v1.1');

})();
