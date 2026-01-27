// Image Handler Module - Xử lý câu hỏi chứa hình ảnh
// Trích xuất URL hình ảnh từ <img> tags và thay thế vào text
// Version 1.0

(function () {
    'use strict';

    // Tránh load nhiều lần
    if (window.tailieuImageHandlerLoaded) return;
    window.tailieuImageHandlerLoaded = true;


    // ==================== CONSTANTS ====================

    // Placeholder cho hình ảnh khi trích xuất text
    const IMAGE_PLACEHOLDER_PREFIX = '"';
    const IMAGE_PLACEHOLDER_SUFFIX = '"';

    // ==================== MAIN FUNCTIONS ====================

    /**
     * Kiểm tra xem element có chứa hình ảnh không
     * @param {Element} element - DOM element cần kiểm tra
     * @returns {boolean}
     */
    // Helper: return only images inside question text or answer regions when present
    function getRelevantImagesWithinElement(root) {
        if (!root) return [];
        const questionSelectors = '.qtext, .questiontext, .question-content, .question-text';
        const answerSelectors = '.answer, .answers, .choices, .options, .answer-container, .qanswers';

        const images = [];
        const qEls = root.querySelectorAll(questionSelectors);
        const aEls = root.querySelectorAll(answerSelectors);

        if (qEls.length > 0 || aEls.length > 0) {
            qEls.forEach(node => node.querySelectorAll('img').forEach(img => images.push(img)));
            aEls.forEach(node => node.querySelectorAll('img').forEach(img => images.push(img)));
            // Deduplicate
            return images.filter((v, i, a) => a.indexOf(v) === i);
        }

        // Fallback: return all images inside root
        return Array.from(root.querySelectorAll('img'));
    }

    function hasImages(element) {
        return getRelevantImagesWithinElement(element).length > 0;
    }

    /**
     * Trích xuất text từ element, thay thế <img> bằng URL của nó
     * @param {Element} element - DOM element chứa text và img
     * @returns {string} - Text với URL hình ảnh được nhúng
     */
    function extractTextWithImageUrls(element) {
        if (!element) return '';

        // Clone element để không ảnh hưởng đến DOM gốc
        const clone = element.cloneNode(true);

        // Only consider images inside .qtext/.questiontext or .answer sections to avoid unrelated icons
        const images = getRelevantImagesWithinElement(clone);

        let firstFullUrlFound = null;
        images.forEach(img => {
            // Thử lấy src từ nhiều thuộc tính khác nhau (hỗ trợ lazy loading)
            const src = img.getAttribute('src') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-original') ||
                img.getAttribute('data-lazy-src');

            if (src && src.trim() !== '') {
                // Tạo URL đầy đủ nếu là relative path
                const fullUrl = makeAbsoluteUrl(src);

                // LỌC CHỈ LẤY CÁC LINK ẢNH NỘI DUNG (pluginfile.php và /question/)
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

                    // Tạo text node thay thế cho img
                    const urlText = `${IMAGE_PLACEHOLDER_PREFIX}${processedUrl}${IMAGE_PLACEHOLDER_SUFFIX}`;
                    const textNode = document.createTextNode(urlText);

                    // Thay thế img bằng text node
                    if (img.parentNode) {
                        img.parentNode.replaceChild(textNode, img);
                    }
                } else {
                    // Nếu không phải ảnh nội dung, xóa img để tránh nhiễu
                    img.remove();
                }
            } else {
                // Nếu không có src, xóa img
                img.remove();
            }
        });

        // Lấy text content sau khi đã thay thế
        return normalizeWhitespace(clone.textContent || clone.innerText || '');
    }

    /**
     * Chuyển URL tương đối thành URL tuyệt đối
     * @param {string} url - URL cần chuyển đổi
     * @returns {string} - URL tuyệt đối
     */
    function makeAbsoluteUrl(url) {
        if (!url) return '';

        // Nếu đã là URL tuyệt đối, return luôn
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Nếu là URL tương đối, tạo URL tuyệt đối từ base URL
        try {
            const baseUrl = window.location.origin;
            return new URL(url, baseUrl).href;
        } catch (e) {
            console.warn('[ImageHandler] Cannot parse URL:', url, e);
            return url;
        }
    }

    /**
     * Chuẩn hóa khoảng trắng trong text
     * @param {string} text - Text cần chuẩn hóa
     * @returns {string}
     */
    function normalizeWhitespace(text) {
        return text
            .replace(/\s+/g, ' ')  // Gộp nhiều khoảng trắng thành 1
            .replace(/\n\s*\n/g, '\n')  // Gộp nhiều dòng trống
            .trim();
    }

    /**
     * Trích xuất tất cả URL hình ảnh từ element
     * @param {Element} element - DOM element
     * @returns {Array<string>} - Mảng các URL hình ảnh
     */
    function extractImageUrls(element) {
        if (!element) return [];

        const images = getRelevantImagesWithinElement(element);
        const urls = [];

        images.forEach(img => {
            const src = img.getAttribute('src') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-original') ||
                img.getAttribute('data-lazy-src');
            if (src && src.trim() !== '') {
                const fullUrl = makeAbsoluteUrl(src);

                // Lọc logic tương tự
                const isContentImage = fullUrl.includes('pluginfile.php') &&
                    (fullUrl.includes('/question/answer/') ||
                        fullUrl.includes('/question/questiontext/') ||
                        fullUrl.includes('/question/'));

                if (isContentImage) {
                    urls.push(fullUrl);
                }
            }
        });

        return urls;
    }

    /**
     * Kiểm tra xem text có chứa URL hình ảnh không (đã được xử lý)
     * @param {string} text - Text cần kiểm tra
     * @returns {boolean}
     */
    function hasImageUrlsInText(text) {
        if (!text) return false;

        // Kiểm tra pattern: "http://..." hoặc "https://..."
        const imageUrlPattern = /"https?:\/\/[^"]+"/g;
        return imageUrlPattern.test(text);
    }

    /**
     * Trích xuất URL từ text đã xử lý
     * @param {string} text - Text chứa URL hình ảnh
     * @returns {Array<string>} - Mảng các URL
     */
    function extractUrlsFromText(text) {
        if (!text) return [];

        const imageUrlPattern = /"(https?:\/\/[^"]+)"/g;
        const urls = [];
        let match;

        while ((match = imageUrlPattern.exec(text)) !== null) {
            urls.push(match[1]);
        }

        return urls;
    }

    /**
     * Xử lý câu hỏi có chứa hình ảnh
     * @param {Element} questionElement - Element chứa câu hỏi
     * @returns {Object} - { text: string, imageUrls: Array<string> }
     */
    function processQuestionWithImages(questionElement) {
        if (!questionElement) {
            return { text: '', imageUrls: [] };
        }

        const text = extractTextWithImageUrls(questionElement);
        const imageUrls = extractImageUrls(questionElement);

        return {
            text: text,
            imageUrls: imageUrls,
            hasImages: imageUrls.length > 0
        };
    }

    /**
     * Xử lý các lựa chọn có chứa hình ảnh
     * @param {Element} answerElement - Element chứa lựa chọn
     * @returns {Object} - { text: string, imageUrls: Array<string> }
     */
    function processAnswerWithImages(answerElement) {
        if (!answerElement) {
            return { text: '', imageUrls: [] };
        }

        const text = extractTextWithImageUrls(answerElement);
        const imageUrls = extractImageUrls(answerElement);

        return {
            text: text,
            imageUrls: imageUrls,
            hasImages: imageUrls.length > 0
        };
    }

    /**
     * Làm sạch text đã xử lý hình ảnh (loại bỏ URL nếu cần)
     * @param {string} text - Text chứa URL hình ảnh
     * @param {boolean} keepUrls - Giữ lại URL hay thay bằng placeholder
     * @returns {string}
     */
    function cleanImageText(text, keepUrls = true) {
        if (!text) return '';

        if (keepUrls) {
            return text;
        }

        // Thay thế URL bằng placeholder đơn giản [IMAGE]
        return text.replace(/"https?:\/\/[^"]+"/g, '[IMAGE]');
    }

    /**
     * So sánh 2 text có hình ảnh (bỏ qua URL khi so sánh)
     * @param {string} text1 - Text thứ nhất
     * @param {string} text2 - Text thứ hai
     * @returns {boolean}
     */
    function compareTextsIgnoringImages(text1, text2) {
        if (!text1 || !text2) return false;

        // Loại bỏ URL hình ảnh ra khỏi cả 2 text trước khi so sánh
        const clean1 = text1.replace(/"https?:\/\/[^"]+"/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const clean2 = text2.replace(/"https?:\/\/[^"]+"/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

        return clean1 === clean2;
    }

    /**
     * Tạo preview text cho câu hỏi/lựa chọn có hình ảnh
     * @param {string} text - Text gốc với URL
     * @param {number} maxLength - Độ dài tối đa
     * @returns {string}
     */
    function createImageTextPreview(text, maxLength = 100) {
        if (!text) return '';

        // Thay URL dài bằng [IMG] ngắn gọn cho preview
        let preview = text.replace(/"https?:\/\/[^"]+"/g, '[IMG]');

        if (preview.length > maxLength) {
            preview = preview.substring(0, maxLength) + '...';
        }

        return preview;
    }

    // ==================== EXPORT TO WINDOW ====================

    window.tailieuImageHandler = {
        // Check functions
        hasImages,
        hasImageUrlsInText,

        // Extract functions
        extractTextWithImageUrls,
        extractImageUrls,
        extractUrlsFromText,

        // Process functions
        processQuestionWithImages,
        processAnswerWithImages,

        // Utility functions
        cleanImageText,
        compareTextsIgnoringImages,
        createImageTextPreview,
        makeAbsoluteUrl,
        normalizeWhitespace,

        // Constants
        IMAGE_PLACEHOLDER_PREFIX,
        IMAGE_PLACEHOLDER_SUFFIX
    };


})();
