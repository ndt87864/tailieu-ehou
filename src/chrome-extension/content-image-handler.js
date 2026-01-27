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

            // If strong/b elements exist, join them first
            const strongEls = el.querySelectorAll('strong, b');
            if (strongEls && strongEls.length > 0) {
                const strongTexts = Array.from(strongEls).map(se => normalize(hasBaseImageHandler ? getElementVisibleTextWithImages(se) : (se.textContent || ''))).filter(Boolean);
                const full = normalize(hasBaseImageHandler ? getElementVisibleTextWithImages(el) : (el.textContent || ''));
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
                    // Skip purely decorative or input elements
                    if (tag === 'IMG' || tag === 'SVG' || tag === 'INPUT' || tag === 'BUTTON') return;
                    const t = normalize(hasBaseImageHandler ? getElementVisibleTextWithImages(node) : (node.textContent || ''));
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
