// Content script for Tailieu Questions Extension
// Prevent multiple script injections
if (window.tailieuExtensionLoaded) {
    // Already loaded, skip
} else {
    window.tailieuExtensionLoaded = true;

    // Ensure basic DOM safety by waiting for document to be available
    if (!document) {
        throw new Error('Document not available');
    }

    // Store questions from extension for comparison
    let extensionQuestions = [];
    let lastMatchedQuestions = []; // Lưu trữ danh sách câu hỏi đã so sánh thành công
    let currentPopupTab = 'all'; // 'all' hoặc 'matched'
    let answerHighlightingEnabled = false; // New setting (default OFF)
    // Expose runtime flag on window so other modules (fill-blank handler) can read it
    try { window.answerHighlightingEnabled = answerHighlightingEnabled; } catch (e) { }
    let autoSelectEnabled = false; // New setting: controls automatic selection/compare (default OFF)
    // Track what QA pairs were highlighted in the current run
    let highlightedQA = [];

    // Cache key for questions
    const QUESTIONS_CACHE_KEY = 'tailieu_questions';

    // Debug flags and throttling
    let isComparing = false;
    let lastCompareTime = 0;
    const COMPARE_DEBOUNCE_MS = 1000; // 1 second (reduced from 2 seconds for better UX)
    const MANUAL_COMPARE_DEBOUNCE_MS = 500; // 0.5 second for manual clicks (faster response)
    let debugMode = true; // Set to true to enable logs for debugging
    // Expose debug flag to other content scripts (scanner etc.)
    window.debugMode = debugMode;

    // Override console methods if NOT in debug mode to silent the extension
    if (!debugMode) {
        const noop = () => { };
        console.log = noop;
        console.warn = noop;
        console.error = noop;
        console.debug = noop;
        console.info = noop;
    }

    // Debug logging function
    function debugLog(...args) {
        if (debugMode) {
            // Use the original console.log if we want to log during debug
            (window._originalConsoleLog || console.log)('[Tailieu Extension]', ...args);
        }
    }

    // Enforce strict exact-match for answers when true.
    // This makes the extension require answers to match 100% (ignoring punctuation)
    const STRICT_ANSWER_EXACT_MATCH = true;

    // Normalize text for strict exact comparison: lowercases, removes common punctuation, collapses whitespace
    function normalizeForExactMatch(text) {
        if (!text) return '';
        try {
            let s = text.toString();
            // Normalize unicode to composed form
            if (s.normalize) s = s.normalize('NFC');
            // Convert to lower case
            s = s.toLowerCase();

            // CHUẨN HÓA URL ẢNH: Chuyển các URL về dạng chỉ có tên file và loại bỏ query params (?token=...)
            // regex này bắt link trong ngoặc kép, lấy phần sau dấu / cuối cùng và trước dấu ? hoặc "
            s = s.replace(/"(?:https?:\/\/[^"]+\/|(?:\.){3,}\/)([^"?]+)(?:\?[^"]*)?"/gi, (match, filename) => {
                return ' ' + filename + ' ';
            });

            // Replace various invisible / non-breaking spaces with normal space
            s = s.replace(/[\u00A0\u2000-\u200B\uFEFF\u202F]/g, ' ');
            // Replace apostrophes and similar characters with space FIRST
            s = s.replace(/[''`´]/g, ' ');
            // Remove common leading answer labels like "a.", "b)", "c -" etc.
            // Strictly limited to a-d and 0-9 followed by a separator and SPACE to protect proper nouns like "With" or "Nicole's"
            s = s.replace(/^[a-dA-D0-9]\s*[\.)\-:\/]\s+/u, '');
            // Remove any characters that are not letters, numbers, whitespace or ESSENTIAL math symbols
            // Bảo tồn các ký tự toán học và dấu chấm (.) trong tên file ảnh sau khi đã xử lý ở trên
            s = s.replace(/[^\p{L}\p{N}\s<>=≤≥≠±\+\-\*\/%^|{}\(\)\[\],.]/gu, ' ');

            // CHUẨN HÓA MATHML/CÔNG THỨC TOÁN
            s = s.replace(/\b([a-z0-9])\s+([a-z0-9])\s+([a-z0-9])(?:\s+([a-z0-9]))*/gi, (match) => {
                // Loại bỏ tất cả khoảng trắng trong pattern này
                return match.replace(/\s+/g, '');
            });

            // Collapse whitespace
            s = s.replace(/\s+/g, ' ').trim();
            return s;
        } catch (e) {
            return '';
        }
    }

    // Helper: So sánh 2 chuỗi đã normalize, bao gồm fallback loại bỏ tất cả khoảng trắng
    // Hữu ích cho các câu hỏi có MathML (công thức toán) với khoảng trắng không nhất quán
    function compareNormalized(s1, s2) {
        if (!s1 || !s2) return false;

        // Normalize for compare: lower, NFKC, collapse spaces
        function normalizeForCompare(str) {
            let s = String(str || '');
            try { if (s.normalize) s = s.normalize('NFKC'); } catch (e) { }
            s = s.toLowerCase();
            // collapse whitespace
            s = s.replace(/\s+/g, ' ').trim();

            // Make a diacritics-stripped, punctuation-removed key for robust compare
            let key = s;
            try {
                // NFD + remove combining marks
                if (key.normalize) key = key.normalize('NFD').replace(/\p{M}/gu, '');
            } catch (e) { key = key.replace(/[\u0300-\u036f]/g, ''); }

            // Remove punctuation but keep letters/numbers/space
            try {
                key = key.replace(/[^\p{L}\p{N}\s]/gu, '');
            } catch (e) {
                key = key.replace(/[^A-Za-z0-9\s]/g, '');
            }

            key = key.replace(/\s+/g, ' ').trim();
            return { raw: s, key };
        }

        const A = normalizeForCompare(s1);
        const B = normalizeForCompare(s2);

        if (!A.key || !B.key) return false;

        // 1) exact (already normalized)
        if (A.key === B.key) return true;

        // 2) ignore ALL spaces
        if (A.key.replace(/\s+/g, '') === B.key.replace(/\s+/g, '') && A.key.replace(/\s+/g, '').length > 0) return true;

        // 3) substring containment (one contains other)
        if (A.key.includes(B.key) || B.key.includes(A.key)) return true;

        // 4) fuzzy match via Levenshtein distance (relative threshold)
        function levenshtein(a, b) {
            if (a === b) return 0;
            const al = a.length, bl = b.length;
            if (al === 0) return bl;
            if (bl === 0) return al;
            const v0 = new Array(bl + 1).fill(0);
            const v1 = new Array(bl + 1).fill(0);
            for (let j = 0; j <= bl; j++) v0[j] = j;
            for (let i = 0; i < al; i++) {
                v1[0] = i + 1;
                for (let j = 0; j < bl; j++) {
                    const cost = a[i] === b[j] ? 0 : 1;
                    v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
                }
                for (let j = 0; j <= bl; j++) v0[j] = v1[j];
            }
            return v1[bl];
        }

        try {
            const lev = levenshtein(A.key, B.key);
            const maxLen = Math.max(A.key.length, B.key.length) || 1;
            const ratio = lev / maxLen;
            // Accept up to 15% difference (tunable). Also allow small absolute distance for short strings.
            if (ratio <= 0.15 || lev <= 2) return true;
        } catch (e) {
            // ignore errors and fallback to false
        }

        return false;
    }

    // Create a strict key for answer comparison: remove all non-letter/number characters
    // and collapse to a continuous lowercase string. This ensures answers only match
    // when they are identical in content ignoring punctuation and whitespace.
    function normalizeAnswerKey(text) {
        const s = normalizeForExactMatch(text || '');
        if (!s) return '';
        try {
            // Remove diacritics (unicode combining marks) to treat accents as equal
            let key = s;
            try {
                if (key.normalize) key = key.normalize('NFD').replace(/\p{M}/gu, '');
            } catch (e) {
                key = key.replace(/[\u0300-\u036f]/g, '');
            }
            // Remove any non-letter/number characters and collapse
            // Preserve math symbols to distinguish inequalities (e.g. < vs <=)
            return key.replace(/[^\p{L}\p{N}<>=≤≥≠±\+\-\*\/%^|{}\(\)\[\],.]/gu, '').toLowerCase();
        } catch (e) {
            // Fallback for environments without Unicode property escapes
            try {
                let key = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s.replace(/[\u0300-\u036f]/g, '');
                return key.replace(/[^A-Za-z0-9<>=≤≥≠±\+\-\*\/%^|{}\(\)\[\],.]/g, '').toLowerCase();
            } catch (e2) {
                return s.replace(/[^A-Za-z0-9<>=≤≥≠±\+\-\*\/%^|{}\(\)\[\],.]/g, '').toLowerCase();
            }
        }
    }

    // For questions we apply the same strict key normalization as answers.
    // This removes diacritics and all non-alphanumeric characters so that
    // comparisons only consider the raw Vietnameses letters/numbers sequence.
    function normalizeQuestionKey(text) {
        return normalizeAnswerKey(text);
    }

    // Helper to clean question text (strip reading passages and prefixes)
    function cleanQuestionContent(text, element = null) {
        if (!text) return '';

        // 1. Loại bỏ đoạn văn đọc hiểu nếu có marker
        const markers = [
            'Choose the best answer',
            'Choose the correct answer',
            'Select the best answer',
            'Select the correct answer',
            'Chọn câu trả lời đúng nhất',
            'Chọn đáp án đúng nhất',
            'Chọn một câu trả lời',
            'Chọn câu trả lời',
            'Choose one answer',
            'Trả lời câu hỏi',
            'Answer the question',
            'Are these following sentences true \\(T\\) or false \\(F\\)',
            'Are these following sentences true or false',
            'Are the following sentences true or false',
            'True or False',
            'True \\(T\\) or false \\(F\\)',
            'Read the text and do the activities that follow',
            'Choose A, B, C or D to complete the following sentence:',
            'Choose A, B, C or D to complete the sentence:',
            'Choose A, B, C, or D to complete the following sentence:',
            'Choose the lettered word or phrase'
        ];

        let processedText = text;

        // New logic: Ưu tiên <ol> hoặc <ul> nếu có (dạng list sub-questions/cloze)
        // Nếu có list, thường các paragraph <p> bên ngoài là đoạn văn đọc hiểu (passage)
        if (element) {
            // XỬ LÝ CÂU HỎI CÓ AUDIO:
            const audioEl = element.querySelector('.mediaplugin, audio, .mediafallbacklink');
            if (audioEl) {
                let audioNode = audioEl;
                while (audioNode && audioNode.parentElement !== element) audioNode = audioNode.parentElement;
                if (audioNode) {
                    const followingNodes = [];
                    let next = audioNode.nextSibling;
                    while (next) {
                        if (next.nodeType === Node.ELEMENT_NODE || (next.nodeType === Node.TEXT_NODE && next.textContent.trim())) {
                            followingNodes.push(next);
                        }
                        next = next.nextSibling;
                    }
                    if (followingNodes.length > 0) {
                        const afterAudioText = followingNodes.map(node => {
                            if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
                            return (typeof window.tailieuContentImageHandler !== 'undefined') ?
                                window.tailieuContentImageHandler.getElementVisibleTextWithImages(node) :
                                (node.textContent || '');
                        }).filter(Boolean).join(' ').trim();
                        if (afterAudioText.length > 5) processedText = afterAudioText;
                    }
                }
            }

            const listEls = element.querySelectorAll('ol, ul');
            if (listEls.length > 0 && processedText === text) {
                const liTexts = [];
                listEls.forEach(list => {
                    const lis = list.querySelectorAll('li');
                    lis.forEach(li => {
                        // Sử dụng image handler để lấy text và ảnh đầy đủ trong li
                        const liText = (typeof window.tailieuContentImageHandler !== 'undefined') ?
                            window.tailieuContentImageHandler.getElementVisibleTextWithImages(li) :
                            (li.textContent || '').trim();
                        if (liText) liTexts.push(liText);
                    });
                });

                if (liTexts.length > 0) {
                    const joinedLiText = liTexts.join(' . ').trim();
                    if (joinedLiText.length > 10) {
                        processedText = joinedLiText;
                    }
                }
            }
        }

        // 0. Remove audio player scripts / CDATA
        if (processedText.includes('//]]>')) {
            const parts = processedText.split('//]]>');
            if (parts.length > 1) {
                const afterScript = parts[parts.length - 1].trim();
                // If the part after script seems valid (has content)
                if (afterScript.length > 5) {
                    processedText = afterScript;
                }
            }
        }

        // Handle audio file references smartly: prefer the question text AFTER the audio file when it looks like the real question (e.g., contains blanks, question words or punctuation).
        // Otherwise, pick a cleaned sentence BEFORE the audio and strip generic "listen" prompts like "Listen." or "Then listen again.".
        try {
            const audioPattern = /\b(?:track\s*[^\s]*|[\w%\-\.]+)\.(mp3|wav|ogg)\b/i;
            const audioMatch = processedText.match(audioPattern);
            if (audioMatch) {
                const idx = processedText.search(audioPattern);
                const before = processedText.slice(0, idx).trim();
                const after = processedText.slice(idx + audioMatch[0].length).trim();

                function isQuestionLike(s) {
                    if (!s) return false;
                    const t = s.trim();
                    if (t.length < 5) return false;
                    if (/[?？]/.test(t)) return true;
                    if (/_{2,}/.test(t) || /___/.test(t)) return true; // blanks
                    if (/\b(is interested in|is interested|is known as|complete|complete each|best completes|main idea|which|who|what|when|where|why|how|choose|chọn|circle|select|hoàn thành)\b/i.test(t)) return true;
                    return false;
                }

                function stripListenPrompt(s) {
                    return s.replace(/^(listen|then listen( again)?|nghe|nghe lại|lắng nghe)[\.:,\-\s]*/i, '').trim();
                }

                if (isQuestionLike(after)) {
                    // Use the question-like content after the audio file
                    processedText = after;
                    // debugLog('[Tailieu Extension] Chose post-audio text for question extraction:', processedText);
                } else {
                    // Choose the best sentence from the part before the audio
                    // Split into sentences by newline or punctuation, prefer the last meaningful sentence
                    const sentences = before.split(/\r?\n|\/|(?<=[.!?])\s+/);
                    let chosen = '';
                    for (let i = sentences.length - 1; i >= 0; i--) {
                        const s = sentences[i].trim();
                        if (s.length <= 1) continue;
                        if (isQuestionLike(s) || s.length > 12) { chosen = s; break; }
                    }
                    if (!chosen) chosen = before;
                    processedText = stripListenPrompt(chosen);
                    // debugLog('[Tailieu Extension] Chose pre-audio text for question extraction:', processedText);
                }
            }
        } catch (e) {
            // If anything goes wrong here, fall back to the original processedText
            console.warn('[Tailieu Extension] audio extraction helper error', e);
        }

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

        // Feedback markers that often appear after the question text (e.g., 'Đáp án đúng là', 'Bạn chọn')
        const feedbackMarkers = [
            'Đáp án đúng là',
            'Đáp án:',
            'Câu trả lời đúng là',
            'Bạn chọn',
            'Bạn chọn:',
            'Answer is',
            'Correct answer',
            'Đáp án chính xác là'
        ];

        const textLower = processedText.toLowerCase();
        for (const marker of titleMarkers) {
            if (textLower.includes(marker.toLowerCase())) {
                const markerIdx = textLower.indexOf(marker.toLowerCase());
                const endOfMarker = markerIdx + marker.length;

                // Keep the part until the end of the marker (the instruction)
                const afterMarker = processedText.substring(endOfMarker);
                const firstSentenceMatch = afterMarker.match(/^[.\s:\n\r-]*/);
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



        try {
            if (typeof feedbackMarkers !== 'undefined' && feedbackMarkers.length > 0) {
                for (const fbm of feedbackMarkers) {
                    const idx = processedText.toLowerCase().indexOf(fbm.toLowerCase());
                    if (idx > 5) { // ensure not cutting off extremely short text
                        const before = processedText.substring(0, idx).trim();
                        if (before.length > 5) {
                            processedText = before;
                            break;
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }

        for (const marker of markers) {
            const regex = new RegExp(marker, 'gi');
            const matches = [...processedText.matchAll(regex)];

            if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                const lastIndex = lastMatch.index;
                const contentAfter = processedText.substring(lastIndex + lastMatch[0].length).trim();
                const contentBefore = processedText.substring(0, lastIndex).trim();

                // Detect if contentAfter looks like an answer list or instruction for answers
                const looksLikeAnswerList = /(^|\n)\s*([A-Da-d]|\d+)[\.\)]\s+/m.test(contentAfter)
                    || /(^|\n)\s*a\.\s+/im.test(contentAfter)
                    || /\b(chọn|choose|select|circle|tick|đáp án)\b/i.test(contentAfter);

                if (looksLikeAnswerList && contentBefore.length > 5) {
                    // Result is the last meaningful segment of contentBefore (stripping reading passage)
                    const segments = contentBefore.split(/\r?\n|(?<=[.!?]['"”’]*)\s+(?=[A-Z])/);
                    const lastSegment = segments[segments.length - 1].trim();
                    if (lastSegment.length > 5) {
                        processedText = lastSegment;
                        break;
                    }
                }

                if (contentAfter.length > 5 && /[a-zA-Z0-9]/.test(contentAfter)) {
                    processedText = contentAfter;
                    break;
                }
            }
        }

        // 3. Handle Case: Passage + Question (Long text)
        // Chỉ áp dụng logic rút trích khi văn bản thực sự dài (> 800 ký tự)
        // Đặt sau markers loop để xử lý phần text đã được lọc bớt instruction
        if (processedText.length > 800) {
            const blankRegex = /([_.‥…\u2026]{2,}|_{2,}|(\.\s*){3,}|\[\s*\]|\(\s*\))/;

            // Ưu tiên 1: Thẻ bold ở cuối container (Thường là câu hỏi chính)
            if (element) {
                const boldEls = element.querySelectorAll('strong, b');
                if (boldEls.length > 0) {
                    const lastBold = boldEls[boldEls.length - 1];
                    // Chuẩn hóa text: xóa non-breaking spaces và khoảng trắng thừa
                    const boldTextRaw = (lastBold.textContent || '').replace(/[\u00A0\s]+/g, ' ').trim();
                    const pTextRaw = processedText.replace(/[\u00A0\s]+/g, ' ').trim();

                    // Nếu thẻ bold nằm ở cuối (hoặc rất gần cuối) và đủ dài
                    if (boldTextRaw.length > 15 && pTextRaw.endsWith(boldTextRaw)) {
                        return lastBold.textContent.trim();
                    }
                }
            }

            // Ưu tiên 2: Phân tách câu và tìm từ khóa câu hỏi ở đoạn cuối
            const segments = processedText.split(/(?<=[.!?]['"”’]*)\s+(?=[A-Z])/);
            if (segments.length >= 2) {
                const lastSegment = segments[segments.length - 1].trim();
                if (lastSegment.length > 15 && lastSegment.length < 500 && lastSegment.length < processedText.length * 0.4) {
                    const qKeywords = /^(Which|What|Who|When|Where|Why|How|Is|Are|Do|Does|Did|Can|Could|It is probable|According to|In paragraph|The passage|The author|The word|The purpose|From|Based on|It can be|The statement|The phrase)/i;
                    if (qKeywords.test(lastSegment) || /[?？]/.test(lastSegment) || blankRegex.test(lastSegment)) {
                        processedText = lastSegment;
                    }
                }
            } else {
                // Fallback: Nếu không tách được câu, tìm dòng cuối có chứa ô trống
                const matches = processedText.match(new RegExp(blankRegex.source, 'g'));
                if (matches && matches.length <= 3) {
                    const lines = processedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                    if (lines.length > 1) {
                        const lastLine = lines[lines.length - 1];
                        if (blankRegex.test(lastLine) && lastLine.length < 500) {
                            processedText = lastLine;
                        }
                    }
                }
            }
        }

        // 2. Remove Prefix
        processedText = processedText.replace(/^(Câu\s*\d+[:\.\)\s]*|Bài\s*\d+[:\.\)\s]*|Question\s*\d+[:\.\)\s]*|\d+[\.\)]\s*)/i, '').trim();

        // Final sanitization: remove leading codes but PRESERVE trailing blanks (dots, underscores, ellipsis)
        // We only strip trailing punctuation that is NOT part of a potential blank.
        // BẢO VỆ các ký tự ô trống (underscores, dots, ellipsis) và dấu nháy ở đầu câu
        processedText = processedText.replace(/^\s*[^A-Za-z0-9À-ʯ\u0400-\u04FF\._\?!\u2026"\[\(\s]+/, '').trim();
        // Only strip trailing junk if it doesn't end with 2+ dots or underscores
        if (!/[\._\u2026]{2,}\s*$/.test(processedText)) {
            processedText = processedText.replace(/[^A-Za-z0-9À-ʯ\u0400-\u04FF\._\?!,;:\u2026\s"]+\s*$/, '').trim();
        }

        // Final integrity check: Nếu làm sạch xong mà quá ngắn, hoặc không còn chữ, thì trả về bản gốc (đã được làm sạch cơ bản)
        if (processedText.length < 5 && originalText.length > 5) {
            return originalText.replace(/<\/?(CDATA|audio)[^>]*>/gi, '').trim();
        }

        return processedText || originalText.trim();
    }

    // Generate candidate question variants (handles audio prompts like Track*.mp3 and 'Listen' instructions)
    function generateQuestionVariants(rawText, cleanedText = null) {
        try {
            const variants = new Set();
            const raw = (rawText || '').toString().trim();
            const cleaned = (cleanedText || cleanQuestionContent(raw)).toString().trim();

            function stripListenPrompt(s) {
                return s.replace(/^(listen|then listen( again)?|nghe|nghe lại|lắng nghe)[\.:,\-\s]*/i, '').trim();
            }

            function splitSentences(s) {
                if (!s) return [];
                return s.split(/\r?\n|\/|(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
            }

            // Base variants
            if (cleaned) variants.add(cleaned);
            const stripped = stripListenPrompt(cleaned);
            if (stripped) variants.add(stripped);

            // Remove common trailing track markers
            const noTrack = raw.replace(/(Track[^\s\n\r]*|[\w%\-\.]+\.(mp3|wav|ogg))(\s*\/{2,})?/ig, '').trim();
            if (noTrack) {
                const noTrackClean = cleanQuestionContent(noTrack);
                if (noTrackClean) variants.add(noTrackClean);
                variants.add(stripListenPrompt(noTrackClean || noTrack));
            }

            // Prefer content after audio file if available and looks question-like
            const audioPattern = /\b(?:track\s*[^\s]*|[\w%\-\.]+)\.(mp3|wav|ogg)\b/i;
            const audioMatch = raw.match(audioPattern);
            if (audioMatch) {
                const idx = raw.search(audioPattern);
                const before = raw.slice(0, idx).trim();
                const after = raw.slice(idx + audioMatch[0].length).trim();

                // Add sentences from after (likely the real question)
                splitSentences(after).forEach(s => {
                    if (s.length > 3) variants.add(stripListenPrompt(s));
                });

                // Add last meaningful sentence from before (often instruction like "Listen. Circle...")
                const beforeSentences = splitSentences(before);
                for (let i = beforeSentences.length - 1; i >= 0; i--) {
                    const s = beforeSentences[i];
                    if (s.length > 8) { variants.add(stripListenPrompt(s)); break; }
                }
            }

            // Final normalization - keep only unique and reasonable length variants
            const final = Array.from(variants).map(v => v.trim()).filter(v => v && v.length > 3);
            return Array.from(new Set(final));
        } catch (e) {
            console.warn('[Tailieu Extension] generateQuestionVariants error', e);
            return rawText ? [rawText] : [];
        }
    }

    // Load cached questions when page loads (Wait for window load to avoid overloading)
    function initializeContentScript() {
        (async () => {
            await loadCachedQuestions();
            // Restore auto-select preference from storage if available
            try {
                if (chrome?.storage?.local) {
                    chrome.storage.local.get('tailieu_auto_select', (res) => {
                        if (res && typeof res.tailieu_auto_select !== 'undefined') {
                            autoSelectEnabled = !!res.tailieu_auto_select;
                        }
                    });
                    // Restore highlight preference (default: OFF)
                    chrome.storage.local.get('tailieu_highlight_answers', (res2) => {
                        if (res2 && typeof res2.tailieu_highlight_answers !== 'undefined') {
                            answerHighlightingEnabled = !!res2.tailieu_highlight_answers;
                            try { window.answerHighlightingEnabled = answerHighlightingEnabled; } catch (e) { }
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not restore autoSelect setting', e);
            }
        })();

        // Initialize auto-compare
        initAutoCompareOnLoad();

        // Start monitoring URL changes
        monitorUrlChanges();

        // Check for outdated data
        checkDataFreshness();
    }

    // Check if cached data is outdated compared to DB
    async function checkDataFreshness() {
        try {
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ action: 'checkOutdatedData' }, (response) => {
                    if (response && response.success && response.isOutdated) {
                        // indicator function will handle showing the warning based on tailieu_db_updated flag
                        showCachedQuestionsIndicator();
                    }
                });
            }
        } catch (e) {
            console.warn('[Tailieu Extension] Error checking data freshness:', e);
        }
    }

    // Wait for page to be completely loaded (including images and subresources)
    if (document.readyState === 'complete') {
        initializeContentScript();
    } else {
        window.addEventListener('load', () => {
            // Additional small delay to ensure page stabilizes
            setTimeout(initializeContentScript, 500);
        });
    }

    // Auto-compare questions when page is fully loaded
    function initAutoCompareOnLoad() {
        // Wait for page to be completely finished
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(performAutoCompare, 1500);
            });
        } else {
            // Page is already loaded
            setTimeout(performAutoCompare, 1500);
        }

        // Also listen for dynamic content changes (only if not already observing)
        if (!window.tailieuMutationObserver) {
            let contentChangeTimer = null;
            const observer = new MutationObserver(() => {
                clearTimeout(contentChangeTimer);
                contentChangeTimer = setTimeout(performAutoCompare, 2000);
            });

            // Safely observe document.body when it's available
            function startObserving() {
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: false
                    });
                    window.tailieuMutationObserver = observer;
                } else {
                    // Wait for body to be available
                    setTimeout(startObserving, 100);
                }
            }

            startObserving();
        }
    }

    // Auto-detected document metadata
    let detectedDocumentId = null;
    let detectedDocumentName = null;
    let detectedCategoryId = null;

    // Helper: Find question in DB via background
    async function findQuestionInDB(questionText) {
        return new Promise((resolve) => {
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage(
                    { action: 'findQuestionByText', questionText },
                    (response) => {
                        if (response && response.success) {
                            resolve(response.question);
                        } else {
                            resolve(null);
                        }
                    }
                );
            } else {
                resolve(null);
            }
        });
    }

    // Helper: Load questions from a specific document via background
    async function loadQuestionsFromDocument(documentId) {
        return new Promise((resolve) => {
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage(
                    { action: 'getQuestionsByDocumentId', documentId },
                    (response) => {
                        if (response && response.success) {
                            resolve(response.questions || []);
                        } else {
                            resolve([]);
                        }
                    }
                );
            } else {
                resolve([]);
            }
        });
    }

    // Core Auto-detection logic: Try to detect document from the first question on the page
    async function detectDocumentFromPage(firstQuestionTextOrCandidates = null) {
        let candidateQuestions = [];

        // Handle input (could be a string from legacy calls or an array of questions)
        if (Array.isArray(firstQuestionTextOrCandidates)) {
            candidateQuestions = firstQuestionTextOrCandidates;
        } else if (typeof firstQuestionTextOrCandidates === 'string' && firstQuestionTextOrCandidates) {
            candidateQuestions.push({ text: firstQuestionTextOrCandidates });
        }

        // If we don't have enough candidates, scan the page
        if (candidateQuestions.length < 3) {
            try {
                const scanned = scanQuestionsOnPage();
                // Merge and deduplicate
                const scannedCandidates = scanned.filter(q => (q.text || '').length > 15 && !candidateQuestions.some(c => c.text === q.text));
                candidateQuestions = candidateQuestions.concat(scannedCandidates).slice(0, 5);
            } catch (e) {
                if (candidateQuestions.length === 0) return false;
            }
        }

        if (candidateQuestions.length === 0) return false;

        debugLog(`[Tailieu Extension] Auto-detecting document using ${candidateQuestions.length} candidates...`);

        // 1. Try EXACT matches for each candidate
        for (const qObj of candidateQuestions) {
            const cleanText = cleanQuestionText(qObj.text || '');
            if (!cleanText || cleanText.length < 10) continue;

            const question = await findQuestionInDB(cleanText);
            if (question && question.documentId) {
                debugLog('[Tailieu Extension] Detected document ID (Exact match):', question.documentId);
                return await loadAndCacheDocumentAndNotify(question.documentId);
            }
        }

        // 2. Fallback: Try FUZZY matches for candidates if exact failed
        debugLog('[Tailieu Extension] Exact match failed. Trying fuzzy search fallback...');
        updateIndicatorStatus('Tra cứu chuyên sâu...', true);
        // Limit fuzzy to top 2 to keep it fast
        for (let i = 0; i < Math.min(2, candidateQuestions.length); i++) {
            const qObj = candidateQuestions[i];
            const cleanText = cleanQuestionText(qObj.text || '');
            if (!cleanText || cleanText.length < 20) continue;

            const fuzzyMatch = await findQuestionInDBFuzzy(cleanText);
            if (fuzzyMatch && fuzzyMatch.documentId) {
                debugLog('[Tailieu Extension] Detected document ID (Fuzzy match):', fuzzyMatch.documentId);
                return await loadAndCacheDocumentAndNotify(fuzzyMatch.documentId);
            }
        }

        debugLog('[Tailieu Extension] Could not detect document from any candidate.');
        return false;
    }

    // Helper: Find question in DB via background (Fuzzy)
    async function findQuestionInDBFuzzy(questionText) {
        return new Promise((resolve) => {
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage(
                    { action: 'findQuestionsByTextFuzzy', questionText, limit: 1 },
                    (response) => {
                        if (response && response.success && response.questions && response.questions.length > 0) {
                            resolve(response.questions[0]);
                        } else {
                            resolve(null);
                        }
                    }
                );
            } else {
                resolve(null);
            }
        });
    }

    // Helper: Pre-process questions to add normalized keys for fast lookup
    function preProcessQuestions(questions) {
        if (!Array.isArray(questions)) return [];
        return questions.map(q => {
            if (q._key) return q; // Already processed
            const cleaned = cleanQuestionText(q.question || '');
            return {
                ...q,
                _cleaned: cleaned,
                _key: normalizeForExactMatch(cleaned)
            };
        });
    }

    // Helper: Load and cache document questions
    async function loadAndCacheDocumentAndNotify(documentId) {
        // If we already have this document cached and not empty, skip fetch
        if (detectedDocumentId === documentId && extensionQuestions.length > 0) {
            debugLog('[Tailieu Extension] Document already cached, skipping redundant fetch.');
            return true;
        }

        const questions = await loadQuestionsFromDocument(documentId);
        if (questions && questions.length > 0) {
            extensionQuestions = preProcessQuestions(questions);
            detectedDocumentId = documentId;

            // Fetch document name for display
            try {
                if (chrome?.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'getDocumentsByCategory' }, (response) => {
                        // This might be tricky if we don't know the category. 
                        // Better: add a dedicated 'getDocumentById' action to background.js or use the first question's metadata if available.
                        // For now, let's assume we can get it from storage if it was recently searched.
                    });
                }
            } catch (e) { }

            // To be absolutely sure we have the name, we'll try to get it from the background script
            const docInfo = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getDocumentById', documentId }, (res) => {
                    resolve(res && res.success ? res.document : null);
                });
            });

            if (docInfo && docInfo.title) {
                detectedDocumentName = docInfo.title;
                detectedCategoryId = docInfo.categoryId || null;
            }

            saveCachedQuestions();
            showCachedQuestionsIndicator();
            return true;
        }
        return false;
    }


    // Perform auto-compare if we have cached questions OR try to auto-detect
    async function performAutoCompare(force = false) {
        // Chỉ thực hiện so sánh khi ở đúng domain
        if (window.location.hostname !== 'learning.ehou.edu.vn') {
            return;
        }

        // Respect auto-select toggle: skip automatic compares when disabled (unless forced)
        // BUT: If the user hasn't selected anything manually (cache empty), we might want to try auto-detect anyway?
        // Let's stick to the rule: if autoSelectEnabled is false, we don't do anything unless forced.
        // Wait, the user requirement is "không cần chọn danh mục và tài liệu ... người dùng chỉ cần ấn so sánh".
        // This implies manual trigger ("ấn so sánh").
        // But "performAutoCompare" is called on load.
        // If we want FULLY automated (on load), we need autoSelectEnabled = true (or default to true).
        // For now, let's assume this flows into the existing logic.
        if (!autoSelectEnabled && !force) {
            return;
        }
        // Throttle auto-compare to avoid too frequent calls (unless forced)
        const now = Date.now();
        if (!force && now - lastCompareTime < COMPARE_DEBOUNCE_MS) {
            return;
        }

        // Skip if currently comparing
        if (isComparing) {
            return;
        }

        if (extensionQuestions.length === 0) {
            // Try to load from cache first
            await loadCachedQuestions();
        }

        // START: Auto-detect logic
        // If we still have no questions, OR if we have questions but they don't seem to match the current page
        // (which implies user might have navigated to a new quiz different from cached one)
        // We should try to auto-detect the document from the content.
        let pageQuestions = [];
        try {
            // Extract questions first to check if cache applies
            pageQuestions = scanQuestionsOnPage();
        } catch (e) { /* ignore */ }

        if (allQuestionsAreInvalid(pageQuestions, extensionQuestions)) {
            debugLog('[Tailieu Extension] Cache invalid or empty. Attempting auto-detection...');

            // Try to detect document from the first valid question on the page
            const success = await detectDocumentFromPage(pageQuestions);

            if (success) {
                debugLog('[Tailieu Extension] Auto-detection successful! Loaded questions for document:', detectedDocumentId);
                // Save the newly loaded questions to cache persistent
                saveCachedQuestions();
            }
        }
        // END: Auto-detect logic

        if (extensionQuestions.length > 0) {
            lastCompareTime = now;
            isComparing = true;

            try {
                // Wait for page to be ready
                if (document.readyState !== 'complete') {
                    await new Promise(resolve => {
                        window.addEventListener('load', resolve, { once: true });
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                const result = await compareAndHighlightQuestions();

                if (result.matched > 0) {
                    showAutoCompareNotification(result.matched, extensionQuestions.length);
                    // ... notify popup ...
                    try {
                        if (chrome?.runtime?.sendMessage) {
                            chrome.runtime.sendMessage({
                                action: 'comparisonComplete',
                                matched: result.matched,
                                total: extensionQuestions.length
                            });
                        }
                    } catch (e) { }
                } else {
                    // If no matches found even with cache, and we haven't just auto-detected
                    // Maybe we should try to auto-detect AGAIN based on the *first unmatched* question?
                    // (Handled partially above, but if we had a cache that was WRONG, the above check
                    // "allQuestionsAreInvalid" attempts to fix it.
                    // But what if the cache WAS valid for Q1 but not others? Mixed content?
                    // For now, assume one document per page).
                }
            } finally {
                isComparing = false;
            }
        }
    }

    // Helper: Check if current cache seems totally irrelevant to the page
    function allQuestionsAreInvalid(pageQs, extQs) {
        if (!pageQs || pageQs.length === 0) return false; // Can't judge
        if (!extQs || extQs.length === 0) return true; // Empty cache is invalid

        // Check first 3 questions instead of just 1 to be more robust
        const candidates = pageQs.slice(0, 3);
        let matchCount = 0;

        for (const pQ of candidates) {
            const cleanP = normalizeForExactMatch(cleanQuestionText(pQ.text));
            if (!cleanP) continue;

            const match = extQs.some(eq => {
                const cleanEq = eq._key || normalizeForExactMatch(cleanQuestionText(eq.question));
                return compareNormalized(cleanP, cleanEq);
            });

            if (match) matchCount++;
        }

        // If we checked multiple, require at least one match
        // (If page has 3 Qs and 0 match, it's definitely invalid)
        return matchCount === 0;
    }

    // Helper: Scan questions (extracted from compareAndHighlightQuestions)
    function scanQuestionsOnPage() {
        // Use existing extraction logic by creating temporary array
        // We reuse extractQuestionsFromPage but need to capture its output
        // Currently extractQuestionsFromPage pushes to `questions` local var in its scope?
        // Wait, `extractQuestionsFromPage` in original code returned specific structure or pushed to array?
        // Checking original: `function extractQuestionsFromPage() { const questions = []; ... return questions; }`?
        // No, in original code it looked like it was inline or helper.
        // Let's reuse the logic we see in `initializeContentScript` -> calls `extractQuestionsFromPage`?
        // Actually, the previous view showed `extractQuestionsFromPage` defined at line 1200.
        // Let's verify if `scanQuestionsOnPage` is needed or we call `extractQuestionsFromPage`.

        return extractQuestionsFromPage();
    }

    // Helper: Update indicator UI status
    function updateIndicatorStatus(message, isSearching = false) {
        const statusEl = document.getElementById('tailieu-indicator-count');
        const compareBtn = document.getElementById('tailieu-compare-now');
        const docNameEl = document.getElementById('tailieu-indicator-doc-name');

        if (statusEl) {
            statusEl.textContent = message;
            // statusEl.style.color = isSearching ? '#FFC107' : 'white';
        }

        if (compareBtn) {
            if (isSearching) {
                compareBtn.disabled = true;
                compareBtn.style.opacity = '0.7';
                compareBtn.textContent = '...';
            } else {
                compareBtn.disabled = false;
                compareBtn.style.opacity = '1';
                compareBtn.textContent = 'So sánh';
            }
        }
    }

    // Generic notification function
    function showNotification(message, type = 'info', duration = 5000) {
        // Type can be: 'info', 'success', 'warning', 'error'
        const notification = document.createElement('div');
        notification.className = `tailieu-notification-toast ${type}`;
        notification.textContent = message;

        safeAppendToBody(notification, () => {
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        });
    }

    // Show notification for auto-compare results with enhanced details
    function showAutoCompareNotification(matched, total) {
        const accuracy = total > 0 ? ((matched / total) * 100).toFixed(1) : 0;

        // Different notification styles based on accuracy
        let type, message;
        if (matched === 0) {
            type = 'warning';
            message = `Không tìm thấy câu hỏi phù hợp (0/${total})`;
        } else if (matched === total) {
            type = 'success';
            message = `✓ Tìm thấy tất cả ${matched}/${total} câu hỏi (${accuracy}%)`;
        } else {
            type = 'info';
            message = `Tìm thấy ${matched}/${total} câu hỏi (${accuracy}%)`;
        }

        const notification = document.createElement('div');
        notification.className = `tailieu-auto-compare-toast ${type}`;
        notification.innerHTML = `
             <span>${message}</span>
             <div class="tailieu-toast-accuracy">
                Độ chính xác cao
             </div>
        `;

        safeAppendToBody(notification, () => {
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        });
    }

    // Initialize auto-compare (moved to initializeContentScript)
    // initAutoCompareOnLoad();

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

            // Safely observe document.body when it's available
            function startUrlObserving() {
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                    window.tailieuUrlObserver = observer;
                } else {
                    // Wait for body to be available
                    setTimeout(startUrlObserving, 100);
                }
            }

            startUrlObserving();
        }
    }

    // Start monitoring URL changes (moved to initializeContentScript)
    // monitorUrlChanges();

    // Also listen to popstate events (back/forward buttons)
    if (!window.tailieuPopstateListener) {
        window.addEventListener('popstate', () => {

            setTimeout(performAutoCompare, 1000);
        });
        window.tailieuPopstateListener = true;
    }

    // Listen to pushstate/replacestate events (common in SPAs)
    // Only override if not already overridden
    if (!window.tailieuHistoryOverridden) {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(this, args);

            setTimeout(performAutoCompare, 1000);
        };

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);

            setTimeout(performAutoCompare, 1000);
        };

        window.tailieuHistoryOverridden = true;
    }

    // Listen for storage changes to auto-trigger comparison
    if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes[QUESTIONS_CACHE_KEY]) {


                // Update local questions cache
                if (changes[QUESTIONS_CACHE_KEY].newValue) {
                    extensionQuestions = changes[QUESTIONS_CACHE_KEY].newValue;
                    setTimeout(() => performAutoCompare(false), 500);
                }
            }
        });

        // Also listen for more specific cache changes
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
                // If auto-select preference changed in storage, update local flag (do not trigger compare)
                if (changes['tailieu_auto_select'] && typeof changes['tailieu_auto_select'].newValue !== 'undefined') {
                    try {
                        autoSelectEnabled = !!changes['tailieu_auto_select'].newValue;
                        //console.log('[Tailieu Extension] tailieu_auto_select changed ->', autoSelectEnabled);
                    } catch (e) { }
                }

                // Listen for highlight-preference changes
                if (areaName === 'local') {
                    if (changes['tailieu_highlight_answers'] && typeof changes['tailieu_highlight_answers'].newValue !== 'undefined') {
                        try {
                            answerHighlightingEnabled = !!changes['tailieu_highlight_answers'].newValue;
                            try { window.answerHighlightingEnabled = answerHighlightingEnabled; } catch (e) { }
                            if (!answerHighlightingEnabled) {
                                // If highlight turned off, clear any existing highlights
                                try { clearAllHighlights(); } catch (e) { }
                            }
                        } catch (e) { }
                    }
                }

                // Check for other tailieu cache updates
                const tailieusKeys = ['tailieu_selected_category', 'tailieu_selected_document'];
                const hasRelevantChanges = tailieusKeys.some(key => changes[key]);

                if (hasRelevantChanges) {
                    setTimeout(async () => {
                        await loadCachedQuestions();
                        if (extensionQuestions.length > 0) {
                            performAutoCompare(false); // Respect auto-select toggle
                        }
                    }, 1000);
                }
            }
        });
    }



    // Safely append element to body when available
    function safeAppendToBody(element, callback = null) {
        if (document.body) {
            document.body.appendChild(element);
            if (callback) callback();
        } else {
            // Wait for body to be available, but limit retries
            let retryCount = 0;
            const maxRetries = 50; // 5 seconds max wait

            const checkBody = () => {
                retryCount++;
                if (document.body) {
                    document.body.appendChild(element);
                    if (callback) callback();
                } else if (retryCount < maxRetries) {
                    setTimeout(checkBody, 100);
                } else {
                    console.error('Failed to append element to body after maximum retries');
                }
            };
            checkBody();
        }
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

        try {
            if (request.action === 'getPageInfo') {
                sendResponse({
                    url: window.location.href,
                    title: document.title,
                    domain: window.location.hostname
                });
                return true; // Keep message channel open
            }

            if (request.action === 'isPageLoaded') {
                sendResponse({ loaded: document.readyState === 'complete' });
                return true; // Keep message channel open
            }
        } catch (error) {

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
                        matchedQuestions: (typeof result.matchedUniquePageCount === 'number') ? result.matchedUniquePageCount : (typeof result.matchedUniqueCount === 'number') ? result.matchedUniqueCount : (result.matched && result.matched.length) || 0,
                        totalPageQuestions: result.pageQuestions.length,
                        dbQuestionsCount: extensionQuestions.length,
                        matchedRawCount: result.matched.length
                    });
                } catch (error) {

                    sendResponse({ error: error.message });
                }
            })();
            return true;
        }

        if (request.action === 'setExtensionQuestions') {
            try {
                // Filter out any questions inserted by the scanner extension to avoid proposing them
                extensionQuestions = (request.questions || []).filter(q => !(q && q.source && q.source === 'scanner_extension'));

                // Ensure questions are ordered newest->oldest so latest DB answers get priority
                try {
                    extensionQuestions.sort((a, b) => {
                        const toMillis = (t) => {
                            if (!t) return 0;
                            if (typeof t.toDate === 'function') return t.toDate().getTime();
                            if (t.seconds) return t.seconds * 1000 + (t.nanoseconds ? Math.floor(t.nanoseconds / 1e6) : 0);
                            const n = new Date(t).getTime();
                            return isNaN(n) ? 0 : n;
                        };
                        const ta = toMillis(a.updatedAt || a.createdAt);
                        const tb = toMillis(b.updatedAt || b.createdAt);
                        return tb - ta;
                    });
                } catch (e) {
                    console.warn('Failed to sort extensionQuestions by date:', e);
                }

                // Save to cache
                saveCachedQuestions();
                // Clear the outdated-data flag: new questions pushed, data is fresh now
                try {
                    if (chrome && chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({ tailieu_db_updated: false }, function () { });
                    }
                } catch (e) { }
                showCachedQuestionsIndicator();

                // Update questions popup with new questions
                updateQuestionsPopup(extensionQuestions);

                sendResponse({ success: true });
            } catch (error) {

                sendResponse({ error: error.message });
            }
            return true;
        }

        if (request.action === 'clearHighlights') {
            try {
                clearAllHighlights();
                sendResponse({ success: true });
            } catch (error) {

                sendResponse({ error: error.message });
            }
            return true;
        }

        if (request.action === 'updateQuestionsPopup') {
            try {
                updateQuestionsPopup(request.questions || []);
                sendResponse({ success: true });
            } catch (error) {

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

                sendResponse({ success: true });
            } catch (error) {

                sendResponse({ error: error.message });
            }
            return true;
        }

        if (request.action === 'setAnswerHighlighting') {
            answerHighlightingEnabled = request.enabled;
            try { window.answerHighlightingEnabled = answerHighlightingEnabled; } catch (e) { }
            sendResponse({ success: true });
            // If highlighting was turned off via popup message, clear existing highlights immediately
            try {
                if (!answerHighlightingEnabled) clearAllHighlights();
            } catch (e) { }
            return;
        }
        if (request.action === 'setAutoSelect') {
            autoSelectEnabled = !!request.enabled;
            sendResponse({ success: true });
            return;
        }
    });

    // Load cached questions from storage
    async function loadCachedQuestions() {
        try {
            // Check if extension context is still valid
            if (!chrome?.storage?.local) {
                return;
            }

            const result = await chrome.storage.local.get([QUESTIONS_CACHE_KEY, 'tailieu_detected_doc_id', 'tailieu_detected_doc_name', 'tailieu_detected_cat_id']);
            if (result[QUESTIONS_CACHE_KEY] && result[QUESTIONS_CACHE_KEY].length > 0) {
                // Filter cached questions to remove any scanner_extension entries
                const rawQuestions = (result[QUESTIONS_CACHE_KEY] || []).filter(q => !(q && q.source && q.source === 'scanner_extension'));
                extensionQuestions = preProcessQuestions(rawQuestions);
                detectedDocumentId = result['tailieu_detected_doc_id'] || null;
                detectedDocumentName = result['tailieu_detected_doc_name'] || null;
                detectedCategoryId = result['tailieu_detected_cat_id'] || null;
            } else {
                extensionQuestions = [];
                detectedDocumentId = null;
                detectedDocumentName = null;
            }

            try {
                // ALWAYS show cached questions indicator (safely)
                showCachedQuestionsIndicator();

                // Update questions popup with cached questions (safely)
                updateQuestionsPopup(extensionQuestions);
            } catch (uiError) {
                // Continue execution even if UI updates fail
            }
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                return;
            }

        }
    }

    // Save questions to cache
    async function saveCachedQuestions() {
        try {
            // Check if extension context is still valid
            if (!chrome?.storage?.local) {
                return;
            }

            await chrome.storage.local.set({
                [QUESTIONS_CACHE_KEY]: extensionQuestions,
                'tailieu_detected_doc_id': detectedDocumentId,
                'tailieu_detected_doc_name': detectedDocumentName,
                'tailieu_detected_cat_id': detectedCategoryId
            });
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                return;
            }

        }
    }

    // Function to extract questions from current page
    function extractQuestionsFromPage() {
        const questions = [];

        // ===== MOODLE STRUCTURE FIRST =====
        // Look for .que (question) containers - standard Moodle structure
        const moodleQuestions = document.querySelectorAll('.que');
        if (moodleQuestions.length > 0) {
            //console.log('[Tailieu Extension] Phát hiện cấu trúc Moodle, tìm thấy', moodleQuestions.length, 'câu hỏi .que');

            moodleQuestions.forEach((queContainer, index) => {
                if (isExtensionElement(queContainer)) return;

                // Find question text in .qtext; if missing, fallback to .formulation (some essay/fill-in questions store content there)
                let qtextElement = queContainer.querySelector('.qtext');
                let usedFormulationFallback = false;
                if (!qtextElement) {
                    const formulation = queContainer.querySelector('.formulation');
                    if (formulation) {
                        qtextElement = formulation;
                        usedFormulationFallback = true;
                    } else {
                        return;
                    }
                }

                // If multiple <p> tags exist, concatenate their texts in order before comparing
                const pEls = qtextElement.querySelectorAll('p');
                const hasContentImageHandler = typeof window.tailieuContentImageHandler !== 'undefined';

                let questionText = '';
                if (pEls && pEls.length > 0) {
                    // Prefer text inside <strong> or <b> if present, append remaining text from the <p>
                    const parts = Array.from(pEls).map(p => {
                        try {
                            // Special handling when we fell back to .formulation: include input values inside the paragraph (fill-in answers)
                            if (usedFormulationFallback) {
                                const nodesParts = [];
                                p.childNodes.forEach(node => {
                                    if (node.nodeType === Node.TEXT_NODE) {
                                        const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
                                        if (t) nodesParts.push(t);
                                        return;
                                    }
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        const tag = node.tagName && node.tagName.toUpperCase();
                                        if (tag === 'INPUT') {
                                            const v = (node.value || node.getAttribute && node.getAttribute('value')) || '';
                                            if (v && v.toString().trim()) nodesParts.push(v.toString().trim());
                                            else nodesParts.push('___');
                                            return;
                                        }
                                        // For other elements prefer the image-aware extraction when available
                                        const t = hasContentImageHandler ? window.tailieuContentImageHandler.getElementVisibleTextWithImages(node) : (node.textContent || '');
                                        if (t && t.trim()) nodesParts.push(t.trim());
                                    }
                                });
                                return nodesParts.join(' ').replace(/\s+/g, ' ').trim();
                            }

                            // Default behavior: prefer strong/b inside each <p>
                            const strongEls = p.querySelectorAll('strong, b');
                            if (strongEls && strongEls.length > 0) {
                                const strongTexts = Array.from(strongEls).map(se => hasContentImageHandler ?
                                    window.tailieuContentImageHandler.getConcatenatedText(se) :
                                    (se.textContent || '').trim()).filter(Boolean);

                                const strongText = strongTexts.join(' ');

                                // Get full p text
                                const fullPText = hasContentImageHandler ?
                                    window.tailieuContentImageHandler.getConcatenatedText(p) :
                                    (p.textContent || '').trim();

                                // Remove all strong occurrences from fullPText to get the rest
                                let rest = fullPText;
                                strongTexts.forEach(st => {
                                    if (st) {
                                        rest = rest.replace(st, '').trim();
                                    }
                                });

                                return ([strongText, rest].filter(Boolean).join(' ')).trim();
                            }

                            if (hasContentImageHandler) {
                                return window.tailieuContentImageHandler.getConcatenatedText(p) || '';
                            }
                            return (p.textContent || '').trim();
                        } catch (e) {
                            if (usedFormulationFallback) {
                                return (p.textContent || '').replace(/\s+/g, ' ').trim();
                            }
                            return hasContentImageHandler ? window.tailieuContentImageHandler.getConcatenatedText(p) : (p.textContent || '').trim();
                        }
                    }).filter(Boolean);
                    questionText = parts.join(' ');

                    // Debug: show p parts when in debugMode
                    if (debugMode && questionText) {
                        try { console.debug('[Tailieu Debug] qtext <p> parts:', parts); } catch (e) { }
                    }
                } else {
                    // Fallback to whole qtext/formulation
                    questionText = hasContentImageHandler ?
                        window.tailieuContentImageHandler.getConcatenatedText(qtextElement) :
                        (qtextElement.textContent?.trim() || '');
                }

                // Clean text (remove reading passages) using helper
                const finalQuestionText = cleanQuestionContent(questionText, qtextElement) || questionText;

                // Debug: show raw concatenated question text vs cleaned final text to detect feedback being picked up
                if (debugMode) {
                    try { console.debug('[Tailieu Debug] qtext raw vs final:', { raw: questionText && questionText.slice(0, 200), final: finalQuestionText && finalQuestionText.slice(0, 200) }); } catch (e) { }
                }

                // DEBUG: If question contains image URLs, log extraction details for troubleshooting
                try {
                    const containsImage = typeof window.tailieuContentImageHandler !== 'undefined' ?
                        window.tailieuContentImageHandler.containsImageUrls(finalQuestionText) : /"(?:https?:\/\/|(?:\.){3,}\/)[^"]+"/.test(finalQuestionText);
                    if (containsImage && debugMode) {
                        try {
                            const extractor = window.tailieuImageHandler && typeof window.tailieuImageHandler.extractImageUrls === 'function' ? window.tailieuImageHandler.extractImageUrls : null;
                            const urls = extractor ? extractor(qtextElement) : [];
                            // console.debug('[Tailieu Debug] Extracted image question:', {
                            //     pageText: finalQuestionText,
                            //     urls: urls.slice(0,10),
                            //     snippet: (qtextElement && qtextElement.innerText) ? qtextElement.innerText.trim().slice(0,200) : ''
                            // });
                        } catch (e) {
                            console.debug('[Tailieu Debug] Error while extracting image urls:', e);
                        }
                    }
                } catch (e) { }

                if (finalQuestionText.length < 5) return;

                // Find answer container and prefer label-based options inside it
                const answerContainer = queContainer.querySelector('.answer');
                // Collect labels inside answerContainer if present (for later matching/highlighting)
                let pageOptions = [];
                try {
                    if (answerContainer) {
                        const labels = Array.from(answerContainer.querySelectorAll('label'));
                        if (labels.length > 0) {
                            pageOptions = labels.map(l => {
                                const txt = hasContentImageHandler ? window.tailieuContentImageHandler.getConcatenatedText(l) : (l.textContent || '').trim();
                                // Robustly strip leading option markers (e.g., "a.", "A)", "1.") with optional spaces
                                // Strictly limited to A-D or digits followed by separator and SPACE
                                const cleaned = txt.replace(/^\s*[A-Da-d0-9]\s*(?:[.\)\-:])\s+/u, '').trim();
                                return normalizeTextForMatching(cleaned);
                            }).filter(Boolean);

                            if (debugMode) {
                                try { console.debug('[Tailieu Debug] pageOptions:', pageOptions); } catch (e) { }
                            }
                        }
                    }
                } catch (e) { }

                questions.push({
                    element: qtextElement,
                    container: queContainer,
                    answerContainer: answerContainer,
                    pageOptions: pageOptions,
                    text: finalQuestionText,
                    originalText: questionText,
                    index: index,
                    reason: 'moodle .que structure',
                    userAnswer: getSelectedAnswer(queContainer)
                });
                // Attach a persistent icon inside the question text that opens the DB answers popup on click
                try {
                    if (!qtextElement.dataset.tailieuIconAttached) {
                        qtextElement.dataset.tailieuIconAttached = '1';

                        // Create icon element and append to qtext (keeps it inside question element)
                        const icon = document.createElement('span');
                        icon.className = 'tailieu-answer-icon';
                        icon.title = 'Nhấn để xem đáp án';
                        icon.tabIndex = 0;
                        icon.setAttribute('role', 'button');

                        // Simple inline SVG magnifier icon for clarity
                        icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                                            <defs>
                                                <radialGradient id="glow" cx="50%" cy="40%" r="60%">
                                                <stop offset="0%" stop-color="#FFF9C4"/>
                                                <stop offset="70%" stop-color="#FFD54F"/>
                                                <stop offset="100%" stop-color="#FFC107"/>
                                                </radialGradient>
                                            </defs>

                                            <!-- Bóng đèn -->
                                            <path
                                                d="M9 21h6v-1H9v1zm3-20a7 7 0 00-4.47 12.38C8.3 14.06 9 15.1 9 16v2h6v-2c0-.9.7-1.94 1.47-2.62A7 7 0 0012 1z"
                                                fill="url(#glow)"
                                            />

                                            <!-- Đui đèn -->
                                            <rect x="9" y="18" width="6" height="2" fill="#FFB300"/>
                                            </svg>
                                        `;

                        // Keep icon visually inline: append at end of qtext but still inside
                        try { qtextElement.appendChild(icon); } catch (e) { /* ignore */ }

                        // Click handler toggles the tooltip popup; use the icon as anchor
                        icon.addEventListener('click', async (ev) => {
                            ev.stopPropagation(); ev.preventDefault();
                            // If tooltip already open, close it
                            const existing = document.querySelector('.tailieu-answer-tooltip');
                            if (existing) {
                                hideAnswerTooltip(qtextElement);
                                return;
                            }
                            try {
                                // First try answers stored on the element (fast and reliable if highlighted earlier)
                                let answers = null;
                                try {
                                    if (qtextElement && qtextElement.dataset && qtextElement.dataset.tailieuAnswers) {
                                        answers = JSON.parse(qtextElement.dataset.tailieuAnswers);
                                    }
                                } catch (e) { answers = null; }

                                // Ensure we have cached questions loaded; try to load if empty (only if no dataset answers)
                                if ((!answers || answers.length === 0) && (!extensionQuestions || extensionQuestions.length === 0)) {
                                    try {
                                        await loadCachedQuestions();
                                    } catch (e) { /* ignore */ }
                                }

                                if (!answers) answers = findAllCorrectAnswersForQuestion(finalQuestionText);

                                // Fallback: directly read storage in case extensionQuestions isn't populated yet
                                if ((!answers || answers.length === 0) && chrome?.storage?.local) {
                                    try {
                                        const res = await chrome.storage.local.get(QUESTIONS_CACHE_KEY);
                                        const cached = res[QUESTIONS_CACHE_KEY] || [];
                                        if (cached && cached.length > 0) {
                                            const prev = extensionQuestions;
                                            extensionQuestions = cached;
                                            answers = findAllCorrectAnswersForQuestion(finalQuestionText);
                                            extensionQuestions = prev;
                                        }
                                    } catch (e) { /* ignore */ }
                                }

                                if (answers && answers.length > 0) {
                                    // Use icon as anchor so tooltip appears near it
                                    const showFn = (window && window.tailieuShowAnswerTooltip) ? window.tailieuShowAnswerTooltip : createAnswerTooltip;
                                    showFn(icon, answers);
                                } else {
                                    // No suggestion found — brief user feedback
                                    try { showNotification('Không có đề xuất đáp án cho câu này', 'warning', 2500); } catch (e) { }
                                }
                            } catch (e) { /* ignore */ }
                        });

                        // Keyboard accessibility: Enter / Space open popup
                        icon.addEventListener('keydown', (ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault(); icon.click();
                            }
                        });
                    }
                } catch (e) {
                    // ignore attach errors
                }

            });

            // If we found Moodle questions, return them directly
            if (questions.length > 0) {
                return questions;
            }
        }

        // ===== FALLBACK: Generic question patterns =====
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
            return true;
        });


        questionElements.forEach((element, index) => {
            // Skip elements that belong to the extension
            if (isExtensionElement(element)) {
                return;
            }

            const hasContentImageHandler = typeof window.tailieuContentImageHandler !== 'undefined';
            const text = hasContentImageHandler ?
                window.tailieuContentImageHandler.getElementVisibleTextWithImages(element) :
                element.textContent.trim();

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
            // Perform cleaning (prefix & passage removal) using helper
            cleanText = cleanQuestionContent(text);

            // Check major changes (indicating prefix or passage removal)
            const cleanTextDiffers = cleanText.length > 0 && cleanText !== text;

            // Re-validate if it was a prefix or passage marker that caused the difference
            if (cleanTextDiffers) {
                const prefixMatch = text.match(/^(Câu\s*\d+[:\.\)\s]*|Bài\s*\d+[:\.\)\s]*|Question\s*\d+[:\.\)\s]*|\d+[\.\)]\s*)/i);
                const hasPassageMarker = /Choose the (best|correct) answer|Select the (best|correct) answer|Chọn (câu trả lời|đáp án) đúng nhất|Trả lời câu hỏi|Answer the question/i.test(text);

                if ((prefixMatch || hasPassageMarker) && cleanText.length > 10) {
                    isQuestion = true;
                    questionReason = 'has question prefix or passage marker';
                }
            }

            // Pattern matching on clean text
            if (!isQuestion && questionPatterns.some(pattern => pattern.test(cleanText))) {
                isQuestion = true;
                questionReason = 'pattern match';
            }
            // NEW: Fill-in-the-blank detection (dạng điền từ, không cần dấu hỏi)
            if (!isQuestion && /([_.‥…]{2,}|\.{2,}|…{1,}|___{1,})/.test(cleanText)) {
                isQuestion = true;
                questionReason = 'fill-in-the-blank';
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
                // Attempt to find a nearby answer container for non-Moodle pages
                const container = element.closest('.que, .question, .question-item, .question-block, .qtext, .question-content') || element.parentElement;
                const answerContainer = findAnswerContainerForQuestion(element) || (container ? container.querySelector('.answer, .answers, .choices, .options, .answer-container') : null);

                questions.push({
                    element: element,
                    container: container,
                    answerContainer: answerContainer,
                    text: cleanText,  // Use clean text for matching
                    originalText: text,  // Keep full text for context
                    variants: generateQuestionVariants(text, cleanText),
                    index: index,
                    reason: questionReason
                });
            }
        });


        // Also look specifically in our test page structure
        const testQuestions = document.querySelectorAll('.question-text');
        if (testQuestions.length > 0) {
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

    // Function to get selected answer text from a container
    function getSelectedAnswer(container) {
        if (!container) return null;
        try {
            // Find checked radio or checkbox
            const checkedInput = container.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
            if (checkedInput) {
                // Find label text associated with this input
                let label = null;
                if (checkedInput.id) {
                    label = document.querySelector(`label[for="${checkedInput.id}"]`);
                }
                if (!label) {
                    label = checkedInput.closest('label') || checkedInput.closest('.flex-fill') || checkedInput.closest('.answer-item') || checkedInput.parentElement;
                }

                if (label) {
                    const hasCImgH = typeof window.tailieuContentImageHandler !== 'undefined';
                    let text = hasCImgH ?
                        window.tailieuContentImageHandler.getConcatenatedText(label) :
                        label.textContent.trim();

                    // Remove input related text if any (like markers 'a.', 'b.'), allow optional spaces
                    // Strictly limited to A-D or digits followed by separator and SPACE
                    return text.replace(/^\s*[A-Za-d0-9]\s*(?:[.\)\-:])\s+/i, '').trim();
                }
            }
        } catch (e) {
            console.warn('[Tailieu Extension] Error getting selected answer:', e);
            return null;
        }
    }

    // Normalize text for matching - Simple like Hỗ Trợ HT
    function normalizeTextForMatching(text) {
        if (!text) return '';
        try {
            let s = text.toString();
            s = s.replace(/\n/g, ' ')
                .replace(/[\s\t]+/g, ' ')
                .replace(/[\s\xa0]{2,}/g, ' ')
                .trim();

            // Remove surrounding symbols/bullets but PRESERVE leading dots/underscores for blanks
            s = s.replace(/^[\s\u2022•|]+|[\s\u2022•|]+$/g, '').trim();

            // Only strip trailing junk if it's NOT a sequence of dots/underscores (blanks)
            if (!/[._\u2026]{2,}\s*$/.test(s)) {
                s = s.replace(/[\.\u2026\-–—\s]+$/g, '').trim();
            }

            return s;
        } catch (e) {
            // Fallback simple normalization
            return ('' + text).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().replace(/[\.\u2026\-–—\s]+$/g, '').trim();
        }
    }

    // Clean question text for better matching - Enhanced for accuracy
    function cleanQuestionText(text) {
        // Pre-normalize image URLs to filenames to avoid path differences and stripping issues
        let s = text || '';
        try {
            // Extract filename from URL (matches content-image-handler format)
            s = s.replace(/"(?:https?:\/\/[^"]+\/|(?:\.){3,}\/)([^"?]+)(?:\?[^"]*)?"/gi, ' $1 ');
        } catch (e) { }

        // Remove specific long instruction which causes mismatches
        s = s.replace(/Choose A,\s*B,\s*C,?\s*or\s*D\s*to\s*complete\s*the\s*(following\s*)?sentence[:\s]*/gi, '');
        // Remove other common instructions
        s = s.replace(/(Choose|Select)\s*the\s*(best|correct|most\s*suitable)\s*(answer|title|option|response)[:\s]*/gi, '');
        s = s.replace(/(Chọn|Trả lời)\s*(câu\s*trả\s*lời|đáp\s*án|câu\s*hỏi)(\s*đúng\s*nhất|\s*phù\s*hợp\s*nhất|\s*đúng)?[:\s]*/gi, '');

        return s
            .replace(/Câu\s*(hỏi\s*)?\d+[:\.\)\s]*/gi, '')
            .replace(/Bài\s*(tập\s*)?\d+[:\.\)\s]*/gi, '')
            .replace(/Question\s*\d+[:\.\)\s]*/gi, '')
            .replace(/^\s*\d+[\.\)]\s*/, '')
            .replace(/^\s*[A-D][\.\)\-]\s*/gi, '')
            .replace(/^\s*[-\*\+•]\s*/, '')
            .replace(/\s+/g, ' ')
            // Giữ lại chuỗi dấu chấm liên tiếp (........ hoặc ...), thay vì loại bỏ
            .replace(/(\.{3,})/g, ' $1 ') // Đảm bảo dấu chấm được giữ lại và tách biệt
            // Normalize various dash-like characters and soft hyphen to space
            .replace(/[\u00AD\u2010\u2011\u2012\u2013\u2014\u2212]/g, ' ')
            .replace(/[^\w\sÀ-ỹ\?\.,!]/g, ' ') // Keep only letters, Vietnamese chars, basic punctuation
            .trim()
            .toLowerCase();
    }

    // Compare questions and highlight matches
    async function compareAndHighlightQuestions(isManual = false) {
        // Use different debounce time for manual clicks vs auto-compare
        const debounceTime = isManual ? MANUAL_COMPARE_DEBOUNCE_MS : COMPARE_DEBOUNCE_MS;

        // Prevent excessive calls and logging
        const now = Date.now();
        if (isComparing) {
            //console.log('[Tailieu Extension] ⏱️ Already comparing, please wait...');
            return { matched: [], pageQuestions: [] };
        }

        if (!isManual && (now - lastCompareTime) < debounceTime) {
            //console.log('[Tailieu Extension] ⏱️ Skipping auto-compare - throttled');
            return { matched: [], pageQuestions: [] };
        }

        // CRITICAL: Ensure questions are loaded before comparing. 
        // Also check if current cache is irrelevant to the page (e.g. user moved to new quiz)
        let pageQs = [];
        try { pageQs = scanQuestionsOnPage(); } catch (e) { }

        if (extensionQuestions.length === 0 || allQuestionsAreInvalid(pageQs, extensionQuestions)) {
            // Try to load from cache first if empty
            if (extensionQuestions.length === 0) {
                await loadCachedQuestions();
            }

            // If still empty OR still invalid, try AUTO-DETECT
            if (extensionQuestions.length === 0 || allQuestionsAreInvalid(pageQs, extensionQuestions)) {
                if (isManual) {
                    updateIndicatorStatus('Đang tìm kiếm...', true);
                    const success = await detectDocumentFromPage(pageQs);
                    if (!success || extensionQuestions.length === 0) {
                        updateIndicatorStatus('Chưa thấy tài liệu');
                        showNotification('Chưa tìm thấy tài liệu phù hợp. Vui lòng chọn thủ công.', 'warning');
                        // Return matched:[] to avoid proceed with wrong/empty data
                        isComparing = false;
                        return { matched: [], pageQuestions: [] };
                    }
                    // Success will be handled by loadAndCacheDocumentAndNotify -> showCachedQuestionsIndicator
                } else {
                    // In auto-mode, if invalid and detection failed, we just proceed (might find individual matches later)
                }
            }
        }

        isComparing = true;
        lastCompareTime = now;

        // Reset highlighted QA log for this run
        highlightedQA = [];

        // Update compare button to show comparing state
        updateCompareButtonProgress();

        // Build a Map for fast O(1) exact lookup
        const extensionQuestionsMap = new Map();
        extensionQuestions.forEach(eq => {
            const key = eq._key || normalizeForExactMatch(cleanQuestionText(eq.question));
            if (key) extensionQuestionsMap.set(key, eq);
        });

        const pageQuestions = extractQuestionsFromPage();
        const matched = [];

        const totalComparisons = pageQuestions.length * extensionQuestions.length;
        let comparisons = 0;

        for (let pageIndex = 0; pageIndex < pageQuestions.length; pageIndex++) {
            const pageQ = pageQuestions[pageIndex];

            // Generate cleaned variants for the page question (handles audio prompts)
            const pageVariantsRaw = (pageQ.variants && pageQ.variants.length > 0) ? pageQ.variants : [pageQ.text];
            const cleanedVariants = Array.from(new Set(pageVariantsRaw.map(v => cleanQuestionText(v)))).filter(Boolean);

            // Track if this page question has been matched to avoid duplicate processing
            let hasMatchedThisPageQuestion = false;

            for (let extIndex = 0; extIndex < extensionQuestions.length; extIndex++) {
                const extQ = extensionQuestions[extIndex];
                // Safety: skip any question that originated from the scanner extension
                if (extQ && extQ.source && extQ.source === 'scanner_extension') continue;
                const cleanExtQuestion = cleanQuestionText(extQ.question);

                // Debug trace for known problematic question phrases
                try {
                    if (debugMode && /cơ cấu xã hội/i.test(pageQ.text || '')) {
                        const cp = cleanQuestionText(pageQ.text || '');
                        const ce = cleanExtQuestion || '';
                        const kPage = normalizeQuestionKey(cp || '');
                        const kExt = normalizeQuestionKey(ce || '');
                        console.debug('[Tailieu Debug][QA Compare]', { pageText: pageQ.text, extText: extQ.question, cleanPage: cp, cleanExt: ce, keyPage: kPage, keyExt: kExt });
                    }
                } catch (e) { /* ignore debug errors */ }
                comparisons++;

                // Try all variants (use first that matches)
                let matchedVariant = null;
                let matchedFinalValidation = null;

                // Helper: strip common listen prompts for lenient comparision
                function stripListen(s) {
                    return (s || '').toString().replace(/^(listen( to the story)?|then listen( again)?|nghe( lại)?)[\.:,\-\s]*/i, '').trim();
                }

                for (const variant of cleanedVariants) {
                    // STRICT VALIDATION: exact normalized match
                    if (isQuestionSimilar(variant, cleanExtQuestion)) {
                        const originalVariantRaw = pageVariantsRaw[cleanedVariants.indexOf(variant)] || pageQ.text;
                        const finalValidation = performFinalValidation(originalVariantRaw, extQ.question);
                        if (finalValidation.isValid) {
                            matchedVariant = variant;
                            matchedFinalValidation = finalValidation;
                            break;
                        }
                    }

                    // LENIENT: Strip 'Listen' prompt and compare normalized forms
                    const vStrip = stripListen(variant);
                    const eStrip = stripListen(cleanExtQuestion);
                    const normVStrip = normalizeForExactMatch(vStrip);
                    const normEStrip = normalizeForExactMatch(eStrip);
                    // So sánh bình thường hoặc sau khi loại bỏ tất cả khoảng trắng (MathML)
                    if (vStrip && eStrip && (normVStrip === normEStrip || normVStrip.replace(/\s+/g, '') === normEStrip.replace(/\s+/g, ''))) {
                        // Require question-key equality to avoid false positives from short variations
                        const kVar = normalizeQuestionKey(vStrip);
                        const kExt = normalizeQuestionKey(eStrip);
                        if (kVar && kExt && kVar === kExt) {
                            debugLog('[Compare] Matched after stripping Listen prompt:', vStrip, '==', eStrip);
                            matchedVariant = variant;
                            matchedFinalValidation = { isValid: true, confidence: 0.92 };
                            break;
                        }
                    }
                }

                if (!matchedVariant) {
                    // As a fallback, try more lenient enhanced similarity for variants
                    // Fallback similarity with special handling for negations (e.g., 'không')
                    const negationWords = ['không', 'khong', 'not', 'no', 'never', 'chưa', 'chua', 'không phải', 'khong phai'];
                    for (const variant of cleanedVariants) {
                        const sim = calculateEnhancedSimilarity(variant, cleanExtQuestion);

                        // Normalize for negation detection
                        const nVar = normalizeForExactMatch(variant || '');
                        const nExt = normalizeForExactMatch(cleanExtQuestion || '');
                        const hasNegation = negationWords.some(w => (nVar && nVar.includes(w)) || (nExt && nExt.includes(w)));

                        // If either side contains a negation word, require exact normalized equality to avoid flips (e.g., 'đúng' vs 'không đúng')
                        if (hasNegation) {
                            // So sánh bình thường hoặc sau khi loại bỏ tất cả khoảng trắng (MathML)
                            const nVarNoSpace = nVar.replace(/\s+/g, '');
                            const nExtNoSpace = nExt.replace(/\s+/g, '');
                            if (nVar && nExt && (nVar === nExt || nVarNoSpace === nExtNoSpace)) {
                                matchedVariant = variant;
                                matchedFinalValidation = { isValid: true, confidence: 1 };
                                break;
                            } else {
                                if (debugMode) console.debug('[Tailieu Debug] Skipping fuzzy match due to negation difference', { variant: nVar, db: nExt, sim });
                                continue; // skip fuzzy acceptance for negation mismatches
                            }
                        }

                        if (sim > 0.86) { // high threshold
                            // Only accept high similarity if the strict question keys match
                            try {
                                const kVar = normalizeQuestionKey(variant || '');
                                const kExt = normalizeQuestionKey(cleanExtQuestion || '');
                                if (kVar && kExt && kVar === kExt) {
                                    matchedVariant = variant;
                                    matchedFinalValidation = { isValid: true, confidence: sim };
                                    break;
                                } else {
                                    if (debugMode) console.debug('[Tailieu Debug] High similarity but question keys differ, skip', { variant, cleanExtQuestion, sim, kVar, kExt });
                                    continue;
                                }
                            } catch (e) {
                                // If key normalization fails unexpectedly, fallback to accepting sim
                                matchedVariant = variant;
                                matchedFinalValidation = { isValid: true, confidence: sim };
                                break;
                            }
                        }
                    }

                    // DEBUG: If either side contains image URLs and we still didn't match, log useful info
                    try {
                        const imageUrlRegex = /"(?:https?:\/\/|(?:\.){3,}\/)([^"?]+)(?:\?[^\"]*)?"/gi;
                        const pageHasImage = cleanedVariants.some(v => /"(?:https?:\/\/|(?:\.){3,}\/)[^\"]+"/.test(v));
                        const extHasImage = /"(?:https?:\/\/|(?:\.){3,}\/)[^\"]+"/.test(extQ.question);
                        if ((pageHasImage || extHasImage) && debugMode) {
                            function extractFilenames(s) {
                                const arr = [];
                                let m;
                                while ((m = imageUrlRegex.exec(s)) !== null) {
                                    arr.push(m[1]);
                                }
                                return arr;
                            }

                            const pageFiles = cleanedVariants.map(v => extractFilenames(v)).flat().filter(Boolean);
                            const extFiles = extractFilenames(extQ.question);

                            // console.debug('[Tailieu Debug] Image compare miss:', {
                            //     pageIdx: pageIndex,
                            //     extIndex: extIndex,
                            //     pageTextSamples: cleanedVariants.slice(0,2),
                            //     extQuestion: extQ.question,
                            //     pageFiles,
                            //     extFiles,
                            //     normPage: cleanedVariants.map(v => normalizeForExactMatch(v)).slice(0,3),
                            //     normExt: normalizeForExactMatch(cleanExtQuestion)
                            // });
                        }
                    } catch (e) { /* ignore debug errors */ }
                }

                if (matchedVariant) {
                    // Only highlight the question ONCE (first match)
                    if (!hasMatchedThisPageQuestion) {
                        // Find ALL correct answers for this question
                        const allCorrectAnswers = findAllCorrectAnswersForQuestion(extQ.question);
                        // Highlight the question and try to find/highlight all answers
                        highlightMatchedQuestion(pageQ, extQ);
                        hasMatchedThisPageQuestion = true;
                    }

                    // Always record the match for statistics
                    matched.push({
                        pageQuestion: matchedVariant,
                        extensionQuestion: extQ.question,
                        answer: extQ.answer,
                        userAnswer: pageQ.userAnswer,
                        similarity: calculateEnhancedSimilarity(matchedVariant, cleanExtQuestion),
                        confidence: (matchedFinalValidation && matchedFinalValidation.confidence) || 1
                    });
                    // KHÔNG dừng vòng lặp, để có thể tìm và highlight tất cả câu trả lời giống nhau
                }
            }
            // If no match found for this page question, try INDIVIDUAL DB LOOKUP
            if (!hasMatchedThisPageQuestion) {
                try {
                    const cleanText = cleanQuestionText(pageQ.text);
                    const keyP = normalizeForExactMatch(cleanText);

                    // SEARCHING IN LOCAL CACHE FIRST (Safety check for performance)
                    let foundQ = extensionQuestionsMap.get(keyP);

                    // Only query DB if NOT in cache and text is long enough to be unique
                    if (!foundQ && cleanText.length > 15) {
                        foundQ = await findQuestionInDB(cleanText);
                    }

                    if (foundQ) {
                        debugLog('[Tailieu Extension] Individual DB lookup found match:', foundQ.id);

                        // Highlight the question
                        highlightMatchedQuestion(pageQ, foundQ);
                        hasMatchedThisPageQuestion = true;

                        // Record match
                        matched.push({
                            pageQuestion: pageQ.text,
                            extensionQuestion: foundQ.question,
                            answer: foundQ.answer,
                            userAnswer: pageQ.userAnswer,
                            similarity: 1.0,
                            confidence: 1.0,
                            source: 'individual-lookup'
                        });

                        // CHECK FOR CACHE UPDATE / DOCUMENT LOADING
                        // If this question belongs to a document, load all questions for that document
                        if (foundQ.documentId) {
                            // If we don't have a document currently detected, or it's different
                            if (!detectedDocumentId || detectedDocumentId !== foundQ.documentId) {
                                debugLog('[Tailieu Extension] Question belongs to a document. Loading full document questions into cache...');
                                await loadAndCacheDocumentAndNotify(foundQ.documentId);

                                // Update popup to reflect new count
                                try {
                                    if (chrome?.runtime?.sendMessage) {
                                        chrome.runtime.sendMessage({ action: 'updateQuestionsPopup', questions: extensionQuestions });
                                    }
                                } catch (e) { }
                            } else {
                                // Already in this document, but question was missing from cache (updated DB?)
                                const isCached = extensionQuestions.some(eq => eq.id === foundQ.id);
                                if (!isCached) {
                                    debugLog('[Tailieu Extension] Question missing from current document cache. Refreshing...');
                                    await loadAndCacheDocumentAndNotify(detectedDocumentId);
                                }
                            }
                        }
                    } else {
                        // Still no match - log candidates debug info
                        if (debugMode) {
                            const scores = extensionQuestions.map(eq => ({
                                question: eq.question,
                                score: calculateEnhancedSimilarity(cleanText, cleanQuestionText(eq.question))
                            }));
                            scores.sort((a, b) => b.score - a.score);
                            const top = scores.slice(0, 3).filter(s => s.score > 0.4);
                            if (top.length > 0) {
                                //console.log('[Tailieu Extension] No exact match & no DB match -- top candidates:', pageQ.text, top);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Tailieu Extension] Fallback lookup error:', e);
                }
            }
            // Show progress for long lists
            if (totalComparisons > 100 && pageIndex % 10 === 0) {
                // ...existing code...
            }
            // Small delay every 10 items to allow UI updates
            if ((pageIndex + 1) % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 5));
            }
        }

        // ==================== FILL-BLANK PROCESSING ====================
        // Process fill-in-the-blank questions separately using dedicated handler
        let fillBlankMatches = [];
        try {
            if (window.TailieuFillBlank && typeof window.TailieuFillBlank.processFillBlankQuestions === 'function') {
                // console.log('[Tailieu Extension] Processing fill-in-the-blank questions...');
                // console.log('[Tailieu Extension] autoSelectEnabled for fill-blank:', autoSelectEnabled);

                // Truyền autoSelectEnabled vào fill-blank handler
                // Khi bật: tự động điền đáp án vào input fields
                // Khi tắt: chỉ hiển thị gợi ý
                fillBlankMatches = window.TailieuFillBlank.processFillBlankQuestions(extensionQuestions, {
                    autoSelectEnabled: autoSelectEnabled
                });

                //console.log('[Tailieu Extension] Fill-blank matches found:', fillBlankMatches.length);

                // Add fill-blank matches to overall matched count
                fillBlankMatches.forEach(fb => {
                    matched.push({
                        pageQuestion: fb.sentence,
                        extensionQuestion: fb.matchedQuestion,
                        answer: fb.answers.map(a => `${a.index}. ${a.answer}`).join(', '),
                        similarity: 1.0,
                        confidence: 1.0,
                        type: 'fill-blank',
                        autoFilled: fb.autoFilled || false
                    });

                    // Also attach a persistent yellow answer icon to the fill-blank element
                    try {
                        const targetEl = fb.element;
                        if (targetEl && !targetEl.dataset.tailieuIconAttached) {
                            targetEl.dataset.tailieuIconAttached = '1';

                            const icon = document.createElement('span');
                            icon.className = 'tailieu-answer-icon tailieu-fillblank-icon';
                            icon.title = 'Nhấn để xem gợi ý trả lời';
                            icon.tabIndex = 0;
                            icon.setAttribute('role', 'button');

                            // Reuse same lamp SVG used for MCQ icon (yellow glow)
                            icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                                                <defs>
                                                    <radialGradient id="glow-fillblank" cx="50%" cy="40%" r="60%">
                                                        <stop offset="0%" stop-color="#FFF9C4"/>
                                                        <stop offset="70%" stop-color="#FFD54F"/>
                                                        <stop offset="100%" stop-color="#FFC107"/>
                                                    </radialGradient>
                                                </defs>
                                                <path d="M9 21h6v-1H9v1zm3-20a7 7 0 00-4.47 12.38C8.3 14.06 9 15.1 9 16v2h6v-2c0-.9.7-1.94 1.47-2.62A7 7 0 0012 1z" fill="url(#glow-fillblank)"/>
                                                <rect x="9" y="18" width="6" height="2" fill="#FFB300"/>
                                            </svg>`;

                            // Append icon to the target element if possible
                            try { targetEl.appendChild(icon); } catch (e) { /* ignore */ }

                            // Store answers on element for fast retrieval by tooltip
                            try { targetEl.dataset.tailieuAnswers = JSON.stringify(fb.answers.map(a => `${a.index}. ${a.answer}`)); } catch (e) { /* ignore */ }

                            // Click handler shows popup tooltip near icon
                            icon.addEventListener('click', (ev) => {
                                ev.stopPropagation(); ev.preventDefault();
                                const existing = document.querySelector('.tailieu-answer-tooltip');
                                if (existing) { hideAnswerTooltip(targetEl); return; }

                                let answers = null;
                                try {
                                    if (targetEl && targetEl.dataset && targetEl.dataset.tailieuAnswers) {
                                        answers = JSON.parse(targetEl.dataset.tailieuAnswers);
                                    }
                                } catch (e) { answers = null; }

                                if (!answers || answers.length === 0) {
                                    answers = fb.answers.map(a => `${a.index}. ${a.answer}`);
                                }

                                if (answers && answers.length > 0) {
                                    const showFn = (window && window.tailieuShowAnswerTooltip) ? window.tailieuShowAnswerTooltip : createAnswerTooltip;
                                    showFn(icon, answers);
                                } else {
                                    try { showNotification('Không có đề xuất đáp án cho câu này', 'warning', 2500); } catch (e) { }
                                }
                            });

                            icon.addEventListener('keydown', (ev) => {
                                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); icon.click(); }
                            });
                        }
                    } catch (err) {
                        // ignore errors attaching fill-blank icon
                    }
                });
            }
        } catch (fillBlankError) {
            console.warn('[Tailieu Extension] Fill-blank processing error:', fillBlankError);
        }
        // ==================== END FILL-BLANK PROCESSING ====================

        // Additional fallback: highlight individual inputs inside .formulation/.que when their current
        // value matches an answer in the extension DB. This ensures disabled inputs (like your example)
        // still get visually highlighted even when sentence-level matching fails.
        function highlightInputsMatchingDB() {
            try {
                // Collect candidate inputs inside question area
                const inputSelectors = '.que input[type="text"], .que input:not([type]), .que textarea, .formulation input[type="text"], .formulation input:not([type]), .formulation textarea';
                const inputs = Array.from(document.querySelectorAll(inputSelectors));
                if (!inputs || inputs.length === 0) return;

                // Precompute normalized answers map for quick lookup
                const normalizedAnswerSet = new Map(); // map from normalizedAnswer -> array of ext questions
                extensionQuestions.forEach(q => {
                    const rawAns = (q.answer || '').toString();
                    const normAns = normalizeForExactMatch(rawAns);
                    if (!normAns) return;
                    if (!normalizedAnswerSet.has(normAns)) normalizedAnswerSet.set(normAns, []);
                    normalizedAnswerSet.get(normAns).push(q);

                    // Also attempt to split numbered answers and index them individually (e.g., "1. THEIR")
                    try {
                        const parts = rawAns.split(/\s*[,;\n]\s*/).map(s => s.trim()).filter(Boolean);
                        parts.forEach(p => {
                            const pn = normalizeForExactMatch(p);
                            if (pn && !normalizedAnswerSet.has(pn)) normalizedAnswerSet.set(pn, []);
                            if (pn) normalizedAnswerSet.get(pn).push(q);
                        });
                    } catch (e) { /* ignore */ }
                });

                inputs.forEach(input => {
                    try {
                        const val = (input.value || input.getAttribute && input.getAttribute('value') || '').toString().trim();
                        if (!val) return;
                        const normVal = normalizeForExactMatch(val);
                        if (!normVal) return;

                        // Direct match against normalized answers
                        if (normalizedAnswerSet.has(normVal)) {
                            const p = input.closest('p') || input.parentElement || input.closest('.formulation') || input;
                            const shouldHighlight = (window && typeof window.answerHighlightingEnabled !== 'undefined') ? !!window.answerHighlightingEnabled : true;

                            if (shouldHighlight) {
                                // Avoid double-highlighting
                                if (p && !p.classList.contains('tailieu-fillblank-highlighted')) {
                                    p.classList.add('tailieu-fillblank-highlighted');
                                    // Style input for visibility
                                    input.style.border = '2px solid #4CAF50';
                                    input.style.backgroundColor = '#f1f8e9';

                                    // Add a small badge (if not exists)
                                    if (!input.dataset.tailieuBadgeAdded) {
                                        const badge = document.createElement('span');
                                        badge.className = 'tailieu-answer-badge';
                                        badge.textContent = val;
                                        badge.style.cssText = `display:inline-block;margin-left:6px;padding:2px 6px;background:#4CAF50;color:#fff;border-radius:4px;font-size:12px;font-weight:bold;cursor:pointer;vertical-align:middle;`;
                                        badge.title = 'Nhấn để sao chép/điền đáp án';
                                        badge.addEventListener('click', (e) => {
                                            e.preventDefault();
                                            try { navigator.clipboard.writeText(val); } catch (e) { }
                                        });
                                        input.parentNode.insertBefore(badge, input.nextSibling);
                                        input.dataset.tailieuBadgeAdded = 'true';
                                    }
                                }
                            }

                            // Record for analytics/debug even when highlighting is disabled
                            highlightedQA.push({ type: 'input-match', questionSnippet: p.textContent?.substring(0, 120), value: val });
                        }
                    } catch (e) { /* ignore per-input errors */ }
                });

            } catch (e) {
                console.warn('[Tailieu Extension] highlightInputsMatchingDB error', e);
            }
        }

        // Run the input-level highlight fallback
        highlightInputsMatchingDB();
        // if (matched.length > 0) {
        //     // Log average confidence
        //     const avgConfidence = matched.reduce((sum, m) => sum + (m.confidence || 0), 0) / matched.length;

        //     // Log các câu hỏi được highlight
        //     const highlightedQuestionsLog = matched.map(m => m.pageQuestion);
        //     // Count total highlights before cleanup
        //     const highlightsBeforeCleanup = document.querySelectorAll('.tailieu-answer-highlight').length;
        //     // console.log('[Tailieu Extension] Số highlight trước khi cleanup:', highlightsBeforeCleanup);
        //     // console.log('[Tailieu Extension] Summary of highlighted question-answer pairs for this run (' + highlightedQA.length + '):', highlightedQA);

        //     // Remove only duplicate highlights (same answer highlighted multiple times WITHIN same question)
        //     // TEMPORARILY DISABLED FOR DEBUGGING
        //     // setTimeout(() => {
        //     //     // UNCOMMENT TO ENABLE CLEANUP:
        //     //     // const removedCount = removeDuplicateHighlights();
        //     //     // const highlightsAfterCleanup = document.querySelectorAll('.tailieu-answer-highlight').length;
        //     //     // console.log('[Tailieu Extension] Đã xóa', removedCount, 'highlight duplicate/sai');
        //     //     // console.log('[Tailieu Extension] Số highlight sau cleanup:', highlightsAfterCleanup);
        //     // }, 500); // Small delay to let all highlighting complete first
        // }

        // Reset comparison flag and button after completion with small delay for visual feedback
        isComparing = false;
        lastMatchedQuestions = matched;

        // Auto update popup if it's visible
        if (matched.length > 0) {
            currentPopupTab = 'matched';
            updateQuestionsPopup(extensionQuestions);
        }

        // Compute unique matched question counts (one per DB question and per page question)
        // Normalize questions before dedup to handle minor textual differences
        const uniqueExtQuestions = new Set(matched.map(m => normalizeForExactMatch(m.extensionQuestion || '')).filter(Boolean));
        const uniquePageQuestions = new Set(matched.map(m => normalizeForExactMatch(m.pageQuestion || '')).filter(Boolean));
        const matchedUniqueCount = uniqueExtQuestions.size;
        const matchedUniquePageCount = uniquePageQuestions.size;

        if (debugMode) console.debug('[Tailieu Debug] matched unique counts', { matchedRaw: matched.length, matchedUniqueCount, matchedUniquePageCount });

        setTimeout(() => {
            // Prefer using unique matched PAGE count for the button label
            resetCompareButton(matchedUniquePageCount);
        }, 100); // Very short delay to show completion

        return { matched, pageQuestions, matchedUniqueCount, matchedUniquePageCount };
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
        const nextBtn = document.getElementById('tailieu-next-page');

        if (compareBtn) {
            // Remove animation
            compareBtn.style.animation = '';

            if (matchedCount > 0) {
                // Set button to "Làm lại" so user can clear and re-run the comparison
                compareBtn.style.animation = '';
                compareBtn.dataset.state = 'repeat';
                compareBtn.textContent = `Làm lại (${matchedCount})`;
                compareBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45A049)';
                compareBtn.style.transform = 'scale(1.05)';
                compareBtn.disabled = false;

                // Hiển thị nút Tiếp tục nếu có kết quả
                if (nextBtn) nextBtn.style.display = 'block';

                // Small celebration effect
                setTimeout(() => {
                    if (compareBtn) {
                        compareBtn.style.transform = 'scale(1)';
                    }
                }, 200);

                // Kiểm tra dữ liệu lỗi thời
                try {
                    chrome.storage.local.get(['tailieu_db_updated'], (res) => {
                        if (res && res.tailieu_db_updated) {
                            // Tìm container để hiển thị (indicator hoặc popup header)
                            const indicator = document.getElementById('tailieu-cached-indicator');
                            const popup = document.getElementById('tailieu-questions-popup');

                            // 1. Hiển thị trên indicator (banner xanh top-right)
                            if (indicator) {
                                let warningEl = indicator.querySelector('#tailieu-outdated-warning-indicator');
                                if (!warningEl) {
                                    warningEl = document.createElement('div');
                                    warningEl.id = 'tailieu-outdated-warning-indicator';
                                    warningEl.style.cssText = 'font-size: 10px; color: #FFEE58; margin-top: 4px; font-weight: bold; line-height: 1.2; width: 100%;';
                                    warningEl.textContent = ' Dữ liệu lỗi thời. Vui lòng cập nhật lại!';

                                    const innerDiv = indicator.querySelector('div');
                                    if (innerDiv) {
                                        indicator.style.flexDirection = 'column';
                                        indicator.style.alignItems = 'flex-start';
                                        indicator.appendChild(warningEl);
                                    }
                                }
                            }

                            // 2. Hiển thị trên popup chính (góc bottom-right)
                            if (popup) {
                                const header = popup.querySelector('div'); // Header is usually the first div
                                if (header && !header.querySelector('#tailieu-outdated-warning-popup')) {
                                    const warningEl = document.createElement('div');
                                    warningEl.id = 'tailieu-outdated-warning-popup';
                                    warningEl.style.cssText = 'font-size: 11px; color: #FFEE58; margin-top: 4px; font-weight: bold; line-height: 1.2; width: 100%;';
                                    warningEl.textContent = ' Dữ liệu câu hỏi lỗi thời. Vui lòng cập nhật lại!';
                                    header.style.flexDirection = 'column';
                                    header.style.alignItems = 'flex-start';
                                    header.appendChild(warningEl);
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error('Error checking tailieu_db_updated', e);
                }
                // Keep indicator visible; user can click "Làm lại" or manually close it
            } else {
                compareBtn.textContent = 'Không tìm thấy';
                compareBtn.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
                compareBtn.disabled = true;

                // Ẩn nút Tiếp tục nếu không có kết quả
                if (nextBtn) nextBtn.style.display = 'none';

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

    // Check if two questions are similar - Enhanced for 100% accuracy
    function isQuestionSimilar(q1, q2) {
        // Strict equality for questions: compare normalized question KEYs
        try {
            const k1 = normalizeQuestionKey(q1 || '');
            const k2 = normalizeQuestionKey(q2 || '');
            return (k1 && k2 && k1 === k2);
        } catch (e) {
            return false;
        }
    }

    // Extract key words from question text
    function extractKeyWords(text) {
        // Remove common question words and focus on content words
        const stopWords = new Set([
            'là', 'gì', 'nào', 'thế', 'như', 'sao', 'tại', 'vì', 'có', 'được', 'một', 'các', 'của', 'cho', 'với', 'về', 'trong', 'trên', 'dưới',
            'what', 'which', 'how', 'why', 'when', 'where', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'would'
        ]);

        return text
            .split(/[\s\.,!?]+/)
            .filter(word => word.length >= 3 && !stopWords.has(word))
            .map(word => word.toLowerCase())
            .slice(0, 10); // Take top 10 important words
    }

    // Check if questions have similar structure
    function haveSimilarStructure(q1, q2) {
        // Check for question markers
        const hasQuestionMark1 = q1.includes('?') || q1.includes('？');
        const hasQuestionMark2 = q2.includes('?') || q2.includes('？');

        // Check for common Vietnamese question patterns
        const questionPatterns = [
            /\b(là|gì|nào|sao|tại sao|vì sao|như thế nào|thế nào|bao nhiêu|khi nào|ở đâu)\b/g,
            /\b(what|which|how|why|when|where|who)\b/gi
        ];

        let patterns1 = 0, patterns2 = 0;
        questionPatterns.forEach(pattern => {
            if (pattern.test(q1)) patterns1++;
            if (pattern.test(q2)) patterns2++;
        });

        // Similar structure if both have question marks OR both have question patterns
        return (hasQuestionMark1 === hasQuestionMark2) && (Math.abs(patterns1 - patterns2) <= 1);
    }

    // Enhanced similarity calculation with multiple algorithms
    function calculateEnhancedSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;

        // 1. Levenshtein distance
        const levenshteinSim = calculateSimilarity(str1, str2);

        // 2. Jaccard similarity (word-based)
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        const jaccardSim = intersection.size / union.size;

        // 3. Longest common subsequence
        const lcsSim = calculateLCSimilarity(str1, str2);

        // Weighted combination - prioritize word-level matching
        return (levenshteinSim * 0.3) + (jaccardSim * 0.5) + (lcsSim * 0.2);
    }

    // Calculate Longest Common Subsequence similarity
    function calculateLCSimilarity(str1, str2) {
        const lcsLength = calculateLCS(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength > 0 ? lcsLength / maxLength : 0;
    }

    // Calculate Longest Common Subsequence
    function calculateLCS(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp[m][n];
    }

    // Final validation to ensure 100% accuracy before accepting a match
    function performFinalValidation(pageQuestionRaw, dbQuestionRaw) {
        // New strict rule: only accept if question keys are exactly equal (ignore accents, punctuation, spaces)
        try {
            // Clean both sides first to remove numbering/prefixes and normalize punctuation
            const cleanPage = cleanQuestionText((pageQuestionRaw || '').toString());
            const cleanDb = cleanQuestionText((dbQuestionRaw || '').toString());
            const qKey = normalizeQuestionKey(cleanPage || '');
            const dbKey = normalizeQuestionKey(cleanDb || '');
            if (qKey && dbKey && qKey === dbKey) {
                return { isValid: true, reason: 'Exact question key match', confidence: 1 };
            }

            // Fallback for image-only differences: if both contain image filenames, accept match when filenames intersect
            try {
                const filenamePattern = /([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg))/gi;
                const pageFiles = (nPage.match(filenamePattern) || []).map(s => s.toLowerCase());
                const dbFiles = (nDb.match(filenamePattern) || []).map(s => s.toLowerCase());
                if (pageFiles.length > 0 && dbFiles.length > 0) {
                    const intersection = pageFiles.filter(f => dbFiles.includes(f));
                    if (intersection.length > 0) {
                        if (debugMode)
                            //console.debug('[Tailieu Debug] performFinalValidation accepted by image filename intersection:', intersection, { nPage, nDb });
                            return { isValid: true, reason: 'Image filenames intersect', confidence: 0.95 };
                    }
                }
            } catch (e) { /* ignore fallback errors */ }

            return { isValid: false, reason: 'Not exact normalized match', confidence: 0 };
        } catch (e) {
            return { isValid: false, reason: 'Validation error', confidence: 0 };
        }
    }

    // Extract core content words (most important words)
    function extractCoreContent(text) {
        const stopWords = new Set([
            // Vietnamese stop words
            'là', 'gì', 'nào', 'thế', 'như', 'sao', 'tại', 'vì', 'có', 'được', 'một', 'các', 'của', 'cho', 'với', 'về', 'trong', 'trên', 'dưới',
            'và', 'hoặc', 'nhưng', 'mà', 'khi', 'nếu', 'để', 'từ', 'theo', 'bằng', 'sau', 'trước', 'giữa', 'cùng', 'còn', 'đã', 'sẽ', 'đang',
            // English stop words
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were',
            'what', 'which', 'how', 'why', 'when', 'where', 'who', 'do', 'does', 'did', 'can', 'could', 'will', 'would'
        ]);

        return text
            .split(/[\s\.,!?;:()]+/)
            .filter(word => word.length >= 3 && !stopWords.has(word.toLowerCase()))
            .map(word => word.toLowerCase());
    }

    // Calculate word overlap between two arrays
    function calculateWordOverlap(words1, words2) {
        if (words1.length === 0 || words2.length === 0) return 0;

        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(w => set2.has(w)));

        return intersection.size / Math.min(set1.size, set2.size);
    }

    // Validate critical terms (numbers, technical terms, proper nouns)
    function validateCriticalTerms(text1, text2) {
        // Extract critical terms: numbers, years, technical terms, proper nouns
        const criticalPattern = /\b(\d+(?:[.,]\d+)*|[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*|[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*)/g;

        const terms1 = new Set((text1.match(criticalPattern) || []).map(t => t.toLowerCase()));
        const terms2 = new Set((text2.match(criticalPattern) || []).map(t => t.toLowerCase()));

        if (terms1.size === 0 && terms2.size === 0) {
            return { isValid: true, confidence: 1.0, reason: 'No critical terms to compare' };
        }

        const overlap = calculateWordOverlap([...terms1], [...terms2]);

        // If there are critical terms, require high overlap
        if ((terms1.size > 0 || terms2.size > 0) && overlap < 0.6) {
            return {
                isValid: false,
                confidence: overlap,
                reason: `Critical terms overlap too low: ${overlap.toFixed(3)} (${[...terms1].join(',')} vs ${[...terms2].join(',')})`
            };
        }

        return { isValid: true, confidence: Math.max(0.8, overlap), reason: 'Critical terms match well' };
    }

    // Validate question context and structure
    function validateQuestionContext(text1, text2) {
        // Check for similar question types and structures
        const questionTypes1 = identifyQuestionType(text1);
        const questionTypes2 = identifyQuestionType(text2);

        // Must have at least one common question type
        const commonTypes = questionTypes1.filter(type => questionTypes2.includes(type));

        if (commonTypes.length === 0) {
            return {
                isValid: false,
                confidence: 0,
                reason: `Different question types: [${questionTypes1.join(',')}] vs [${questionTypes2.join(',')}]`
            };
        }

        // Check sentence structure similarity
        const structure1 = analyzeStructure(text1);
        const structure2 = analyzeStructure(text2);

        const structureSimilarity = compareStructures(structure1, structure2);

        if (structureSimilarity < 0.5) {
            return {
                isValid: false,
                confidence: structureSimilarity,
                reason: `Structure too different: ${structureSimilarity.toFixed(3)}`
            };
        }

        return {
            isValid: true,
            confidence: Math.max(0.7, structureSimilarity),
            reason: `Good context match: ${commonTypes.join(',')}`
        };
    }

    // Identify question type
    function identifyQuestionType(text) {
        const types = [];

        // Vietnamese question patterns
        if (/\b(là gì|gì là)\b/i.test(text)) types.push('definition');
        if (/\b(bao nhiêu|mấy)\b/i.test(text)) types.push('quantity');
        if (/\b(tại sao|vì sao|lý do)\b/i.test(text)) types.push('reason');
        if (/\b(khi nào|thời gian)\b/i.test(text)) types.push('time');
        if (/\b(ở đâu|đâu|địa điểm)\b/i.test(text)) types.push('location');
        if (/\b(như thế nào|thế nào|cách)\b/i.test(text)) types.push('method');
        if (/\b(ai|người nào)\b/i.test(text)) types.push('person');
        if (/\b(đúng|sai|có phải)\b/i.test(text)) types.push('boolean');

        // English question patterns
        if (/\bwhat\b/i.test(text)) types.push('what');
        if (/\b(how many|how much)\b/i.test(text)) types.push('quantity');
        if (/\bwhy\b/i.test(text)) types.push('reason');
        if (/\bwhen\b/i.test(text)) types.push('time');
        if (/\bwhere\b/i.test(text)) types.push('location');
        if (/\bhow\b/i.test(text)) types.push('method');
        if (/\bwho\b/i.test(text)) types.push('person');

        return types.length > 0 ? types : ['general'];
    }

    // Analyze text structure
    function analyzeStructure(text) {
        return {
            wordCount: text.split(/\s+/).length,
            hasQuestionMark: /[?？]/.test(text),
            hasNumbers: /\d/.test(text),
            hasCapitals: /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(text),
            endsWithQuestion: /[?？]\s*$/.test(text),
            startsWithQuestion: /^(what|which|how|why|when|where|who|là gì|gì|tại sao|vì sao|khi nào|ở đâu|như thế nào)/i.test(text)
        };
    }

    // Compare two structures
    function compareStructures(struct1, struct2) {
        let similarity = 0;
        let factors = 0;

        // Word count similarity
        const wordCountDiff = Math.abs(struct1.wordCount - struct2.wordCount);
        const maxWordCount = Math.max(struct1.wordCount, struct2.wordCount);
        similarity += maxWordCount > 0 ? (1 - wordCountDiff / maxWordCount) : 1;
        factors++;

        // Boolean features
        const booleanFeatures = ['hasQuestionMark', 'hasNumbers', 'hasCapitals', 'endsWithQuestion', 'startsWithQuestion'];
        booleanFeatures.forEach(feature => {
            similarity += struct1[feature] === struct2[feature] ? 1 : 0;
            factors++;
        });

        return factors > 0 ? similarity / factors : 0;
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

    // Find ALL correct answers for a question from extension questions (can be multiple answers for same question)
    function findAllCorrectAnswersForQuestion(questionText) {
        const cleanQuestion = cleanQuestionText(questionText);
        const correctAnswers = [];



        // Search through all extension questions for matching questions
        extensionQuestions.forEach(extQuestion => {
            const cleanExtQuestion = cleanQuestionText(extQuestion.question || '');

            // Check if questions are similar (same logic as isQuestionSimilar)
            if (isQuestionSimilar(cleanQuestion, cleanExtQuestion)) {
                if (extQuestion.answer && extQuestion.answer.trim()) {
                    const answer = extQuestion.answer.trim();
                    // Only add if not already in the list (avoid duplicates)
                    if (!correctAnswers.includes(answer)) {
                        correctAnswers.push(answer);

                    }
                }
            }
        });


        return correctAnswers;
    }

    // Find the primary CORRECT answer for a question from extension questions (first match)
    function findCorrectAnswerForQuestion(questionText) {
        const allAnswers = findAllCorrectAnswersForQuestion(questionText);
        return allAnswers.length > 0 ? allAnswers[0] : null;
    }

    // Find answers that actually exist on the page for a question
    function findValidAnswersOnPage(questionText, questionElement) {
        const allCorrectAnswers = findAllCorrectAnswersForQuestion(questionText);

        return allCorrectAnswers;
    }


    // Highlight matched question and try to find all possible answers - SIMPLIFIED like Hỗ Trợ HT
    function highlightMatchedQuestion(pageQuestion, extensionQuestion) {
        const element = pageQuestion.element;
        const container = pageQuestion.container || element.closest('.que');
        let answerContainer = pageQuestion.answerContainer || container?.querySelector('.answer');

        if (!element.classList.contains('tailieu-highlighted-question')) {
            // Only apply visual highlight/class when answer highlighting is enabled
            if (answerHighlightingEnabled) {
                // Mark question as highlighted
                element.style.color = 'red';
                element.classList.add('tailieu-highlighted-question');
            }

            // IMPORTANT: Get ALL correct answers from database for this question (not just one)
            const allCorrectAnswers = findAllCorrectAnswersForQuestion(extensionQuestion.question);

            if (!allCorrectAnswers || allCorrectAnswers.length === 0 || !answerHighlightingEnabled) {
                //console.log('[Tailieu Extension] Không có đáp án hoặc highlight bị tắt');
                return;
            }

            // Store matched answers on the question element for fast lookup when user clicks the icon
            try {
                if (element && allCorrectAnswers && allCorrectAnswers.length > 0) {
                    element.dataset.tailieuAnswers = JSON.stringify(allCorrectAnswers);
                    if (extensionQuestion && (extensionQuestion.id || extensionQuestion._id)) {
                        element.dataset.tailieuQuestionId = extensionQuestion.id || extensionQuestion._id;
                    }
                }
            } catch (e) { /* ignore dataset write errors */ }

            // Use the array of all answers instead of just one
            const correctAnswer = allCorrectAnswers; // This will be an array
            const normalizedAnswer = normalizeTextForMatching(allCorrectAnswers[0].toString());

            // Track total highlighted count for this question
            let totalHighlightedCount = 0;

            // If we don't have an explicit answerContainer, try heuristic
            if (!answerContainer) {
                const found = findAnswerContainerForQuestion(element);
                if (found) {
                    //console.log('[Tailieu Extension] Heuristic found answerContainer for question');
                    answerContainer = found;
                }
            }

            // Find answer options in the question container
            if (answerContainer) {
                // Method 1: Look for .flex-fill elements (NEU/Moodle structure)
                const flexFillOptions = answerContainer.querySelectorAll('.flex-fill');
                if (flexFillOptions.length > 0) {
                    //console.log('[Tailieu Extension] Tìm thấy', flexFillOptions.length, 'options dạng .flex-fill');
                    totalHighlightedCount = highlightMatchingOptions(flexFillOptions, normalizedAnswer, correctAnswer, pageQuestion, extensionQuestion);
                    showMultipleAnswersWarning(element, totalHighlightedCount);
                    return;
                }

                // Method 2: Look for label elements
                const labelOptions = answerContainer.querySelectorAll('label');
                if (labelOptions.length > 0) {
                    //console.log('[Tailieu Extension] Tìm thấy', labelOptions.length, 'options dạng label');
                    totalHighlightedCount = highlightMatchingOptions(labelOptions, normalizedAnswer, correctAnswer, pageQuestion, extensionQuestion);
                    showMultipleAnswersWarning(element, totalHighlightedCount);
                    return;
                }

                // Method 3: Look for any text elements within answer container
                const allTextElements = answerContainer.querySelectorAll('div, span, p');
                if (allTextElements.length > 0) {
                    //console.log('[Tailieu Extension] Tìm thấy', allTextElements.length, 'text elements');
                    totalHighlightedCount = highlightMatchingOptions(allTextElements, normalizedAnswer, correctAnswer, pageQuestion, extensionQuestion);
                    showMultipleAnswersWarning(element, totalHighlightedCount);
                    return;
                }

                // METHOD 4: If options appear to be images-only (no text), pass the image elements directly
                const imgOptions = answerContainer.querySelectorAll('img');
                if (imgOptions.length > 0) {
                    //console.log('[Tailieu Extension] Tìm thấy', imgOptions.length, 'image options');
                    // Wrap images into synthetic option wrappers for matching
                    const imgWrappers = Array.from(imgOptions).map(img => img.closest('label') || img.parentElement || img);
                    totalHighlightedCount = highlightMatchingOptions(imgWrappers, normalizedAnswer, correctAnswer, pageQuestion, extensionQuestion);
                    showMultipleAnswersWarning(element, totalHighlightedCount);
                    return;
                }
            }

            // Fallback: search in the entire question container
            if (container) {
                const allOptions = container.querySelectorAll('.flex-fill, label, .answer div, .answer span');
                //console.log('[Tailieu Extension] Fallback - Tìm trong container:', allOptions.length, 'options');
                totalHighlightedCount = highlightMatchingOptions(allOptions, normalizedAnswer, correctAnswer, pageQuestion, extensionQuestion);
                showMultipleAnswersWarning(element, totalHighlightedCount);
            }

            // Final fallback: try to find any instances on the page within question context (also consider images)
            const fallbackCount = highlightAllInstancesOfAnswer(correctAnswer, element, pageQuestion);
            if (fallbackCount > 0) {
                showMultipleAnswersWarning(element, fallbackCount);
            } else {
                // If still nothing, mark question as highlighted (so user sees matched question) and log
                element.style.backgroundColor = element.style.backgroundColor || '#f6fff6';
                element.style.borderLeft = element.style.borderLeft || '4px solid #2E7D32';
                const qaQuestionOnly = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: correctAnswer, matchType: 'QUESTION_ONLY' };
                highlightedQA.push(qaQuestionOnly);
            }
        }
    }

    // Show warning badge when multiple answers are highlighted for a question
    function showMultipleAnswersWarning(questionElement, highlightedCount) {
        if (!questionElement || highlightedCount <= 1) return;

        // Check if warning already exists
        if (questionElement.querySelector('.tailieu-multiple-answers-warning')) return;

        // Create warning badge
        const warningBadge = document.createElement('span');
        warningBadge.className = 'tailieu-multiple-answers-warning';
        warningBadge.innerHTML = ` Cần tự xác định đáp án đúng! (${highlightedCount} đáp án)`;
        warningBadge.style.cssText = `
        display: inline-block;
        margin-left: 10px;
        padding: 4px 10px;
        background: linear-gradient(135deg, #ff9800, #f57c00);
        color: black;
        font-size: 12px;
        font-weight: bold;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(255, 152, 0, 0.4);
        animation: warningPulse 2s ease-in-out infinite;
        vertical-align: middle;
    `;

        // Add animation style if not exists
        if (!document.getElementById('tailieu-warning-styles')) {
            const styles = document.createElement('style');
            styles.id = 'tailieu-warning-styles';
            styles.textContent = `
            @keyframes warningPulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.02); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
            document.head.appendChild(styles);
        }

        // Append warning to question element
        questionElement.appendChild(warningBadge);

        //console.log('[Tailieu Extension]  Cảnh báo: Câu hỏi có', highlightedCount, 'đáp án được highlight - cần tự xác định!');
    }

    // Create and show an answer tooltip next to a question element
    function createAnswerTooltip(questionElement, answers) {
        if (!questionElement || !answers || answers.length === 0) return;
        hideAnswerTooltip(questionElement);

        const tooltip = document.createElement('div');
        tooltip.className = 'tailieu-answer-tooltip';
        tooltip.dataset.tailieuTooltip = '1';
        tooltip.style.cssText = `
        position: absolute;
        z-index: 10002;
        background: rgba(44,62,80,0.98);
        color: white;
        padding: 10px;
        border-radius: 8px;
        max-width: 360px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        font-size: 13px;
        line-height: 1.3;
    `;

        let inner = '<div style="display:flex;flex-direction:column;gap:6px; margin-bottom: 2px;">';
        answers.forEach((ans, i) => {
            // Sử dụng bộ renderer chung để hiển thị ảnh (hỗ trợ cả link trong dấu nháy)
            const rendered = (typeof window.tailieuImageRenderer !== 'undefined')
                ? window.tailieuImageRenderer.renderImages(ans)
                : String(ans).replace(/</g, '&lt;').replace(/>/g, '&gt;');

            inner += `<div style="padding:4px 0; border-bottom: 1px solid rgba(255,255,255,0.1)">` +
                `<span style="font-weight: 500">${rendered}</span>` +
                '</div>';
        });
        inner += '</div>';
        tooltip.innerHTML = inner;

        document.body.appendChild(tooltip);

        // Position tooltip relative to questionElement (the icon)
        const rect = questionElement.getBoundingClientRect();
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;

        // Mặc định hiển thị bên phải icon
        let left = window.scrollX + rect.right + 12;
        let top = window.scrollY + rect.top + (rect.height / 2) - (th / 2);

        // Nếu tràn bên phải màn hình thì hiển thị bên trái icon
        if (rect.right + 12 + tw > window.innerWidth) {
            left = window.scrollX + rect.left - tw - 12;
        }

        // Đảm bảo không tràn lề trái
        if (left < window.scrollX + 10) left = window.scrollX + 10;

        // Đảm bảo không tràn lề trên/dưới
        const viewportTop = window.scrollY + 10;
        const viewportBottom = window.scrollY + window.innerHeight - 10;

        if (top < viewportTop) top = viewportTop;
        if (top + th > viewportBottom) {
            top = Math.max(viewportTop, viewportBottom - th);
        }

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';

        // Remove tooltip on click outside
        const outsideHandler = (e) => {
            if (!tooltip.contains(e.target) && !questionElement.contains(e.target)) {
                hideAnswerTooltip(questionElement);
                document.removeEventListener('click', outsideHandler);
            }
        };
        document.addEventListener('click', outsideHandler);
    }

    function hideAnswerTooltip(questionElement) {
        // Remove any tooltip created for this extension
        const all = document.querySelectorAll('.tailieu-answer-tooltip');
        all.forEach(t => t.remove());
    }

    // Expose safe wrappers so other modules won't accidentally override tooltip behavior
    try {
        if (typeof window !== 'undefined') {
            window.tailieuShowAnswerTooltip = createAnswerTooltip;
            window.tailieuHideAnswerTooltip = hideAnswerTooltip;
        }
    } catch (e) { /* ignore */ }

    // Helper function to highlight matching options - IMPROVED FOR MULTIPLE DB ANSWERS
    // Now highlights ALL matching options instead of just the first one
    function highlightMatchingOptions(options, normalizedAnswer, originalAnswer, pageQuestion = null, extensionQuestion = null) {
        let highlightedCount = 0; // Track number of highlighted options

        // Handle array answers (multiple correct)
        const answersToMatch = Array.isArray(originalAnswer) ? originalAnswer : [originalAnswer];
        const normalizedAnswers = answersToMatch
            .map(a => normalizeTextForMatching((a || '').toString()))
            .filter(a => a && a.length > 0);
        // Also check if any answers are images (URLs or <img> tags)
        const imageAnswers = answersToMatch
            .map(a => extractImageSrcFromString(a))
            .filter(a => a && a.length > 0);
        const imageFingerprints = imageAnswers.map(src => fingerprintImagePath(src));
        const webOptions = [];
        options.forEach((option, index) => {
            if (isExtensionElement(option)) return;

            // Bỏ qua các phần tử metadata của Moodle để tránh highlight nhầm
            if (option.matches && (
                option.matches('.info') ||
                option.matches('.state') ||
                option.matches('.grade') ||
                option.matches('.questionflag') ||
                option.closest('.info')
            )) return;

            // Sử dụng ContentImageHandler để lấy text bao gồm cả URL ảnh cho đáp án
            const hasCImgH = typeof window.tailieuContentImageHandler !== 'undefined';
            let optionText = hasCImgH ?
                window.tailieuContentImageHandler.getConcatenatedText(option) :
                (option.textContent?.trim() || '');

            let normalizedOption = normalizeTextForMatching(optionText);

            // IMPORTANT: Remove answer prefix (a., b., c., d.) to match DB format
            // DB answers don't have these prefixes, so we need to strip them for comparison
            normalizedOption = normalizedOption.replace(/^[a-dA-D]\s*[\.\)]\s*/, '').trim();

            // If option text is still empty/short even with images, try ALT or filename fallback
            if (normalizedOption.length < 2) {
                const img = option.querySelector && (option.querySelector('img') || option.querySelector('picture img'));
                let imgText = '';
                if (img) {
                    imgText = img.alt || img.title || img.getAttribute('aria-label') || '';
                    if (!imgText && img.src) {
                        // Use filename as fallback
                        try {
                            const parts = img.src.split('/');
                            imgText = parts[parts.length - 1].split('?')[0].replace(/[-_]+/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '');
                        } catch (e) {
                            imgText = '';
                        }
                    }
                    imgText = normalizeTextForMatching(imgText);
                    if (imgText && imgText.length > 1) {
                        //console.log('[Tailieu Extension] Option', index, 'has image text:', imgText.substring(0,80));
                        normalizedOption = imgText;
                        optionText = imgText;
                    }
                }
            }

            if (normalizedOption.length >= 2) {
                webOptions.push({
                    element: option,
                    originalText: optionText,
                    normalizedText: normalizedOption,
                    index: index
                });
            }
        });

        //console.log('[Tailieu Extension] Extracted', webOptions.length, 'valid web options');

        // Debug: show extracted web options and DB answers when in debugMode
        if (debugMode) {
            try {
                const webSummary = webOptions.map(o => ({ index: o.index, normalized: o.normalizedText, original: o.originalText && o.originalText.slice(0, 200) }));
                const answersSummary = normalizedAnswers.slice(0, 10);
                console.debug('[Tailieu Debug] highlightMatchingOptions - webOptions:', webSummary);
                console.debug('[Tailieu Debug] highlightMatchingOptions - normalizedAnswers:', answersSummary);
            } catch (e) { /* ignore logging errors */ }
        }

        // Track which web options have been highlighted to avoid duplicate processing
        const highlightedWebIndices = new Set();

        // LOGIC: Highlight TẤT CẢ các đáp án khớp (không dừng ở match đầu tiên)
        // Nếu số đáp án trong DB > 4: Lấy từng đáp án a,b,c,d từ web so sánh với DB
        if (normalizedAnswers.length > 4) {
            //console.log('[Tailieu Extension] ⚙️ Strategy: DB answers > 4, comparing WEB options against DB answers');

            webOptions.forEach((webOpt) => {
                // Bỏ qua nếu option này đã được highlight
                if (highlightedWebIndices.has(webOpt.index)) return;

                //console.log('[Tailieu Extension] Checking web option', webOpt.index, ':', webOpt.normalizedText.substring(0, 80));

                // So sánh option này với TẤT CẢ các đáp án trong DB
                for (const normalizedAns of normalizedAnswers) {
                    if (normalizedAns.length < 2) continue;

                    // Prepare strict-normalized forms for exact comparison (ignore punctuation)
                    const webExact = normalizeForExactMatch(webOpt.normalizedText || webOpt.originalText || '');
                    const dbExact = normalizeForExactMatch(normalizedAns || '');

                    // STRICT EXACT MATCH (configurable)
                    if (STRICT_ANSWER_EXACT_MATCH) {
                        // Strict answer equality: only accept when normalized answer KEYs are identical
                        // (ignoring punctuation, whitespace and similar minor differences)
                        const webKey = normalizeAnswerKey(webExact);
                        const dbKey = normalizeAnswerKey(dbExact);
                        if (dbKey && webKey && webKey === dbKey) {
                            applyHighlightStyle(webOpt.element);
                            const qaExact = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: Array.isArray(originalAnswer) ? originalAnswer.join(' | ') : originalAnswer, matchedText: webOpt.originalText, matchType: 'EXACT_WEB_TO_DB' };
                            highlightedQA.push(qaExact);
                            highlightedCount++;
                            highlightedWebIndices.add(webOpt.index);
                            break; // Stop checking DB answers for this web option
                        }

                        // Do NOT accept partial/startsWith/endsWith matches in strict mode to avoid false-positives
                        continue;
                    }

                    // NON-STRICT: preserve existing heuristics (contains/reverse/similarity)
                    let matched = false;

                    // EXACT MATCH
                    if (webOpt.normalizedText === normalizedAns) {
                        applyHighlightStyle(webOpt.element);
                        const qaExact = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: Array.isArray(originalAnswer) ? originalAnswer.join(' | ') : originalAnswer, matchedText: webOpt.originalText, matchType: 'EXACT_WEB_TO_DB' };
                        highlightedQA.push(qaExact);
                        highlightedCount++;
                        highlightedWebIndices.add(webOpt.index);
                        matched = true;
                    }

                    // CONTAINS MATCH
                    if (!matched && webOpt.normalizedText.includes(normalizedAns) && normalizedAns.length > 10) {
                        applyHighlightStyle(webOpt.element);
                        const qaContains = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: Array.isArray(originalAnswer) ? originalAnswer.join(' | ') : originalAnswer, matchedText: webOpt.originalText, matchType: 'CONTAINS_WEB_TO_DB' };
                        highlightedQA.push(qaContains);
                        highlightedCount++;
                        highlightedWebIndices.add(webOpt.index);
                        matched = true;
                    }

                    // REVERSE CONTAINS
                    if (!matched && normalizedAns.includes(webOpt.normalizedText) && webOpt.normalizedText.length > 10) {
                        applyHighlightStyle(webOpt.element);
                        const qaReverse = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: Array.isArray(originalAnswer) ? originalAnswer.join(' | ') : originalAnswer, matchedText: webOpt.originalText, matchType: 'REVERSE_CONTAINS_WEB_TO_DB' };
                        highlightedQA.push(qaReverse);
                        highlightedCount++;
                        highlightedWebIndices.add(webOpt.index);
                        matched = true;
                    }

                    // SIMILARITY CHECK
                    if (!matched && webOpt.normalizedText.length > 15 && normalizedAns.length > 15) {
                        const similarity = calculateSimilarity(webOpt.normalizedText, normalizedAns);
                        if (similarity > 0.90) {
                            applyHighlightStyle(webOpt.element);
                            const qaSim = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: Array.isArray(originalAnswer) ? originalAnswer.join(' | ') : originalAnswer, matchedText: webOpt.originalText, matchType: 'SIMILARITY_WEB_TO_DB', similarity: similarity };
                            highlightedQA.push(qaSim);
                            highlightedCount++;
                            highlightedWebIndices.add(webOpt.index);
                            matched = true;
                        }
                    }

                    if (matched) break; // Tìm thấy match cho web option này, chuyển sang web option tiếp theo
                }
            });
        } else {
            // Số đáp án trong DB <= 4: Lấy từng đáp án từ DB so sánh với web options
            // Thay vì áp dụng các kiểm tra contains/substring đơn giản (dễ gây false-positive khi nhiều options chia sẻ tiền tố),
            // ta tính điểm tương đồng cho từng option, chọn option tốt nhất và chỉ highlight khi đó là kết quả rõ ràng.
            normalizedAnswers.forEach((normalizedAns, ansIndex) => {
                if (normalizedAns.length < 2) return;

                const dbExact = normalizeForExactMatch(normalizedAns || '');
                if (!dbExact) return;

                const scores = [];
                for (const webOpt of webOptions) {
                    if (highlightedWebIndices.has(webOpt.index)) continue;

                    const webExact = normalizeForExactMatch(webOpt.normalizedText || webOpt.originalText || '');

                    // Highest priority: exact normalized match using strict answer key
                    try {
                        const webKey = normalizeAnswerKey(webExact);
                        const dbKey = normalizeAnswerKey(dbExact);
                        if (webKey && dbKey && webKey === dbKey) {
                            scores.push({ webOpt, score: 1.0, reason: 'exact' });
                            continue;
                        }
                    } catch (e) {
                        // fallback to previous compareNormalized if helper fails
                        if (webExact && dbExact && compareNormalized(webExact, dbExact)) {
                            scores.push({ webOpt, score: 1.0, reason: 'exact' });
                            continue;
                        }
                    }

                    // Compute combined similarity score
                    const sim = calculateEnhancedSimilarity(webOpt.normalizedText || webOpt.originalText || '', normalizedAns || '');
                    scores.push({ webOpt, score: sim, reason: 'similarity' });
                }

                if (scores.length === 0) return;
                scores.sort((a, b) => b.score - a.score);
                const best = scores[0];
                const second = scores[1] || { score: 0 };

                // Decision: accept if exact OR clear high-confidence winner
                if (best.reason === 'exact' || (best.score >= 0.95 && (best.score - second.score) >= 0.03)) {
                    applyHighlightStyle(best.webOpt.element);
                    const qa = { question: pageQuestion?.text || pageQuestion?.originalText || 'unknown', dbAnswer: Array.isArray(originalAnswer) ? originalAnswer.join(' | ') : originalAnswer, matchedText: best.webOpt.originalText, matchType: best.reason === 'exact' ? 'EXACT_DB_TO_WEB' : 'BEST_SIMILARITY_DB_TO_WEB', similarity: best.score };
                    highlightedQA.push(qa);
                    highlightedCount++;
                    highlightedWebIndices.add(best.webOpt.index);
                }
            });
        }

        // // Log debug info nếu không tìm được match nào
        // if (highlightedCount === 0) {
        //     //console.log('[Tailieu Extension] Không tìm thấy match - Web options:');
        //     webOptions.forEach((opt, i) => {
        //         console.log('  ', i, ':', opt.normalizedText.substring(0, 100));
        //     });
        //     //console.log('[Tailieu Extension] DB answers:');
        //     normalizedAnswers.forEach((ans, i) => {
        //         console.log('  ', i, ':', ans.substring(0, 100));
        //     });
        // }

        // Debug: If nothing was highlighted, log candidates for troubleshooting
        if (debugMode && highlightedCount === 0) {
            try {
                console.debug('[Tailieu Debug] highlightMatchingOptions: NO HIGHLIGHTS. webOptions:', webOptions.map(o => ({ i: o.index, n: o.normalizedText, orig: (o.originalText || '').slice(0, 120) })), 'normalizedAnswers:', normalizedAnswers);
            } catch (e) { /* ignore */ }
        }

        // Return the count so caller can show warning if multiple answers highlighted
        return highlightedCount;
    }

    // Calculate text similarity (Levenshtein-based)
    function calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1;

        // Simple overlap-based similarity (faster than Levenshtein)
        const words1 = str1.split(/\s+/).filter(w => w.length > 2);
        const words2 = str2.split(/\s+/).filter(w => w.length > 2);

        if (words1.length === 0 || words2.length === 0) return 0;

        let matches = 0;
        for (const word of words1) {
            if (words2.some(w => w === word || w.includes(word) || word.includes(w))) {
                matches++;
            }
        }

        return matches / Math.max(words1.length, words2.length);
    }

    // Apply highlight style to an element - SIMPLE GREEN BACKGROUND
    function applyHighlightStyle(element) {
        if (element.classList.contains('tailieu-answer-highlight')) return;

        element.style.backgroundColor = '#2cdb4c9c';
        element.classList.add('tailieu-answer-highlight');
        element.title = 'Đây là đáp án đúng!';

        // After highlighting visually, try to select the corresponding input (radio/checkbox)
        try {
            selectMatchingInput(element);
        } catch (e) {
            console.warn('[Tailieu Extension] selectMatchingInput failed:', e);
        }
    }

    // Try to find and select the input associated with an option element
    function selectMatchingInput(optionElement) {
        if (!optionElement) return false;

        // Don't auto-select if auto-select is disabled in popup (we still allow visual highlight)
        if (!autoSelectEnabled) return false;

        // Helper to dispatch events so frameworks notice the change
        function dispatchChange(el) {
            try {
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                // ignore
            }
        }

        // 1) If the option element itself contains an input
        const innerInput = optionElement.querySelector && optionElement.querySelector('input[type="radio"], input[type="checkbox"]');
        if (innerInput) {
            innerInput.checked = true;
            dispatchChange(innerInput);
            return true;
        }

        // 2) If the option element is or is inside a <label>, try to click the label
        const label = optionElement.closest && optionElement.closest('label');
        if (label) {
            label.click();
            // If label has an associated input via for="id"
            const forId = label.getAttribute && label.getAttribute('for');
            if (forId) {
                const input = document.getElementById(forId);
                if (input) {
                    input.checked = true;
                    dispatchChange(input);
                }
            }
            return true;
        }

        // 3) Search nearby inputs: previous siblings, parent, or container
        // Check siblings and parents up to a small depth
        let el = optionElement;
        for (let i = 0; i < 4 && el; i++) {
            // check previous siblings
            let prev = el.previousElementSibling;
            while (prev) {
                if (prev.matches && prev.matches('input[type="radio"], input[type="checkbox"]')) {
                    prev.checked = true;
                    dispatchChange(prev);
                    return true;
                }
                // sometimes input is inside the sibling
                const inside = prev.querySelector && prev.querySelector('input[type="radio"], input[type="checkbox"]');
                if (inside) {
                    inside.checked = true;
                    dispatchChange(inside);
                    return true;
                }
                prev = prev.previousElementSibling;
            }

            // check parent for direct input
            const parentInput = el.parentElement && el.parentElement.querySelector && el.parentElement.querySelector('input[type="radio"], input[type="checkbox"]');
            if (parentInput) {
                parentInput.checked = true;
                dispatchChange(parentInput);
                return true;
            }

            el = el.parentElement;
        }

        // 4) As a last resort, try to find an input near by within the same question container
        const questionContainer = findQuestionContainer(optionElement, { text: optionElement.textContent || '' }) || optionElement.closest('.que') || document.body;
        if (questionContainer) {
            const candidate = questionContainer.querySelector('input[type="radio"], input[type="checkbox"]');
            if (candidate) {
                candidate.checked = true;
                dispatchChange(candidate);
                return true;
            }
        }

        return false;
    }


    // Helper function to extract question number from text
    function extractQuestionNumber(text) {
        if (!text) return null;

        // Look for various question number patterns
        const patterns = [
            /câu\s*(?:hỏi\s*)?(\d+)/i,
            /question\s*(\d+)/i,
            /^\s*(\d+)[\.\)]/,
            /^(\d+)\s*[\.]/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
        return null;
    }

    // Helper function to find the container that holds both question and its answers
    function findQuestionContainer(questionElement, pageQuestion) {
        if (!questionElement || !pageQuestion) return null;

        const questionNumber = extractQuestionNumber(pageQuestion.text);

        let container = questionElement;
        let maxDepth = 5; // Limit depth to avoid going too far up
        let bestContainer = null;
        let bestScore = 0;

        // Look for common question-answer container patterns
        while (container && container.parentElement && maxDepth > 0) {
            const parent = container.parentElement;

            // Check if parent looks like a question container
            const hasQuestionIndicators = parent.className &&
                parent.className.match(/(question|cau|item|quiz|test|exercise)/i);

            // Check if parent has a reasonable size to contain both question and answers
            const hasReasonableSize = parent.children.length >= 2 && parent.children.length <= 20;

            // Check if parent contains answer-like elements
            const hasAnswerElements = parent.querySelectorAll('*').length > 0 &&
                Array.from(parent.querySelectorAll('*')).some(el =>
                    el.textContent && (
                        el.className.match(/(answer|option|choice|dap-an)/i) ||
                        el.textContent.match(/^[abcd][\.\)]/i) ||
                        el.textContent.match(/^\s*[①②③④⑤]/i)
                    )
                );

            // NEW: Check if this container has the same question number
            let hasMatchingQuestionNumber = false;
            if (questionNumber) {
                const containerText = parent.textContent || '';
                const containerQuestionNumber = extractQuestionNumber(containerText);
                if (containerQuestionNumber === questionNumber) {
                    hasMatchingQuestionNumber = true;
                }
            }

            // Calculate score for this container
            let score = 0;
            if (hasQuestionIndicators) score += 3;
            if (hasAnswerElements) score += 3;
            if (hasReasonableSize) score += 2;
            if (hasMatchingQuestionNumber) score += 5; // High priority for matching question number

            // NEW: Penalty for containers that span multiple questions
            const hasMultipleQuestions = questionNumber && parent.textContent &&
                parent.textContent.match(/câu\s*(?:hỏi\s*)?(\d+)/gi)?.length > 1;
            if (hasMultipleQuestions) score -= 3;

            if (score > bestScore) {
                bestScore = score;
                bestContainer = parent;
            }


            container = parent;
            maxDepth--;
        }

        if (bestContainer) {
            const questionMatches = bestContainer.textContent.match(/câu\s*(?:hỏi\s*)?\d+/gi);
            if (questionMatches && questionMatches.length > 1) {
                // Nếu container có nhiều câu hỏi, chỉ trả về chính questionElement và các sibling kế tiếp
                if (questionElement.parentElement) {
                    const siblings = Array.from(questionElement.parentElement.children);
                    const idx = siblings.indexOf(questionElement);
                    return siblings.slice(idx, idx + 4); // chính nó và 3 sibling sau
                } else {
                    return [questionElement];
                }
            }
            return [bestContainer];
        }
        // Fallback: chỉ trả về chính nó và 2 sibling sau
        if (questionElement.parentElement) {
            const siblings = Array.from(questionElement.parentElement.children);
            const idx = siblings.indexOf(questionElement);
            return siblings.slice(idx, idx + 3);
        }
        return [questionElement];
    }

    // Helper function to check if an element belongs to the current question
    function belongsToCurrentQuestion(element, questionElement, pageQuestion) {
        if (!pageQuestion || !questionElement) return true; // Fallback to allow

        const questionNumber = extractQuestionNumber(pageQuestion.text);
        if (!questionNumber) return true; // Can't determine, allow

        // Check if element contains a different question number
        const elementText = element.textContent || '';
        const elementQuestionNumber = extractQuestionNumber(elementText);

        if (elementQuestionNumber && elementQuestionNumber !== questionNumber) {
            return false;
        }

        // Check if element is within the question container
        const questionContainer = findQuestionContainer(questionElement, pageQuestion);
        if (questionContainer && !questionContainer.contains(element)) {
            return false;
        }

        // Additional check: if element is very far from question element
        const rect1 = questionElement.getBoundingClientRect();
        const rect2 = element.getBoundingClientRect();
        const distance = Math.abs(rect1.top - rect2.top);

        // If elements are more than 800px apart vertically, they're likely different questions
        if (distance > 800) {
            return false;
        }

        return true;
    }

    // Heuristic to find answer container near a question element for non-Moodle pages
    function findAnswerContainerForQuestion(questionElement) {
        if (!questionElement) return null;

        // Common candidate selectors
        const selectors = ['.answer', '.answers', '.choices', '.options', '.answer-container', '.qanswers', '.answers-list', 'ul.options', 'ol.options', '.form-check'];

        // 1) Check immediate siblings and parent
        const parent = questionElement.parentElement;
        if (parent) {
            for (const sel of selectors) {
                const found = parent.querySelector(sel);
                if (found && !isExtensionElement(found)) return found;
            }
            // Check next siblings (a few steps)
            let sib = questionElement.nextElementSibling;
            let steps = 0;
            while (sib && steps < 6) {
                // If sibling looks like an answer list (has inputs or letters A. B.)
                if (!isExtensionElement(sib)) {
                    for (const sel of selectors) {
                        if (sib.matches && sib.matches(sel)) return sib;
                    }
                    // Quick heuristic: contains radio/checkbox inputs or A./B./C. markers
                    if (sib.querySelector && (sib.querySelector('input[type="radio"], input[type="checkbox"]') || /(^|\s)[A-Da-d][\.|\)]\s/.test(sib.textContent))) {
                        return sib;
                    }
                }
                sib = sib.nextElementSibling;
                steps++;
            }
        }

        // 2) Check ancestors for answer-like sections
        let anc = questionElement.parentElement;
        let depth = 0;
        while (anc && depth < 5) {
            for (const sel of selectors) {
                const found = anc.querySelector(sel);
                if (found && !isExtensionElement(found)) return found;
            }
            anc = anc.parentElement;
            depth++;
        }

        // 3) As a last resort, search nearby in document (limited scope)
        const nearby = questionElement.closest('section, article, form, .content, body') || document.body;
        for (const sel of selectors) {
            const found = nearby.querySelector(sel);
            if (found && !isExtensionElement(found)) return found;
        }

        return null;
    }

    // Helpers to detect/normalize image answers (DB may store an <img> tag or image URL)
    function isImageString(str) {
        if (!str) return false;
        const s = ('' + str).toLowerCase();
        return /<img\s/i.test(s) || /^data:image\//i.test(s) || /(https?:)?\/\/.*\.(png|jpe?g|gif|svg)(\?|$)/i.test(s) || /\.(png|jpe?g|gif|svg)$/i.test(s);
    }

    function extractImageSrcFromString(str) {
        if (!str) return null;
        try {
            const s = ('' + str).trim();
            // If contains <img ... src="...">
            const imgMatch = s.match(/<img[^>]+src=["']?([^"' >\s]+)["']?/i);
            if (imgMatch && imgMatch[1]) return imgMatch[1];

            // If contains quoted URL (possibly truncated "..../xxx.png")
            const quotedMatch = s.match(/"((?:https?:\/\/|(?:\.){3,}\/)[^"]+)"/i);
            if (quotedMatch) return quotedMatch[1];

            // If looks like a url
            const urlMatch = s.match(/(https?:)?\/\/[^\s"']+/i);
            if (urlMatch) return urlMatch[0];
            // If plain filename
            const fileMatch = s.match(/([^\s\/]+\.(png|jpe?g|gif|svg))(\?|$)/i);
            if (fileMatch) return fileMatch[1];
        } catch (e) {
            return null;
        }
        return null;
    }

    function fingerprintImagePath(src) {
        if (!src) return '';
        try {
            const parts = src.split('/');
            let last = parts[parts.length - 1] || src;
            last = last.split('?')[0].split('#')[0];
            return last.toLowerCase().replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/, '').trim();
        } catch (e) {
            return src.toLowerCase();
        }
    }

    // NEW: Function to highlight ALL instances of an answer on the page (not just the first one)
    function highlightAllInstancesOfAnswer(answerText, questionElement, pageQuestion = null) {
        // Handle array of answers - highlight all of them
        if (Array.isArray(answerText)) {
            let totalHighlighted = 0;
            for (const singleAnswer of answerText) {
                if (singleAnswer && typeof singleAnswer === 'string' && singleAnswer.trim()) {
                    totalHighlighted += highlightAllInstancesOfAnswer(singleAnswer, questionElement, pageQuestion);
                }
            }
            return totalHighlighted;
        }

        if (!answerText || (typeof answerText === 'string' && answerText.trim() === '') || !answerHighlightingEnabled) {
            return 0;
        }

        const cleanAnswer = cleanAnswerText(answerText);
        const answerPatterns = generateAnswerPatterns(cleanAnswer);

        // Determine search scope
        const searchContainers = [];
        if (pageQuestion && questionElement) {
            const questionContainers = findQuestionContainer(questionElement, pageQuestion);
            if (questionContainers && Array.isArray(questionContainers)) {
                questionContainers.forEach(el => {
                    if (el && !isExtensionElement(el)) searchContainers.push(el);
                });
            }
        }

        if (searchContainers.length === 0) {
            searchContainers.push(
                questionElement.parentElement || document.body,
                questionElement
            );
        }

        // Collect all candidate elements (same logic as highlightAnswerOnPage)
        const candidateElements = new Set();

        for (const container of searchContainers) {
            if (pageQuestion && container !== questionElement && container !== questionElement.parentElement) {
                const allElements = container.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.textContent && el.textContent.trim().length > 0 &&
                        !isExtensionElement(el) &&
                        !['SCRIPT', 'STYLE'].includes(el.tagName?.toUpperCase()) &&
                        belongsToCurrentQuestion(el, questionElement, pageQuestion)) {
                        candidateElements.add(el);
                    }
                });
                if (container.textContent && container.textContent.trim().length > 0) {
                    candidateElements.add(container);
                }
            }
            else if (container === questionElement.parentElement ||
                (searchContainers.length > 1 && container !== questionElement)) {
                if (container === questionElement.parentElement) {
                    const siblings = Array.from(container.children);
                    const questionIndex = siblings.indexOf(questionElement);
                    const searchRange = pageQuestion ?
                        { start: questionIndex, end: Math.min(questionIndex + 5, siblings.length) } :
                        { start: Math.max(0, questionIndex - 2), end: Math.min(questionIndex + 10, siblings.length) };

                    for (let i = searchRange.start; i < searchRange.end; i++) {
                        if (siblings[i] && !isExtensionElement(siblings[i]) &&
                            belongsToCurrentQuestion(siblings[i], questionElement, pageQuestion)) {
                            candidateElements.add(siblings[i]);
                            siblings[i].querySelectorAll('*').forEach(el => {
                                if (el.tagName && !['SCRIPT', 'STYLE'].includes(el.tagName.toUpperCase()) &&
                                    !el.hidden && el.textContent.trim().length > 0 && !isExtensionElement(el) &&
                                    belongsToCurrentQuestion(el, questionElement, pageQuestion)) {
                                    candidateElements.add(el);
                                }
                            });
                        }
                    }
                } else {
                    container.querySelectorAll('*').forEach(el => {
                        if (el.textContent && el.textContent.trim().length > 0 && !isExtensionElement(el) &&
                            belongsToCurrentQuestion(el, questionElement, pageQuestion)) {
                            candidateElements.add(el);
                        }
                    });
                }
            }
            else if (container === questionElement) {
                questionElement.querySelectorAll('*').forEach(el => {
                    if (!isExtensionElement(el)) {
                        candidateElements.add(el);
                    }
                });
            }
        }

        const elementsArray = Array.from(candidateElements).filter(el =>
            el && el.textContent && el.textContent.trim().length > 2 &&
            !isExtensionElement(el) &&
            !el.classList.contains('tailieu-answer-highlight')
        );

        // Find ALL matches (not just the best one)
        const allMatches = [];

        for (const candidateElement of elementsArray) {
            if (isExtensionElement(candidateElement)) continue;

            let elementText = candidateElement.textContent?.toLowerCase().trim() || '';
            // If element has no text but contains an image, try image alt/src as text
            if ((!elementText || elementText.length < 2) && candidateElement.querySelector) {
                const img = candidateElement.querySelector('img');
                if (img) {
                    elementText = img.alt || img.title || img.getAttribute('aria-label') || '';
                    if (!elementText && img.src) {
                        try {
                            const parts = img.src.split('/');
                            elementText = parts[parts.length - 1].split('?')[0].replace(/[-_]+/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '');
                        } catch (e) {
                            elementText = '';
                        }
                    }
                    elementText = elementText.toLowerCase().trim();
                }
            }
            if (elementText.length < 2) continue;
            if (candidateElement.classList.contains('tailieu-answer-highlight')) continue;

            for (const pattern of answerPatterns) {
                const patternLower = pattern.toLowerCase().trim();
                if (patternLower.length < 2) continue;

                // STRICT MATCHING: Normalize both texts (remove special chars, punctuation, extra spaces)
                // Same logic as question comparison
                const normalizedElement = normalizeTextForMatching(elementText);
                const normalizedPattern = normalizeTextForMatching(patternLower);

                // Only match if EXACTLY the same after normalization
                let isExactMatch = false;
                let matchScore = 0;

                if (normalizedElement === normalizedPattern) {
                    isExactMatch = true;
                    matchScore = 1.0;
                }

                // REMOVED all fuzzy matching logic (includes, contains, etc.)
                // Only EXACT matches are allowed

                if (isExactMatch) {
                    allMatches.push({
                        element: candidateElement,
                        pattern: pattern,
                        score: matchScore,
                        elementText: elementText,
                        patternLength: pattern.length,
                        isExactMatch: true,
                        normalizedElement: normalizedElement,
                        normalizedPattern: normalizedPattern
                    });
                }
            }
        }

        // Sort by score
        allMatches.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 0.01) {
                return b.score - a.score;
            }
            const aIsPerfectText = a.elementText === a.pattern.toLowerCase();
            const bIsPerfectText = b.elementText === b.pattern.toLowerCase();
            if (aIsPerfectText && !bIsPerfectText) return -1;
            if (!aIsPerfectText && bIsPerfectText) return 1;
            return b.patternLength - a.patternLength;
        });

        // Highlight ALL valid matches (not just the first one)
        let highlightedCount = 0;

        for (const match of allMatches) {
            const elementText = match.elementText.toLowerCase();
            const hasNegativeIndicators = /(sai|wrong|incorrect|false|không đúng|không chính xác)/i.test(elementText);
            const isAlreadyHighlighted = match.element.classList.contains('tailieu-answer-highlight');
            const belongsToQuestion = belongsToCurrentQuestion(match.element, questionElement, pageQuestion);

            const shouldSkip = hasNegativeIndicators || isAlreadyHighlighted || !belongsToQuestion;

            if (!shouldSkip) {
                const qaGlobal = { question: pageQuestion?.text || 'unknown', dbAnswer: answerText, matchedElementText: (match.element.textContent || '').trim().slice(0, 200), pattern: match.pattern };
                highlightedQA.push(qaGlobal);
                highlightAnswerTextInElement(match.element, match.pattern);
                highlightedCount++;
            }
        }

        return highlightedCount;
    }

    // Function to highlight answer text on the page (kept for backward compatibility, but now only highlights first instance)
    function highlightAnswerOnPage(answerText, questionElement, pageQuestion = null) {
        // Handle array of answers - highlight all of them
        if (Array.isArray(answerText)) {
            let anyHighlighted = false;
            for (const singleAnswer of answerText) {
                if (singleAnswer && typeof singleAnswer === 'string' && singleAnswer.trim()) {
                    if (highlightAnswerOnPage(singleAnswer, questionElement, pageQuestion)) {
                        anyHighlighted = true;
                    }
                }
            }
            return anyHighlighted;
        }

        if (!answerText || (typeof answerText === 'string' && answerText.trim() === '') || !answerHighlightingEnabled) {

            return false;
        }

        const cleanAnswer = cleanAnswerText(answerText);
        // Determine search scope - prioritize question-specific context
        const searchContainers = [];

        if (pageQuestion && questionElement) {
            // Find the question container and its associated answer area
            const questionContainers = findQuestionContainer(questionElement, pageQuestion);
            if (questionContainers && Array.isArray(questionContainers)) {
                questionContainers.forEach(el => {
                    if (el && !isExtensionElement(el)) searchContainers.push(el);
                });
            }
        }

        // Fallback to broader search if no specific context found
        if (searchContainers.length === 0) {
            searchContainers.push(
                questionElement.parentElement || document.body, // Near question first
                questionElement // Within question element
            );
        }

        const candidateElements = new Set(); // Use Set to avoid duplicates


        for (const container of searchContainers) {

            // For question-specific containers, do a more focused search
            if (pageQuestion && container !== questionElement && container !== questionElement.parentElement) {
                // This is a question-specific container - search thoroughly but stay within bounds
                const allElements = container.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.textContent && el.textContent.trim().length > 0 &&
                        !isExtensionElement(el) &&
                        !['SCRIPT', 'STYLE'].includes(el.tagName?.toUpperCase()) &&
                        belongsToCurrentQuestion(el, questionElement, pageQuestion)) {
                        candidateElements.add(el);
                    }
                });

                // Also add the container itself
                if (container.textContent && container.textContent.trim().length > 0) {
                    candidateElements.add(container);
                }
            }
            // Handle siblings search (existing logic)
            else if (container === questionElement.parentElement ||
                (searchContainers.length > 1 && container !== questionElement)) {

                // For siblings, be more restrictive about distance from question
                if (container === questionElement.parentElement) {
                    const siblings = Array.from(container.children);
                    const questionIndex = siblings.indexOf(questionElement);

                    // Only check immediate neighbors and a few elements after
                    const searchRange = pageQuestion ?
                        { start: questionIndex, end: Math.min(questionIndex + 5, siblings.length) } :
                        { start: Math.max(0, questionIndex - 2), end: Math.min(questionIndex + 10, siblings.length) };

                    for (let i = searchRange.start; i < searchRange.end; i++) {
                        if (siblings[i] && !isExtensionElement(siblings[i]) &&
                            belongsToCurrentQuestion(siblings[i], questionElement, pageQuestion)) {
                            candidateElements.add(siblings[i]);
                            // Also check children but limit depth
                            siblings[i].querySelectorAll('*').forEach(el => {
                                if (el.tagName && !['SCRIPT', 'STYLE'].includes(el.tagName.toUpperCase()) &&
                                    !el.hidden && el.textContent.trim().length > 0 && !isExtensionElement(el) &&
                                    belongsToCurrentQuestion(el, questionElement, pageQuestion)) {
                                    candidateElements.add(el);
                                }
                            });
                        }
                    }
                } else {
                    // For other sibling containers
                    container.querySelectorAll('*').forEach(el => {
                        if (el.textContent && el.textContent.trim().length > 0 && !isExtensionElement(el) &&
                            belongsToCurrentQuestion(el, questionElement, pageQuestion)) {
                            candidateElements.add(el);
                        }
                    });
                }
            }
            // Handle question element itself
            else if (container === questionElement) {
                questionElement.querySelectorAll('*').forEach(el => {
                    if (!isExtensionElement(el)) {
                        candidateElements.add(el);
                    }
                });
            }
        }

        // Convert Set back to Array and filter out extension elements and already highlighted elements
        const elementsArray = Array.from(candidateElements).filter(el =>
            el && el.textContent && el.textContent.trim().length > 2 &&
            !isExtensionElement(el) &&
            !el.classList.contains('tailieu-answer-highlight')
            // REMOVED: !el.querySelector('.tailieu-answer-highlight') - Allow searching within containers that have highlights
            // This allows second pass highlighting in the same question container
        );
        // Look for various answer patterns
        const answerPatterns = generateAnswerPatterns(cleanAnswer);
        let found = false;
        let bestMatch = null;
        let bestScore = 0;

        // Search in candidate elements and find the BEST match only
        const allMatches = [];

        for (const candidateElement of elementsArray) {
            // Double check to skip extension elements
            if (isExtensionElement(candidateElement)) continue;

            const elementText = candidateElement.textContent?.toLowerCase().trim() || '';
            if (elementText.length < 2) continue; // Skip empty or very short elements

            // Skip if element is already highlighted
            if (candidateElement.classList.contains('tailieu-answer-highlight')) continue;

            for (const pattern of answerPatterns) {
                const patternLower = pattern.toLowerCase().trim();
                if (patternLower.length < 2) continue;

                // STRICT MATCHING: Normalize both texts (remove special chars, punctuation, extra spaces)
                // Same logic as question comparison
                const normalizedElement = normalizeTextForMatching(elementText);
                const normalizedPattern = normalizeTextForMatching(patternLower);

                // Only match if EXACTLY the same after normalization
                let isExactMatch = false;
                let matchScore = 0;

                if (normalizedElement === normalizedPattern) {
                    isExactMatch = true;
                    matchScore = 1.0;
                }

                // REMOVED all fuzzy matching logic (includes, contains, substring, etc.)
                // Only EXACT matches are allowed to prevent "speak" matching "speaks"

                // Only proceed if we have an exact match
                if (isExactMatch) {
                    allMatches.push({
                        element: candidateElement,
                        pattern: pattern,
                        score: matchScore,
                        elementText: elementText,
                        patternLength: pattern.length,
                        isExactMatch: true,
                        normalizedElement: normalizedElement,
                        normalizedPattern: normalizedPattern
                    });

                }
            }
        }

        // Sort exact matches by score and completeness
        allMatches.sort((a, b) => {
            // All matches should be exact at this point, sort by score first
            if (Math.abs(a.score - b.score) > 0.01) {
                return b.score - a.score;
            }

            // If scores are very similar, prefer perfect text matches
            const aIsPerfectText = a.elementText === a.pattern.toLowerCase();
            const bIsPerfectText = b.elementText === b.pattern.toLowerCase();

            if (aIsPerfectText && !bIsPerfectText) return -1;
            if (!aIsPerfectText && bIsPerfectText) return 1;

            // If both are same type, prefer longer/more complete answers
            return b.patternLength - a.patternLength;
        });

        // Only highlight if we found EXACT matches
        if (allMatches.length > 0) {

            bestMatch = allMatches[0];
            bestScore = bestMatch.score;


            // Minimal filtering since we already have exact matches
            const elementText = bestMatch.elementText.toLowerCase();
            const answerLower = cleanAnswer.toLowerCase();

            // Only essential filters for exact matches
            // Skip if the element contains negative indicators (safety check)
            const hasNegativeIndicators = /(sai|wrong|incorrect|false|không đúng|không chính xác)/i.test(elementText);

            // Check if this specific element is already highlighted
            const isAlreadyHighlighted = bestMatch.element.classList.contains('tailieu-answer-highlight');

            // CRITICAL: Final check - does this element belong to current question?
            const belongsToQuestion = belongsToCurrentQuestion(bestMatch.element, questionElement, pageQuestion);

            // Essential filtering for exact matches
            const shouldSkip = hasNegativeIndicators ||
                isAlreadyHighlighted ||
                !belongsToQuestion;

            if (!shouldSkip) {
                // Simple duplicate check: see if this exact text is already highlighted on the page
                const currentAnswerLower = cleanAnswer.toLowerCase().trim();
                const allExistingHighlights = document.querySelectorAll('.tailieu-answer-highlight');
                let alreadyHighlighted = false;

                // Check if this exact answer is already highlighted anywhere
                for (const existingHighlight of allExistingHighlights) {
                    const existingText = cleanAnswerText(existingHighlight.textContent).toLowerCase().trim();

                    if (existingText === currentAnswerLower ||
                        (existingText.length > 10 && currentAnswerLower.length > 10 &&
                            (existingText.includes(currentAnswerLower) || currentAnswerLower.includes(existingText)))) {


                        alreadyHighlighted = true;
                        found = true; // Mark as found since it's already highlighted
                        break;
                    }
                }

                if (!alreadyHighlighted) {
                    // Log the highlight with context
                    const qaBest = { question: pageQuestion?.text || 'unknown', dbAnswer: answerText, matchedElementText: (bestMatch.element.textContent || '').trim().slice(0, 200), pattern: bestMatch.pattern };
                    highlightedQA.push(qaBest);

                    // Highlight the answer
                    highlightAnswerTextInElement(bestMatch.element, bestMatch.pattern);

                    found = true;
                }
            } else {
                // Skipped EXACT match due to essential filters
            }
        }

        if (!found) {





        } else {

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
                const qaPartial = { question: 'unknown', dbAnswer: pattern, matchedElementText: (element.textContent || '').trim().slice(0, 200), matchType: 'PARTIAL' };
                highlightedQA.push(qaPartial);
                highlightAnswerTextInElement(element, pattern);

                return true;
            }
        }
        return false;
    }

    // Generate various answer patterns to search for
    function generateAnswerPatterns(cleanAnswer) {
        const patterns = new Set();

        // PRIORITY 1: Add the exact original answer first (highest priority)
        patterns.add(cleanAnswer);

        // PRIORITY 2: Add without common Vietnamese prefixes/suffixes
        const prefixes = ['đáp án:', 'trả lời:', 'kết quả:', 'phương án:', 'là:', 'bao gồm:', 'chính là:'];
        const suffixes = ['là đáp án đúng', 'là câu trả lời', 'là kết quả', 'chính xác'];

        let workingAnswer = cleanAnswer;

        // Remove prefixes
        prefixes.forEach(prefix => {
            const regex = new RegExp(`^${prefix.replace(':', '\\s*:?\\s*')}`, 'gi');
            workingAnswer = workingAnswer.replace(regex, '').trim();
        });

        // Remove suffixes  
        suffixes.forEach(suffix => {
            const regex = new RegExp(`${suffix}\\s*$`, 'gi');
            workingAnswer = workingAnswer.replace(regex, '').trim();
        });

        if (workingAnswer !== cleanAnswer && workingAnswer.length > 3) {
            patterns.add(workingAnswer);
        }

        // PRIORITY 3: Add variations with different answer markers removed
        const markerVariations = [
            workingAnswer.replace(/^[A-Da-d][\.\)\s]+/i, '').trim(), // Remove A. B. C. D.
            // FIXED: Only remove small number prefix (1-99) to avoid removing "200" from "200 million"
            workingAnswer.replace(/^([1-9]\d?)[\.\)\s]+/, '').trim(), // Remove 1. 2. 3. etc (small numbers only)
            workingAnswer.replace(/^[-\*\+]\s*/, '').trim(), // Remove bullet points
        ];

        markerVariations.forEach(variation => {
            if (variation.length > 3 && variation !== workingAnswer) {
                patterns.add(variation);
            }
        });

        // PRIORITY 4: Add with common answer prefixes (for finding in text)
        const commonPrefixes = ['A. ', 'B. ', 'C. ', 'D. ', 'a. ', 'b. ', 'c. ', 'd. ', '- ', '• '];
        commonPrefixes.forEach(prefix => {
            patterns.add(prefix + workingAnswer);
            patterns.add(prefix + cleanAnswer);
        });

        // PRIORITY 5: For longer answers, add the complete answer first, then fragments
        const words = workingAnswer.split(' ').filter(word => word.length > 0);
        if (words.length > 2) {
            // Add complete answer variations with different spacing
            patterns.add(words.join(' ')); // Normal spacing
            patterns.add(words.join(', ')); // With commas (common in lists)

            // Only add fragments if we have many words (to avoid losing context for shorter answers)
            if (words.length > 5) {
                // Create meaningful fragments, but prefer longer ones
                for (let length = Math.min(words.length, 8); length >= 3; length--) {
                    for (let start = 0; start <= words.length - length; start++) {
                        const fragment = words.slice(start, start + length).join(' ');
                        if (fragment.length > 8) {
                            patterns.add(fragment);
                        }
                    }
                }
            }

            // Add combinations of important words (skip common words) - but only for very long answers
            if (words.length > 6) {
                const importantWords = words.filter(word =>
                    word.length > 2 &&
                    !['là', 'của', 'được', 'có', 'và', 'hoặc', 'với', 'cho', 'từ', 'đến',
                        'trong', 'trên', 'dưới', 'về', 'theo', 'như', 'khi', 'nếu', 'nhưng',
                        'để', 'đã', 'sẽ', 'đang', 'các', 'những', 'một', 'hai', 'ba', 'bốn', 'năm'].includes(word.toLowerCase())
                );

                if (importantWords.length > 2 && importantWords.length < words.length) {
                    patterns.add(importantWords.join(' '));
                    patterns.add(importantWords.join(', '));
                }
            }
        }

        // PRIORITY 6: Add normalized version (remove special chars, normalize spaces)
        const normalized = workingAnswer.replace(/[^\w\sÀ-ỹ,]/g, ' ').replace(/\s+/g, ' ').trim();
        if (normalized !== workingAnswer && normalized.length > 3) {
            patterns.add(normalized);
        }

        // Filter out very short patterns and return as array, sorted by length (longest first for better context matching)
        const finalPatterns = Array.from(patterns)
            .filter(p => p.trim().length > 2)
            .sort((a, b) => {
                // First sort by completeness (prefer patterns that contain more of the original)
                const aCompleteness = a.length / cleanAnswer.length;
                const bCompleteness = b.length / cleanAnswer.length;
                if (Math.abs(aCompleteness - bCompleteness) > 0.1) {
                    return bCompleteness - aCompleteness;
                }
                // Then by length
                return b.length - a.length;
            });


        return finalPatterns;
    }

    // Clean answer text for better matching (remove answer markers)
    function cleanAnswerText(text) {
        if (!text) return '';
        return text
            .replace(/^[A-Da-d][\.\)]\s*/, '') // Remove A. B. C. D. prefixes
            // FIXED: Only remove number prefix if followed by dot/bracket AND space, 
            // AND number is small (1-99) to avoid removing numbers that are part of answer like "200 million"
            .replace(/^([1-9]\d?)[\.\)]\s+/, '') // Remove 1. 2. etc (small numbers only, require space after)
            .replace(/^(Đáp án|Trả lời|Kết quả|Phương án|Chọn|Lựa chọn):\s*/gi, '') // Remove Vietnamese answer markers
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    // Calculate similarity between element text and answer pattern
    function calculateAnswerSimilarity(elementText, pattern) {
        const elementLower = elementText.toLowerCase().trim();
        const patternLower = pattern.toLowerCase().trim();

        // HIGHEST PRIORITY: Exact match
        if (elementLower === patternLower) {
            return 1.0;
        }

        // HIGH PRIORITY: Direct substring match
        if (elementLower.includes(patternLower)) {
            const ratio = patternLower.length / elementLower.length;
            // Give very high score for substantial substring matches
            if (ratio > 0.7) return 0.98; // Almost the whole element is the pattern
            if (ratio > 0.5) return 0.95; // Pattern is majority of element
            if (ratio > 0.3) return 0.90; // Pattern is significant part of element
            return Math.min(0.85, 0.75 + ratio * 0.2); // Smaller part but still exact match
        }

        // MEDIUM PRIORITY: Pattern contains element (element is part of answer)
        if (patternLower.includes(elementLower)) {
            const ratio = elementLower.length / patternLower.length;
            if (ratio > 0.5) return 0.88; // Element is significant part of pattern
            return Math.min(0.80, 0.65 + ratio * 0.3);
        }

        // WORD-BASED MATCHING: Check individual words
        const elementWords = elementLower.split(/[\s,\.\-\(\)]+/).filter(w => w.length > 0);
        const patternWords = patternLower.split(/[\s,\.\-\(\)]+/).filter(w => w.length > 0);

        if (patternWords.length === 0 || elementWords.length === 0) return 0;

        let exactWordMatches = 0;
        let partialWordMatches = 0;

        patternWords.forEach(patternWord => {
            if (patternWord.length <= 2) return; // Skip very short words

            let bestMatch = 0;
            elementWords.forEach(elementWord => {
                if (elementWord === patternWord) {
                    exactWordMatches++;
                    bestMatch = 1;
                } else if (bestMatch < 1) {
                    // Check for partial word matches
                    if (elementWord.includes(patternWord) || patternWord.includes(elementWord)) {
                        const longer = Math.max(elementWord.length, patternWord.length);
                        const shorter = Math.min(elementWord.length, patternWord.length);
                        const partialScore = shorter / longer;
                        if (partialScore > 0.6) { // At least 60% overlap
                            bestMatch = Math.max(bestMatch, partialScore * 0.8);
                        }
                    }
                    // Check edit distance for typos
                    else if (patternWord.length > 3) {
                        const distance = levenshteinDistance(elementWord, patternWord);
                        const maxLen = Math.max(elementWord.length, patternWord.length);
                        if (distance <= Math.max(1, Math.floor(maxLen * 0.25))) { // Allow 25% character differences
                            bestMatch = Math.max(bestMatch, 1 - (distance / maxLen));
                        }
                    }
                }
            });

            if (bestMatch >= 0.6) {
                partialWordMatches += bestMatch;
            }
        });

        // Calculate word-based similarity
        const wordSimilarity = (exactWordMatches + partialWordMatches) / patternWords.length;

        // For single word patterns, be more lenient
        if (patternWords.length === 1 && patternWords[0].length > 2) {
            if (wordSimilarity > 0.7) return Math.min(0.85, wordSimilarity);
        }

        // For multi-word patterns, require higher match rate
        if (wordSimilarity > 0.8) return Math.min(0.82, wordSimilarity * 0.9);
        if (wordSimilarity > 0.6) return Math.min(0.75, wordSimilarity * 0.85);
        if (wordSimilarity > 0.4) return Math.min(0.65, wordSimilarity * 0.8);

        // Use Levenshtein distance as fallback for overall similarity
        const maxLen = Math.max(elementLower.length, patternLower.length);
        const levenSimilarity = maxLen > 0 ? 1 - (levenshteinDistance(elementLower, patternLower) / maxLen) : 0;

        // Return the better of word similarity or Levenshtein similarity, but cap it
        return Math.min(0.6, Math.max(wordSimilarity, levenSimilarity));
    }

    // NOTE: cleanAnswerText() is defined earlier in the file - duplicate removed

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
                highlightSpan.className = 'tailieu-answer-highlight';
                highlightSpan.textContent = matchedText;
                fragment.appendChild(highlightSpan);

                if (afterText) {
                    fragment.appendChild(document.createTextNode(afterText));
                }

                // Replace the original text node
                parent.replaceChild(fragment, textNode);

                // Capture context for this highlight (nearest question text) and record it
                try {
                    let qAncestor = parent.closest('.tailieu-highlighted-question, .qtext, .question-text, .question-content, [class*="question"], .que');
                    let questionSnippet = 'unknown';
                    if (qAncestor) {
                        questionSnippet = (qAncestor.textContent || '').trim().slice(0, 200);
                    } else {
                        // Walk up a bit to find a likely question container
                        let up = parent;
                        let depth = 0;
                        while (up && depth < 6) {
                            if ((up.matches && up.matches('[class*="question"]')) || up.querySelector && up.querySelector('.qtext')) {
                                questionSnippet = (up.textContent || '').trim().slice(0, 200);
                                break;
                            }
                            up = up.parentElement;
                            depth++;
                        }
                    }

                    const qaTextNode = {
                        question: questionSnippet,
                        dbAnswer: searchText,
                        matchedText: matchedText,
                        matchType: 'TEXT_NODE',
                        elementSnippet: (parent.textContent || '').trim().slice(0, 200)
                    };
                    highlightedQA.push(qaTextNode);
                } catch (e) {
                    // ignore errors while trying to log context
                }
            }
        });
    }



    // Remove duplicate highlights and incorrect highlights (smart cleanup)
    // ONLY removes duplicates WITHIN the same question, NOT between different questions
    function removeIncorrectAndDuplicateHighlights() {
        const allHighlights = document.querySelectorAll('.tailieu-answer-highlight');

        // Get all correct answers from extension questions
        const allCorrectAnswers = new Set();
        extensionQuestions.forEach(eq => {
            if (eq.answer && eq.answer.trim()) {
                allCorrectAnswers.add(cleanAnswerText(eq.answer).toLowerCase().trim());
            }
        });



        // Group highlights by their question container to handle duplicates per question
        const questionGroups = new Map();

        allHighlights.forEach((highlight, idx) => {
            // Find the nearest question container or question element
            let questionElement = highlight;
            let depth = 0;
            const maxDepth = 15;
            let foundReason = 'reached max depth';

            // Travel up to find a question marker
            while (questionElement && questionElement.parentElement && depth < maxDepth) {
                const parent = questionElement.parentElement;

                // Check if parent is a highlighted question
                if (parent.classList && parent.classList.contains('tailieu-highlighted-question')) {
                    questionElement = parent;
                    foundReason = 'found .tailieu-highlighted-question';
                    break;
                }

                // Check if parent looks like a question container
                if (parent.className && parent.className.match(/(question|cau|item|quiz|test|exercise)/i)) {
                    questionElement = parent;
                    foundReason = 'found question container class';
                    break;
                }

                questionElement = parent;
                depth++;
            }
            // Use the question element as the group key
            if (!questionGroups.has(questionElement)) {
                questionGroups.set(questionElement, []);
            }
            questionGroups.get(questionElement).push(highlight);
        });

        // Debug: Show which highlights belong to which group
        let groupIndex = 0;
        questionGroups.forEach((highlights, questionContainer) => {
            groupIndex++;
        });

        const toRemove = [];

        // Process each question group separately
        questionGroups.forEach((highlights, questionContainer) => {
            const seenTextsInThisQuestion = new Set();

            console.log(`[Tailieu Extension] ⚙️ Đang xử lý nhóm câu hỏi với ${highlights.length} highlights`);

            highlights.forEach((highlight, index) => {
                const text = cleanAnswerText(highlight.textContent).toLowerCase().trim();

                // Check if this highlight matches any correct answer
                let isCorrectAnswer = false;
                let matchedCorrectAnswer = null;
                for (const correctAnswer of allCorrectAnswers) {
                    if (text === correctAnswer ||
                        text.includes(correctAnswer) ||
                        correctAnswer.includes(text)) {
                        isCorrectAnswer = true;
                        matchedCorrectAnswer = correctAnswer;
                        break;
                    }
                }

                if (isCorrectAnswer) {
                    // This is a correct answer
                    // IMPORTANT: Only check for duplicates WITHIN THIS QUESTION
                    if (seenTextsInThisQuestion.has(text)) {
                        // Duplicate within the SAME question - remove it
                        toRemove.push({ highlight, reason: 'duplicate in same question', text });
                        console.log(`[Tailieu Extension] Tìm thấy duplicate trong CÙNG câu hỏi:`, text);
                    } else {
                        // First time seeing this answer in THIS question - keep it
                        seenTextsInThisQuestion.add(text);
                        console.log(`[Tailieu Extension] Giữ lại đáp án đúng:`, text, `(match với: ${matchedCorrectAnswer})`);
                    }
                } else {
                    // This is NOT a correct answer - remove it
                    toRemove.push({ highlight, reason: 'incorrect answer', text });
                    console.log(`[Tailieu Extension] Tìm thấy đáp án SAI:`, text);
                }
            });
        });

        // Remove incorrect and duplicate highlights
        toRemove.forEach((item, index) => {
            debugLog(`Removing ${item.reason}:`, item.text);

            item.highlight.classList.remove('tailieu-answer-highlight');
            item.highlight.style.backgroundColor = '';
            item.highlight.style.color = '';
            item.highlight.style.fontWeight = '';
            item.highlight.style.padding = '';
            item.highlight.style.borderRadius = '';

            // If it was wrapped in a highlight span, unwrap it
            if (item.highlight.tagName === 'SPAN' && item.highlight.classList.length === 0) {
                const parent = item.highlight.parentNode;
                if (parent) {
                    parent.insertBefore(document.createTextNode(item.highlight.textContent), item.highlight);
                    parent.removeChild(item.highlight);
                }
            }
        });

        debugLog(`Removed ${toRemove.length} incorrect/duplicate highlights from ${questionGroups.size} questions`);
        return toRemove.length;
    }

    // Remove only duplicate highlights (same answer highlighted multiple times) - LEGACY
    function removeDuplicateHighlights() {
        return removeIncorrectAndDuplicateHighlights();
    }

    // Clear only incorrect highlights while keeping correct ones (only when multiple highlights exist per question)
    function clearIncorrectHighlights() {
        const allHighlightedAnswers = document.querySelectorAll('.tailieu-answer-highlight');
        const correctAnswers = new Set();

        // Collect all correct answers from extension questions
        extensionQuestions.forEach(eq => {
            if (eq.answer) {
                correctAnswers.add(cleanAnswerText(eq.answer).toLowerCase());
            }
        });

        debugLog('Checking highlighted answers against correct answers:', Array.from(correctAnswers));

        // Group highlights by question container to check per-question basis
        const questionGroups = new Map();

        allHighlightedAnswers.forEach(highlightedElement => {
            // Find the question container for this highlight
            let questionContainer = highlightedElement;
            let depth = 0;
            const maxDepth = 10;

            // Travel up to find question container
            while (questionContainer && questionContainer.parentElement && depth < maxDepth) {
                const parent = questionContainer.parentElement;

                // Check if parent looks like a question container
                if (parent.className && parent.className.match(/(question|cau|item|quiz|test|exercise)/i)) {
                    questionContainer = parent;
                    break;
                }

                // Check if parent has multiple answer-like elements (indicating a question container)
                const answerElements = parent.querySelectorAll('.tailieu-answer-highlight');
                if (answerElements.length > 1) {
                    questionContainer = parent;
                    break;
                }

                questionContainer = parent;
                depth++;
            }

            // Use container as key (or the element itself if no container found)
            const containerKey = questionContainer || highlightedElement;
            if (!questionGroups.has(containerKey)) {
                questionGroups.set(containerKey, []);
            }
            questionGroups.get(containerKey).push(highlightedElement);
        });

        debugLog('Found question groups:', questionGroups.size);

        // Process each question group
        questionGroups.forEach((highlights, container) => {
            debugLog(`Processing question container with ${highlights.length} highlights`);

            // ONLY process if there are multiple highlights in the same question
            if (highlights.length <= 1) {
                debugLog('Skipping - only 1 highlight in this question, keeping it');
                return; // Skip single highlights - they are likely correct
            }

            debugLog(`Found ${highlights.length} highlights in same question - checking for incorrect ones`);

            // Check each highlight in this question group
            highlights.forEach((highlightedElement, index) => {
                const highlightText = cleanAnswerText(highlightedElement.textContent).toLowerCase();

                // Check if this highlight matches any correct answer
                let isCorrect = false;
                for (const correctAnswer of correctAnswers) {
                    if (highlightText === correctAnswer ||
                        highlightText.includes(correctAnswer) ||
                        correctAnswer.includes(highlightText)) {
                        isCorrect = true;
                        break;
                    }
                }

                if (!isCorrect) {
                    debugLog(`Removing incorrect highlight ${index + 1} from multi-highlight question:`, highlightText);

                    // Remove highlight styling
                    highlightedElement.classList.remove('tailieu-answer-highlight');
                    highlightedElement.style.backgroundColor = '';
                    highlightedElement.style.color = '';
                    highlightedElement.style.fontWeight = '';
                    highlightedElement.style.padding = '';
                    highlightedElement.style.borderRadius = '';

                    // If it was wrapped in a highlight span, unwrap it
                    if (highlightedElement.tagName === 'SPAN' &&
                        highlightedElement.classList.length === 0) {
                        const parent = highlightedElement.parentNode;
                        if (parent) {
                            parent.insertBefore(document.createTextNode(highlightedElement.textContent), highlightedElement);
                            parent.removeChild(highlightedElement);
                        }
                    }
                } else {
                    debugLog(`Keeping correct highlight ${index + 1} in multi-highlight question:`, highlightText);
                }
            });
        });
    }

    // Clear all highlights
    function clearAllHighlights() {
        const beforeQuestions = document.querySelectorAll('.tailieu-highlighted-question').length;
        const beforeAnswers = document.querySelectorAll('.tailieu-answer-highlight').length;

        // Remove question highlights - restore original HTML
        document.querySelectorAll('.tailieu-highlighted-question').forEach(element => {
            // Remove inline styles added to the container
            element.style.borderLeft = '';
            element.style.paddingLeft = '';
            element.style.margin = '';
            element.style.position = '';
            element.style.color = '';
            element.style.transform = '';

            // Restore original HTML if available
            if (element.dataset.originalHTML) {
                element.innerHTML = element.dataset.originalHTML;
                delete element.dataset.originalHTML;
            } else {
                // Fallback: remove highlighting spans (plain unwrap)
                const highlightedSpans = element.querySelectorAll('.tailieu-text-highlight');
                highlightedSpans.forEach(span => {
                    // Unwrap span by replacing it with its text content
                    try {
                        span.outerHTML = span.textContent;
                    } catch (e) {
                        // ignore errors
                    }
                });
            }

            element.classList.remove('tailieu-highlighted-question');

            // Remove tooltips (they should be restored with original HTML, but just in case)
            const tooltips = element.querySelectorAll('.tailieu-answer-tooltip');
            tooltips.forEach(tooltip => {
                tooltip.remove();
            });
        });

        // Remove answer highlights throughout the page
        document.querySelectorAll('.tailieu-answer-highlight').forEach(el => {
            // If it's a simple wrapper span inserted by the extension, unwrap it
            try {
                if (el.tagName === 'SPAN') {
                    const textNode = document.createTextNode(el.textContent || '');
                    if (el.parentNode) el.parentNode.replaceChild(textNode, el);
                } else {
                    // Otherwise, remove highlight class and inline style
                    el.classList.remove('tailieu-answer-highlight');
                    el.style.backgroundColor = '';
                    el.removeAttribute('title');
                }
            } catch (e) {
                // fallback: attempt to remove class and style
                try { el.classList.remove('tailieu-answer-highlight'); } catch (e2) { }
                try { el.style.backgroundColor = ''; } catch (e3) { }
            }
        });

        // Also remove fill-blank highlights and reset related input styles/badges
        const beforeFillBlank = document.querySelectorAll('.tailieu-fillblank-highlighted').length;
        document.querySelectorAll('.tailieu-fillblank-highlighted').forEach(el => {
            try {
                el.classList.remove('tailieu-fillblank-highlighted');
                const inputs = el.querySelectorAll('input[type="text"], textarea');
                inputs.forEach(inp => {
                    try {
                        inp.style.border = '';
                        inp.style.backgroundColor = '';
                        delete inp.dataset.tailieuAutoFilled;
                        if (inp.dataset.tailieuBadgeAdded) {
                            const next = inp.nextSibling;
                            if (next && next.classList && next.classList.contains('tailieu-answer-badge')) {
                                try { next.remove(); } catch (e) { }
                            }
                            delete inp.dataset.tailieuBadgeAdded;
                        }
                    } catch (e) { }
                });
            } catch (e) { }
        });

        // Normalize document body to merge adjacent text nodes created by unwraps
        try { document.body.normalize(); } catch (e) { }

        const afterQuestions = document.querySelectorAll('.tailieu-highlighted-question').length;
        const afterAnswers = document.querySelectorAll('.tailieu-answer-highlight').length;
        const afterFillBlank = document.querySelectorAll('.tailieu-fillblank-highlighted').length;
        if (debugMode) console.debug('[Tailieu Debug] clearAllHighlights counts:', { beforeQuestions, beforeAnswers, beforeFillBlank, afterQuestions, afterAnswers, afterFillBlank });
    }

    async function createSettingsPopup() {
        let settingsPopup = document.getElementById('tailieu-settings-popup');
        let overlay = document.getElementById('tailieu-settings-overlay');

        if (!settingsPopup) {
            overlay = document.createElement('div');
            overlay.id = 'tailieu-settings-overlay';
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:100000; display:none;';
            safeAppendToBody(overlay);

            settingsPopup = document.createElement('div');
            settingsPopup.id = 'tailieu-settings-popup';
            settingsPopup.innerHTML = window.TAILIEU_TEMPLATES.SETTINGS_POPUP;
            safeAppendToBody(settingsPopup);

            // Add close on overlay click
            overlay.onclick = () => {
                settingsPopup.style.display = 'none';
                overlay.style.display = 'none';
            };
        }

        // Local state for panel
        let currentCategories = [];
        let currentDocuments = [];
        let selectedDocIds = [];

        const catSelect = document.getElementById('tailieu-panel-category');
        const docList = document.getElementById('tailieu-panel-documents');
        const statusEl = document.getElementById('tailieu-panel-status');
        const autoSelectToggle = document.getElementById('tailieu-auto-select-toggle');
        const highlightToggle = document.getElementById('tailieu-highlight-toggle');
        const searchInput = document.getElementById('tailieu-panel-search');

        const loadPanelData = async () => {
            try {
                statusEl.textContent = 'Đang tải...';

                // Sync auto-select checkbox
                if (autoSelectToggle) {
                    autoSelectToggle.checked = autoSelectEnabled;
                }
                // Sync highlight checkbox (default false if not set yet)
                if (highlightToggle) {
                    try {
                        // Use current runtime flag if available, fallback to storage
                        chrome.storage.local.get('tailieu_highlight_answers', (res) => {
                            if (res && typeof res.tailieu_highlight_answers !== 'undefined') {
                                highlightToggle.checked = !!res.tailieu_highlight_answers;
                                answerHighlightingEnabled = !!res.tailieu_highlight_answers;
                            } else {
                                highlightToggle.checked = !!answerHighlightingEnabled;
                            }
                        });
                    } catch (e) {
                        highlightToggle.checked = !!answerHighlightingEnabled;
                    }
                }

                const storage = await chrome.storage.local.get([
                    'tailieu_selected_category',
                    'tailieu_selected_documents',
                    'tailieu_detected_doc_id',
                    'tailieu_detected_cat_id'
                ]);

                // Fallback to detected values if no selected ones exist
                const savedCatId = storage.tailieu_selected_category || detectedCategoryId || storage.tailieu_detected_cat_id;
                selectedDocIds = (storage.tailieu_selected_documents && storage.tailieu_selected_documents.length > 0)
                    ? storage.tailieu_selected_documents
                    : (detectedDocumentId ? [detectedDocumentId] : (storage.tailieu_detected_doc_id ? [storage.tailieu_detected_doc_id] : []));

                chrome.runtime.sendMessage({ action: 'getCategories' }, (res) => {
                    if (res && res.success) {
                        currentCategories = res.categories;
                        catSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
                        currentCategories.forEach(cat => {
                            const opt = document.createElement('option');
                            opt.value = cat.id;
                            opt.textContent = cat.title;
                            opt.selected = cat.id === savedCatId;
                            catSelect.appendChild(opt);
                        });
                        if (savedCatId) loadDocsPanel(savedCatId);
                        statusEl.textContent = '';
                    }
                });
            } catch (e) { statusEl.textContent = 'Lỗi tải dữ liệu'; }
        };

        const loadDocsPanel = (catId) => {
            if (!catId) {
                docList.innerHTML = window.TAILIEU_TEMPLATES.PANEL_MESSAGE('Vui lòng chọn danh mục');
                return;
            }
            chrome.runtime.sendMessage({ action: 'getDocumentsByCategory', categoryId: catId }, (res) => {
                if (res && res.success) {
                    currentDocuments = res.documents;
                    renderDocumentsList();
                }
            });
        };

        const renderDocumentsList = () => {
            const searchTerm = searchInput?.value?.toLowerCase() || '';
            const filtered = currentDocuments.filter(d => d.title.toLowerCase().includes(searchTerm));

            docList.innerHTML = '';
            if (filtered.length === 0) {
                docList.innerHTML = window.TAILIEU_TEMPLATES.PANEL_MESSAGE('Không tìm thấy tài liệu');
                return;
            }

            filtered.forEach(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                const docWrapper = document.createElement('div');
                docWrapper.innerHTML = window.TAILIEU_TEMPLATES.DOC_ITEM(doc.id, doc.title, isSelected);
                const itemEl = docWrapper.firstElementChild;

                itemEl.onclick = () => {
                    if (selectedDocIds.includes(doc.id)) {
                        selectedDocIds = selectedDocIds.filter(id => id !== doc.id);
                    } else {
                        selectedDocIds.push(doc.id);
                    }
                    renderDocumentsList();
                };
                docList.appendChild(itemEl);
            });
        };

        // --- Event Listeners ---
        document.getElementById('tailieu-settings-close').onclick = () => {
            settingsPopup.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
        };

        if (autoSelectToggle) {
            autoSelectToggle.onchange = (e) => {
                autoSelectEnabled = e.target.checked;
                chrome.storage.local.set({ tailieu_auto_select: autoSelectEnabled });
                statusEl.textContent = autoSelectEnabled ? '✅ Đã bật tự động chọn' : '❌ Đã tắt tự động chọn';
                setTimeout(() => { if (statusEl.textContent.includes('tự động')) statusEl.textContent = ''; }, 2000);
            };
        }

        if (highlightToggle) {
            highlightToggle.onchange = (e) => {
                try {
                    answerHighlightingEnabled = e.target.checked;
                    chrome.storage.local.set({ tailieu_highlight_answers: answerHighlightingEnabled });
                    try { window.answerHighlightingEnabled = answerHighlightingEnabled; } catch (err) { }
                    statusEl.textContent = answerHighlightingEnabled ? '✅ Đã bật highlight đáp án' : '❌ Đã tắt highlight đáp án';
                    // If turned off, clear existing highlights immediately
                    if (!answerHighlightingEnabled) {
                        try { clearAllHighlights(); } catch (err) { }
                    }
                    setTimeout(() => { if (statusEl.textContent.includes('highlight')) statusEl.textContent = ''; }, 2000);
                } catch (err) { /* ignore */ }
            };
        }

        catSelect.onchange = (e) => {
            selectedDocIds = [];
            loadDocsPanel(e.target.value);
        };

        if (searchInput) {
            searchInput.oninput = () => renderDocumentsList();
        }

        document.getElementById('tailieu-panel-clear-selection').onclick = () => {
            selectedDocIds = [];
            renderDocumentsList();
        };

        document.getElementById('tailieu-panel-save').onclick = async () => {
            if (selectedDocIds.length === 0) {
                statusEl.textContent = '⚠️ Vui lòng chọn tài liệu';
                return;
            }

            statusEl.textContent = '⏳ Đang cập nhật...';
            try {
                await chrome.storage.local.set({
                    tailieu_selected_category: catSelect.value,
                    tailieu_selected_documents: selectedDocIds,
                    tailieu_db_updated: true
                });

                statusEl.textContent = '✅ Đã cập nhật thành công!';
                setTimeout(() => {
                    statusEl.textContent = '';
                    settingsPopup.style.display = 'none';
                    if (overlay) overlay.style.display = 'none';
                    showCachedQuestionsIndicator(); // Refresh indicator doc list
                }, 1500);

                // Trigger reload questions
                await loadCachedQuestions();
                if (extensionQuestions.length > 0) {
                    performAutoCompare(false);
                }
            } catch (e) {
                statusEl.textContent = '❌ Lỗi khi lưu';
            }
        };

        // Expose refresh function
        settingsPopup.refresh = loadPanelData;

        // Initial load
        await loadPanelData();

        return { settingsPopup, overlay };
    }

    // Show cached questions indicator
    async function showCachedQuestionsIndicator() {
        // Remove existing indicator
        const existingIndicator = document.getElementById('tailieu-cached-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Only show when the page is fully loaded
        if (document.readyState !== 'complete') {
            if (!window._tailieu_showIndicatorOnLoad) {
                window._tailieu_showIndicatorOnLoad = true;
                window.addEventListener('load', () => {
                    window._tailieu_showIndicatorOnLoad = false;
                    showCachedQuestionsIndicator();
                }, { once: true });
            }
            return;
        }

        // Get display name: use memory variable first (for auto-detect), fallback to storage
        let selectedDocNames = detectedDocumentName || 'Chưa chọn';

        if (selectedDocNames === 'Chưa chọn') {
            try {
                const storage = await chrome.storage.local.get(['tailieu_selected_documents', 'tailieu_documents']);
                const selectedIds = storage.tailieu_selected_documents || [];
                const allDocs = storage.tailieu_documents || [];
                if (selectedIds.length > 0 && allDocs.length > 0) {
                    const names = allDocs.filter(d => selectedIds.includes(d.id)).map(d => d.title);
                    if (names.length > 0) {
                        selectedDocNames = names.join(', ');
                    }
                }
            } catch (e) { }
        }

        if (selectedDocNames.length > 40) {
            selectedDocNames = selectedDocNames.substring(0, 37) + '...';
        }

        const indicator = document.createElement('div');
        indicator.id = 'tailieu-cached-indicator';

        const countText = extensionQuestions.length > 0 ? extensionQuestions.length + ' câu hỏi sẵn sàng' : 'Sẵn sàng nhận diện';

        indicator.innerHTML = window.TAILIEU_TEMPLATES.CACHED_INDICATOR(countText, selectedDocNames);

        safeAppendToBody(indicator, () => {
            // Check for outdated data
            try {
                chrome.storage.local.get(['tailieu_db_updated'], (res) => {
                    if (res && res.tailieu_db_updated) {
                        const collapsedInfo = indicator.querySelector('#tailieu-indicator-collapsed');
                        if (collapsedInfo) {
                            const warningEl = document.createElement('div');
                            warningEl.id = 'tailieu-outdated-warning-indicator';
                            warningEl.textContent = window.TAILIEU_TEMPLATES.OUTDATED_WARNING;
                            collapsedInfo.appendChild(warningEl);
                        }
                    }
                });
            } catch (e) { }

            // --- Event Listeners ---
            const expandBtn = document.getElementById('tailieu-expand-indicator');
            if (expandBtn) {
                expandBtn.onclick = async () => {
                    const { settingsPopup, overlay } = await createSettingsPopup();
                    if (settingsPopup.refresh) await settingsPopup.refresh();
                    settingsPopup.style.display = 'block';
                    if (overlay) overlay.style.display = 'block';
                };
            }

            const hideBtn = document.getElementById('tailieu-hide-indicator');
            if (hideBtn) {
                hideBtn.onclick = () => indicator.remove();
            }

            const compareBtn = document.getElementById('tailieu-compare-now');
            if (compareBtn) {
                compareBtn.onclick = async () => {
                    const state = compareBtn.dataset.state || 'ready';
                    if (state === 'repeat') {
                        // Clear highlights and reset state before re-comparing
                        clearAllHighlights();
                        highlightedQA = [];

                        const nextBtn = document.getElementById('tailieu-next-page');
                        if (nextBtn) nextBtn.style.display = 'none';

                        // Minor delay for visual reset
                        await new Promise(r => setTimeout(r, 150));
                        compareBtn.dataset.state = 'ready';
                    }

                    await compareAndHighlightQuestions(true);
                };
            }

            const nextBtn = document.getElementById('tailieu-next-page');
            if (nextBtn) {
                nextBtn.onclick = () => {
                    const possibleButtons = [
                        'input[name="next"]', 'button.next', '.mod_quiz-next-nav input',
                        '.submitbtns input[value="Trang sau"]', '.submitbtns input[value="Tiếp theo"]',
                        '.submitbtns .btn-primary:not([name="previous"])', 'a[title="Next page"]'
                    ];

                    let found = false;
                    for (const selector of possibleButtons) {
                        const b = document.querySelector(selector);
                        if (b && (b.offsetWidth > 0 || b.offsetHeight > 0)) {
                            b.click();
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'));
                        const target = buttons.find(b => {
                            const text = (b.value || b.textContent || '').toLowerCase();
                            return (text.includes('tiếp') || text.includes('next') || text.includes('sau')) &&
                                !text.includes('trước') && !text.includes('về');
                        });
                        if (target) {
                            target.click();
                            found = true;
                        }
                    }

                    if (!found) {
                        showNotification('Không tìm thấy nút chuyển trang!', 'warning');
                    }
                };
            }
        });
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
        button.innerHTML = window.TAILIEU_TEMPLATES.FLOATING_BUTTON;

        button.addEventListener('click', () => {
            // Visual feedback handled by CSS :active
        });

        safeAppendToBody(button);
    }

    // Setup monitoring to recreate popup if it's removed from DOM
    function setupPopupMonitoring() {
        // Use MutationObserver to watch for popup removal
        const observer = new MutationObserver((mutations) => {
            let popupRemoved = false;

            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node.id === 'tailieu-questions-popup' ||
                        (node.querySelector && node.querySelector('#tailieu-questions-popup'))) {
                        popupRemoved = true;
                    }
                });
            });

            if (popupRemoved) {
                console.log('Popup was removed from DOM, recreating...');
                // Recreate popup after a short delay
                setTimeout(() => {
                    const existingPopup = document.getElementById('tailieu-questions-popup');
                    if (!existingPopup) {
                        createQuestionsPopup();
                        // Update with current questions if any
                        if (extensionQuestions && extensionQuestions.length > 0) {
                            updateQuestionsPopup(extensionQuestions);
                        }
                    }
                }, 500);
            }
        });

        // Start observing
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            // Wait for body
            const waitForBody = () => {
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                } else {
                    setTimeout(waitForBody, 100);
                }
            };
            waitForBody();
        }
    }

    // Create questions popup at bottom right
    function createQuestionsPopup() {
        // Create popup container
        const popup = document.createElement('div');
        popup.id = 'tailieu-questions-popup';

        // Create header
        const header = document.createElement('div');
        header.className = 'tailieu-popup-header';

        const title = document.createElement('div');
        title.textContent = 'Danh sách câu hỏi';

        const controls = document.createElement('div');
        controls.className = 'tailieu-popup-controls';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.id = 'tailieu-questions-minimize-btn';
        minimizeBtn.className = 'tailieu-control-btn';
        minimizeBtn.innerHTML = '−';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tailieu-control-btn';
        closeBtn.innerHTML = '×';

        controls.appendChild(minimizeBtn);
        controls.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(controls);

        const tabBar = document.createElement('div');
        tabBar.id = 'tailieu-popup-tabs';

        const createTab = (id, label, isActive = false) => {
            const tab = document.createElement('button');
            tab.className = 'tailieu-tab-btn' + (isActive ? ' active' : '');
            tab.id = `tab-${id}`;
            tab.textContent = label;
            tab.onclick = () => {
                currentPopupTab = id;
                updateQuestionsPopup(extensionQuestions);
            };
            return tab;
        };

        const tabAll = createTab('all', 'Tìm kiếm', true);
        const tabMatched = createTab('matched', 'Đã so sánh');
        tabMatched.style.display = 'none'; // Ẩn khi chưa có so sánh

        tabBar.appendChild(tabAll);
        tabBar.appendChild(tabMatched);

        const content = document.createElement('div');
        content.id = 'tailieu-questions-content';

        const emptyState = document.createElement('div');
        emptyState.className = 'tailieu-empty-state';
        emptyState.innerHTML = window.TAILIEU_TEMPLATES.EMPTY_STATE;
        content.appendChild(emptyState);

        popup.appendChild(header);
        popup.appendChild(tabBar);
        popup.appendChild(content);
        safeAppendToBody(popup);

        // Add event listeners
        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
            // Save state
            localStorage.setItem('tailieu-questions-popup-visible', 'false');
        });

        let isMinimized = false;
        let originalWidth = '270px';
        let originalHeight = '330px';
        let originalMaxHeight = '330px';

        const minimizedOverlay = document.createElement('div');
        minimizedOverlay.id = 'tailieu-minimized-overlay';
        minimizedOverlay.title = 'Nhấn để mở rộng';
        minimizedOverlay.innerHTML = window.TAILIEU_TEMPLATES.MINIMIZED_ICON;
        popup.appendChild(minimizedOverlay);

        // Event listeners cho overlay
        minimizedOverlay.addEventListener('click', () => {
            if (isMinimized) {
                minimizeBtn.click(); // Mở rộng lại
            }
        });

        minimizedOverlay.addEventListener('mouseenter', () => {
            minimizedOverlay.style.transform = 'scale(1.1)';
        });

        minimizedOverlay.addEventListener('mouseleave', () => {
            minimizedOverlay.style.transform = 'scale(1)';
        });

        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            if (isMinimized) {
                // Thu gọn thành icon - CHỈ thay đổi style, KHÔNG thay đổi innerHTML
                originalWidth = popup.style.width;
                originalHeight = popup.style.height;
                originalMaxHeight = popup.style.maxHeight;

                popup.style.width = '60px';
                popup.style.height = '60px';
                popup.style.maxHeight = '60px';
                popup.style.bottom = '20px';
                popup.style.left = '10px';
                popup.style.right = 'auto';
                popup.style.setProperty('right', 'auto', 'important');
                popup.style.top = 'auto';

                // Ẩn content và header, hiển thị overlay
                content.style.display = 'none';
                header.style.display = 'none';
                minimizedOverlay.style.display = 'flex';

            } else {
                // Mở rộng lại - CHỈ thay đổi style
                popup.style.width = originalWidth;
                popup.style.height = originalHeight;
                popup.style.maxHeight = originalMaxHeight;
                popup.style.bottom = '85px';
                popup.style.left = '10px';
                popup.style.right = 'auto';
                popup.style.setProperty('right', 'auto', 'important');

                // Hiển thị content và header, ẩn overlay
                content.style.display = 'block';
                header.style.display = 'flex';
                minimizedOverlay.style.display = 'none';
            }
            // KHÔNG lưu trạng thái minimized vào localStorage
            // Trạng thái minimized chỉ duy trì trong phiên làm việc hiện tại
        });

        // Draggable logic removed per user request "không di chuyển vị trí"




        // Restore saved state
        const savedVisible = localStorage.getItem('tailieu-questions-popup-visible');

        // Initially hide popup - only show when there are questions
        popup.style.display = 'none';

        // KHÔNG restore trạng thái minimized từ localStorage
        // Popup luôn bắt đầu ở trạng thái mở rộng khi reload trang



        // Verify popup was added successfully
        setTimeout(() => {
            const addedPopup = document.getElementById('tailieu-questions-popup');
            if (!addedPopup) {
                console.error('Popup was not added to DOM successfully');
            } else {
                console.log('Questions popup created successfully');
            }
        }, 50);

        return popup;
    }

    function updateQuestionsPopup(questions = [], retryCount = 0) {
        const popup = document.getElementById('tailieu-questions-popup');
        const content = document.getElementById('tailieu-questions-content');
        const tabMatched = document.getElementById('tab-matched');
        const tabAll = document.getElementById('tab-all');

        if (!popup || !content) {
            // Prevent infinite loop - limit retries to 5 attempts
            if (retryCount >= 5) {
                console.error('Failed to create questions popup after 5 attempts');
                return;
            }

            console.log('Popup or content not found, creating popup...');
            createQuestionsPopup();

            // Check if popup was created successfully before retrying
            setTimeout(() => {
                const newPopup = document.getElementById('tailieu-questions-popup');
                const newContent = document.getElementById('tailieu-questions-content');
                if (!newPopup || !newContent) {
                    // Popup creation failed, retry
                    updateQuestionsPopup(questions, retryCount + 1);
                } else {
                    // Popup created successfully, now update it
                    updateQuestionsPopup(questions, 0);
                }
            }, 100);
            return;
        }

        // --- Cập nhật UI Tabs ---
        if (tabMatched && tabAll) {
            const hasMatched = lastMatchedQuestions && lastMatchedQuestions.length > 0;
            tabMatched.style.display = hasMatched ? 'block' : 'none';

            // Nếu mất dữ liệu so sánh mà đang ở tab matched, quay về tab all
            if (!hasMatched && currentPopupTab === 'matched') {
                currentPopupTab = 'all';
            }

            // Cập nhật style cho các tab
            [tabAll, tabMatched].forEach(tab => {
                const id = tab.id.replace('tab-', '');
                tab.classList.toggle('active', id === currentPopupTab);
            });
        }

        if (questions.length === 0 && (!lastMatchedQuestions || lastMatchedQuestions.length === 0)) {
            // Hide popup when no questions
            popup.style.display = 'none';
            localStorage.setItem('tailieu-questions-popup-visible', 'false');

            content.innerHTML = window.TAILIEU_TEMPLATES.EMPTY_STATE;
            return;
        }

        // Show popup when questions are available
        popup.style.display = 'block';
        localStorage.setItem('tailieu-questions-popup-visible', 'true');

        // Xác định danh sách hiển thị dựa trên tab
        let displayQuestions = [];
        if (currentPopupTab === 'matched') {
            // Deduplicate by pageQuestion to match the count shown on the button indicators
            const seen = new Set();
            displayQuestions = [];

            (lastMatchedQuestions || []).forEach(m => {
                const normalized = normalizeForExactMatch(m.pageQuestion || '');
                if (normalized && !seen.has(normalized)) {
                    seen.add(normalized);
                    displayQuestions.push({
                        question: m.extensionQuestion || m.pageQuestion,
                        answer: m.answer,
                        userAnswer: m.userAnswer
                    });
                }
            });
        } else {
            displayQuestions = questions;
        }

        // Create questions list
        content.innerHTML = '';

        // Add search bar
        const searchContainer = document.createElement('div');
        searchContainer.className = 'tailieu-search-container';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'tailieu-search-input';
        searchInput.placeholder = currentPopupTab === 'matched' ? 'Tìm trong kết quả so sánh...' : 'Tìm kiếm câu hỏi...';

        searchContainer.appendChild(searchInput);
        content.appendChild(searchContainer);

        // Questions container
        const questionsContainer = document.createElement('div');
        questionsContainer.id = 'questions-list-container';

        displayQuestions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item-popup';

            questionItem.addEventListener('mouseleave', () => {
                // Background color handled by CSS hover
            });

            const renderedQ = (typeof window.tailieuImageRenderer !== 'undefined')
                ? window.tailieuImageRenderer.renderImages(question.question)
                : question.question;

            questionItem.innerHTML = window.TAILIEU_TEMPLATES.QUESTION_ITEM(index, renderedQ, (typeof window.tailieuImageRenderer !== 'undefined' ? window.tailieuImageRenderer.renderImages(question.answer) : question.answer));


            // User Answer (if in matched tab and has answer)
            if (currentPopupTab === 'matched' && question.userAnswer) {
                const renderedUA = (typeof window.tailieuImageRenderer !== 'undefined')
                    ? window.tailieuImageRenderer.renderImages(question.userAnswer)
                    : question.userAnswer;

                const userAnsContainer = document.createElement('div');
                userAnsContainer.innerHTML = window.TAILIEU_TEMPLATES.USER_ANSWER_DIV(renderedUA);
                questionItem.appendChild(userAnsContainer.firstElementChild);
            }

            // Click to highlight on page
            questionItem.addEventListener('click', () => {
                // Try to find and highlight this question on the page
                highlightQuestionOnPage(question.question);

                // Visual feedback
                questionItem.classList.add('highlighted');
                setTimeout(() => {
                    questionItem.classList.remove('highlighted');
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
                const countText = currentPopupTab === 'matched' ? `Đã khớp: ${displayQuestions.length}` : `Tổng: ${displayQuestions.length}`;
                title.textContent = `Danh sách câu hỏi (${countText})`;
            }

            // Kiểm tra dữ liệu lỗi thời
            try {
                chrome.storage.local.get(['tailieu_db_updated'], (res) => {
                    if (res && res.tailieu_db_updated) {
                        if (!header.querySelector('#tailieu-outdated-warning-popup')) {
                            const warningEl = document.createElement('div');
                            warningEl.id = 'tailieu-outdated-warning-popup';
                            warningEl.className = 'tailieu-outdated-warning';
                            warningEl.textContent = ' Dữ liệu câu hỏi lỗi thời. Vui lòng cập nhật lại!';
                            header.classList.add('has-warning');
                            header.appendChild(warningEl);
                        }
                    } else {
                        const warningEl = header.querySelector('#tailieu-outdated-warning-popup');
                        if (warningEl) {
                            warningEl.remove();
                            header.classList.remove('has-warning');
                        }
                    }
                });
            } catch (e) {
                console.error('Error checking tailieu_db_updated in updateQuestionsPopup', e);
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
                pageQuestion.element.classList.add('tailieu-highlight-pulse');

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
        notification.className = 'tailieu-notification';
        notification.innerHTML = window.TAILIEU_TEMPLATES.NOTIFICATION(
            'Đã tìm thấy câu hỏi',
            `${questionText.substring(0, 60)}${questionText.length > 60 ? '...' : ''}`
        );

        safeAppendToBody(notification, () => {
            setTimeout(() => {
                notification.remove();
            }, 3000);
        });
    }

    // Create questions popup at bottom right
    const questionsPopup = createQuestionsPopup();
    console.log('Questions popup created:', questionsPopup ? 'Success' : 'Failed');

    // Setup popup monitoring to recreate if removed
    setupPopupMonitoring();

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