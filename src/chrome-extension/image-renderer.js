/**
 * Image Renderer Module - Hiển thị hình ảnh thay thế cho các link ảnh
 * Hỗ trợ cả link đầy đủ và link rút gọn dạng "..../xxx.png"
 */

(function () {
    'use strict';

    if (window.tailieuImageRenderer) return;

    console.log('[Tailieu ImageRenderer] Module loaded');

    /**
     * Render văn bản có chứa link ảnh thành HTML có thẻ <img> thực tế
     * @param {string} text - Văn bản chứa link (ví dụ: "Cho đồ thị "https://..."")
     * @param {string} contextFullUrl - URL đầy đủ làm gốc để giải mã các link rút gọn (nếu có)
     * @returns {string} - Chuỗi HTML đã được render ảnh
     */
    function renderImages(text, contextFullUrl = null) {
        if (!text) return '';

        let result = text;

        // 1. Tìm link đầy đủ đầu tiên nếu chưa có contextFullUrl
        if (!contextFullUrl) {
            const firstFullMatch = text.match(/"(https?:\/\/[^"]+)"/);
            if (firstFullMatch) {
                contextFullUrl = firstFullMatch[1];
            }
        }

        // 2. Regex để bắt các link ảnh (bao gồm cả rút gọn)
        // Nhóm 1: Link đầy đủ (bắt đầu bằng http) hoặc rút gọn (bắt đầu bằng ..../)
        const imgRegex = /"((?:https?:\/\/|(?:\.){3,}\/)([^"]+\.[a-z0-9]+)(?:\?[^"]*)?)"/gi;

        result = result.replace(imgRegex, (match, url, filename) => {
            let actualSrc = url;

            // Nếu là link rút gọn, khôi phục lại từ contextFullUrl
            if (url.startsWith('..../') || url.startsWith('.../')) {
                if (contextFullUrl) {
                    try {
                        const baseUrlParts = contextFullUrl.split('/');
                        baseUrlParts[baseUrlParts.length - 1] = filename;
                        actualSrc = baseUrlParts.join('/');
                    } catch (e) {
                        actualSrc = url; // Giữ nguyên nếu lỗi
                    }
                }
            }

            // Trả về HTML cho ảnh với style gọn đẹp
            return `<img src="${actualSrc}" class="tailieu-rendered-img" style="max-height: 120px; max-width: 100%; vertical-align: middle; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 2px; background: white; display: inline-block;" onerror="this.style.display='none'; this.after('[Lỗi ảnh]')">`;
        });

        return result;
    }

    /**
     * Tự động quét và render ảnh cho một DOM element chứa text thuần có link ảnh
     * @param {Element} element - Element cần render
     */
    function renderElement(element) {
        if (!element) return;
        const rawText = element.textContent;
        if (rawText && (rawText.includes('http') || rawText.includes('..../'))) {
            element.innerHTML = renderImages(rawText);
        }
    }

    window.tailieuImageRenderer = {
        renderImages,
        renderElement
    };

})();
