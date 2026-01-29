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
    `
};

// Expose to window for content.js
window.TAILIEU_TEMPLATES = TAILIEU_TEMPLATES;
