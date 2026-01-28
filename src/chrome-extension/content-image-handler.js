/**
 * Image Handler for Content Script - Chuyên xử lý hình ảnh cho việc so sánh và highlight
 * Module này cung cấp các tiện ích giúp content script nhận diện và trích xuất URL ảnh
 * để so sánh chính xác với cơ sở dữ liệu.
 */

(function () {
    'use strict';

    if (window.tailieuContentImageHandler) return;


    /**
     * Trích xuất text từ một element, bao gồm cả URL của các hình ảnh bên trong.
     * @param {Element} el - DOM element cần trích xuất
     * @returns {string} - Text đã bao gồm URL ảnh
     */
    function getElementVisibleTextWithImages(el) {
        if (!el) return '';

        const hasBaseImageHandler = typeof window.tailieuImageHandler !== 'undefined';
        let firstFullUrlFound = null; // Theo dõi link đầy đủ đầu tiên trong scope này

        try {
            const clone = el.cloneNode(true);

            // Handle case where the element itself is an image
            if (clone.tagName === 'IMG') {
                const img = clone;
                const src = img.getAttribute('src') ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-original') ||
                    img.getAttribute('data-lazy-src');

                if (src && src.trim() !== '') {
                    const fullUrl = hasBaseImageHandler ?
                        window.tailieuImageHandler.makeAbsoluteUrl(src) :
                        makeAbsoluteUrlFallback(src);

                    const isContentImage = fullUrl.includes('pluginfile.php') &&
                        (fullUrl.includes('/question/answer/') ||
                            fullUrl.includes('/question/questiontext/') ||
                            fullUrl.includes('/question/'));

                    if (isContentImage) {
                        // LOGIC RÚT GỌN: (Single image case - always full url if no context)
                        // But to match behavior:
                        let processedUrl = fullUrl;
                        try {
                            const parts = fullUrl.split('/');
                            const filename = parts[parts.length - 1];
                            // If this is the "first" (only), we might want full logic, but usually
                            // getElementVisibleTextWithImages is called on containers.
                            // If called on single IMG, we treat it as found.
                            processedUrl = `..../${filename}`;
                            // NOTE: Logic above in loop uses firstFullUrlFound to decide whether to shorten.
                            // Here we are single node. Let's return full url?
                            // User requirement says question has ".../filename.png" for second images.
                            // But checking user request image: "https://.../30548742.png(2,3)..." logic seems to expect full URL sometimes?
                            // Actually, in the user log: "nhưng đáp án lại k quét đúng ... dù đã nhẽ phải quét dược dạng ..."
                            // The scanner logic preserves logic.
                            // Let's stick to returning full URL for single image for safety, or replicate logic.
                            // But typically we don't scan single images in isolation for the whole answer text unless iterating children.
                            // If iterating children, we don't share `firstFullUrlFound` state across calls. This is a limitation of getConcatenatedText calling it per node.
                            // However, usually answers have 1 image.
                            processedUrl = fullUrl; // Safety default
                        } catch (e) { }

                        const placeholderPrefix = hasBaseImageHandler ? window.tailieuImageHandler.IMAGE_PLACEHOLDER_PREFIX : '"';
                        const placeholderSuffix = hasBaseImageHandler ? window.tailieuImageHandler.IMAGE_PLACEHOLDER_SUFFIX : '"';
                        return `${placeholderPrefix}${fullUrl}${placeholderSuffix}`;
                    }
                }
                return '';
            }

            // Only process images that are inside question text or answer sections to avoid unrelated icons
            const questionSelectors = '.qtext, .questiontext, .question-content, .question-text';
            const answerSelectors = '.answer, .answers, .choices, .options, .answer-container, .qanswers';

            // Collect images from qtext and answer if present; otherwise fall back to all imgs
            let images = [];
            const qEls = clone.querySelectorAll(questionSelectors);
            const aEls = clone.querySelectorAll(answerSelectors);

            if (qEls.length > 0 || aEls.length > 0) {
                qEls.forEach(node => node.querySelectorAll('img').forEach(i => images.push(i)));
                aEls.forEach(node => node.querySelectorAll('img').forEach(i => images.push(i)));
                // Deduplicate
                images = images.filter((v, i, a) => a.indexOf(v) === i);
            } else {
                images = Array.from(clone.querySelectorAll('img'));
            }

            images.forEach(img => {
                const src = img.getAttribute('src') ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-original') ||
                    img.getAttribute('data-lazy-src');

                if (src && src.trim() !== '') {
                    // Ưu tiên dùng makeAbsoluteUrl từ tailieuImageHandler nếu có
                    const fullUrl = hasBaseImageHandler ?
                        window.tailieuImageHandler.makeAbsoluteUrl(src) :
                        makeAbsoluteUrlFallback(src);

                    // LỌC CHỈ LẤY CÁC LINK ẢNH NỘI DUNG (pluginfile.php và /question/)
                    // Tránh lấy các icon hệ thống, icon tick/cross hoặc ảnh linh tinh
                    const isContentImage = fullUrl.includes('pluginfile.php') &&
                        (fullUrl.includes('/question/answer/') ||
                            fullUrl.includes('/question/questiontext/') ||
                            fullUrl.includes('/question/'));

                    if (isContentImage) {
                        let processedUrl = fullUrl;

                        // LOGIC RÚT GỌN: Chỉ giữ link đầu tiên đầy đủ
                        if (!firstFullUrlFound) {
                            firstFullUrlFound = fullUrl;
                        } else {
                            // Các link sau rút gọn thành ..../filename.png
                            try {
                                const parts = fullUrl.split('/');
                                const filename = parts[parts.length - 1];
                                processedUrl = `..../${filename}`;
                            } catch (e) {
                                processedUrl = `..../image.png`;
                            }
                        }

                        const placeholderPrefix = hasBaseImageHandler ? window.tailieuImageHandler.IMAGE_PLACEHOLDER_PREFIX : '"';
                        const placeholderSuffix = hasBaseImageHandler ? window.tailieuImageHandler.IMAGE_PLACEHOLDER_SUFFIX : '"';

                        const urlText = `${placeholderPrefix}${processedUrl}${placeholderSuffix}`;
                        const textNode = document.createTextNode(urlText);
                        if (img.parentNode) {
                            img.parentNode.replaceChild(textNode, img);
                        }
                    } else {
                        // Nếu không phải ảnh nội dung, xóa bỏ để tránh nhiễu text
                        img.remove();
                    }
                } else {
                    img.remove();
                }
            });

            // Loại bỏ các thành phần không mong muốn (giống scanner)
            const toRemove = 'input, svg, button, script, style, audio, source, iframe, noscript, .answernumber, .bullet, .icon, .audioplayer, .audio';
            clone.querySelectorAll(toRemove).forEach(n => n.remove());

            // Xử lý các token dữ liệu linh tinh
            clone.querySelectorAll('[data-src], [data-audio], [data-track]').forEach(n => {
                if (n.tagName !== 'IMG') n.remove();
            });

            // Lấy text và chuẩn hóa nhẹ
            let text = clone.textContent || '';
            return text.replace(/\s+/g, ' ').trim();
        } catch (e) {
            console.warn('[ContentImageHandler] Error extracting text:', e);
            return (el.textContent || '').replace(/\s+/g, ' ').trim();
        }
    }

    /**
     * Fallback để tạo URL tuyệt đối nếu module chính chưa load
     */
    function makeAbsoluteUrlFallback(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        try {
            return new URL(url, window.location.origin).href;
        } catch (e) {
            return url;
        }
    }

    /**
     * So sánh 2 chuỗi có thể chứa URL hình ảnh.
     * Tự động chuẩn hóa để việc so sánh URL ảnh được chính xác nhất.
     */
    function areTextsWithImagesEqual(text1, text2, normalizerFunc) {
        if (!text1 || !text2) return text1 === text2;

        // Nếu có hàm chuẩn hóa ngoại vi (ví dụ normalizeForExactMatch từ content.js)
        if (normalizerFunc) {
            return normalizerFunc(text1) === normalizerFunc(text2);
        }

        // Mặc định: Chuẩn hóa cơ bản
        const n1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
        const n2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();
        return n1 === n2;
    }

    /**
     * Kiểm tra xem một đoạn text có chứa mẫu URL ảnh không
     */
    function containsImageUrls(text) {
        if (!text) return false;
        return /"https?:\/\/[^"]+"/.test(text);
    }

    /**
     * Concatenate text from an element by joining meaningful child nodes in order.
     * - If multiple <strong>/<b> exist, their texts are joined first and followed by remaining text.
     * - Otherwise, joins child element texts (e.g., multiple <span>) and text nodes in document order.
     */
    function getConcatenatedText(el) {
        if (!el) return '';
        try {
            // Prefer using base image handler normalization when available
            const normalize = (txt) => (txt || '').toString().replace(/\s+/g, ' ').trim();

            // Fix: Check for handler existence safely in this scope if needed, 
            // but getElementVisibleTextWithImages already handles fallback safely.

            // If strong/b elements exist, join them first
            const strongEls = el.querySelectorAll('strong, b');
            if (strongEls && strongEls.length > 0) {
                // FIXED: Called getElementVisibleTextWithImages directly instead of undefined 'hasBaseImageHandler' check
                const strongTexts = Array.from(strongEls).map(se => normalize(getElementVisibleTextWithImages(se))).filter(Boolean);
                const full = normalize(getElementVisibleTextWithImages(el));
                let rest = full;
                strongTexts.forEach(st => { rest = rest.replace(st, '').trim(); });
                return ([strongTexts.join(' '), rest].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim();
            }

            // Otherwise, collect child nodes in order
            const parts = [];
            el.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const t = normalize(node.textContent);
                    if (t) parts.push(t);
                    return;
                }
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName && node.tagName.toUpperCase();
                    // Skip purely decorative or input elements BUT KEEP IMG
                    if (tag === 'SVG' || tag === 'INPUT' || tag === 'BUTTON') return;

                    // FIXED: Call getElementVisibleTextWithImages to handle elements (including IMG)
                    const t = normalize(getElementVisibleTextWithImages(node));
                    if (t) parts.push(t);
                }
            });

            return parts.join(' ').replace(/\s+/g, ' ').trim();
        } catch (e) {
            return (el.textContent || '').replace(/\s+/g, ' ').trim();
        }
    }

    window.tailieuContentImageHandler = {
        getElementVisibleTextWithImages,
        getConcatenatedText,
        areTextsWithImagesEqual,
        containsImageUrls,
        // Export fallback absolute URL helper for scanner compatibility
        makeAbsoluteUrlFallback
    };

})();
