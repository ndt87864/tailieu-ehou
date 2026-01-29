/**
 * UI Templates for Tailieu Extension
 * Contains HTML strings and icons used in content script
 */

const TAILIEU_TEMPLATES = {
    FLOATING_BUTTON: `
        <?xml version="1.0" encoding="utf-8"?>
        <!-- License: MIT. Made by Lucide Contributors: https://lucide.dev/ -->
        <svg 
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    `,

    EMPTY_STATE: `
        <div class="tailieu-empty-state-icon">
            <?xml version="1.0" encoding="utf-8"?>
            <!-- License: MIT. Made by Lucide Contributors: https://lucide.dev/ -->
            <svg 
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666666"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
        </div>
        <div class="tailieu-empty-state-title">Chưa có câu hỏi</div>
        <div class="tailieu-empty-state-desc">Vui lòng chọn tài liệu từ popup chính</div>
    `,

    MINIMIZED_ICON: `
        <?xml version="1.0" encoding="utf-8"?>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    `,

    NOTIFICATION: (title, desc) => `
        <div class="tailieu-notification-title">${title}</div>
        <div class="tailieu-notification-desc">${desc}</div>
    `,

    QUESTION_ITEM: (index, question, answer) => `
        <div class="question-header">
            <span class="question-number">#${index + 1}</span> ${question}
        </div>
        <div class="answer-div">
            <strong>Đáp án:</strong> ${answer}
        </div>
    `,

    USER_ANSWER_DIV: (userAnswer) => `
        <div class="user-answer-div">
            <strong>Bạn chọn:</strong> ${userAnswer}
        </div>
    `,

    SETTINGS_ICON: `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    `,

    CACHED_INDICATOR: (countText, selectedDocNames) => `
        <div id="tailieu-indicator-header">
            <div class="tailieu-indicator-header-title">Tailieu</div>
            <button id="tailieu-expand-indicator" title="Cài đặt">
                ${TAILIEU_TEMPLATES.SETTINGS_ICON}
            </button>
            <button id="tailieu-hide-indicator">✕</button>
        </div>

        <div id="tailieu-indicator-body">
            <div id="tailieu-indicator-collapsed">
                <span id="tailieu-indicator-count">${countText}</span>
                <span id="tailieu-indicator-doc-name" title="${selectedDocNames}">
                    📄 ${selectedDocNames}
                </span>
            </div>

            <div id="tailieu-indicator-expanded">
                <div class="tailieu-expanded-header">
                    <span class="tailieu-expanded-title">Cài đặt</span>
                    <button id="tailieu-collapse-indicator">×</button>
                </div>

                <div class="tailieu-input-group">
                    <label class="tailieu-checkbox-label">
                        <input type="checkbox" id="tailieu-auto-select-toggle" style="margin: 0;">
                        <span>Tự động chọn đáp án</span>
                    </label>
                </div>
                
                <div class="tailieu-input-group">
                    <label class="tailieu-label">Danh mục:</label>
                    <select id="tailieu-panel-category"></select>
                </div>

                <div class="tailieu-input-group">
                    <label class="tailieu-label">Tìm tài liệu:</label>
                    <input type="text" id="tailieu-panel-search" placeholder="Nhập từ khóa...">
                </div>

                <div id="tailieu-panel-doc-container">
                    <label class="tailieu-label">Tài liệu:</label>
                    <div id="tailieu-panel-documents"></div>
                </div>

                <div class="tailieu-button-row">
                    <button id="tailieu-panel-clear-selection">Xóa</button>
                    <button id="tailieu-panel-save">Cập nhật</button>
                </div>
                <div id="tailieu-panel-status"></div>
            </div>
        </div>

        <div id="tailieu-indicator-footer">
            <button id="tailieu-compare-now">So sánh ngay</button>
            <button id="tailieu-next-page" style="display: none;">Tiếp tục</button>
        </div>
    `,

    OUTDATED_WARNING: `Dữ liệu lỗi thời. Vui lòng cập nhật lại!`,

    PANEL_MESSAGE: (msg) => `<div class="tailieu-panel-message">${msg}</div>`,

    DOC_ITEM: (id, title, isSelected) => `
        <div class="tailieu-panel-doc-item ${isSelected ? 'selected' : ''}" data-id="${id}">
            <input type="checkbox" ${isSelected ? 'checked' : ''} style="margin: 0; pointer-events: none;">
            <span class="tailieu-doc-title">${title}</span>
        </div>
    `

};

// Expose to window for content.js
window.TAILIEU_TEMPLATES = TAILIEU_TEMPLATES;
