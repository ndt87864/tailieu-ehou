// Content script for Tailieu Questions Extension
// This script can interact with the current web page

console.log('Tailieu Questions Extension content script loaded');

// You can add functionality here to interact with the current page
// For example, highlighting text, extracting content, etc.

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'getPageInfo') {
        // Return information about current page
        sendResponse({
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname
        });
    }
    
    if (request.action === 'highlightQuestions') {
        // You could implement question highlighting functionality here
        highlightQuestionsOnPage(request.questions);
        sendResponse({ success: true });
    }
});

function highlightQuestionsOnPage(questions) {
    // Implementation to highlight questions on the current page
    // This is a placeholder for future enhancement
    console.log('Highlighting questions on page:', questions);
}

// Add a floating button to show extension (optional)
function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'tailieu-floating-btn';
    button.innerHTML = '📚';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => {
        // Open extension popup programmatically (if possible)
        // Note: In Manifest V3, you can't open popup programmatically
        // This is just for visual feedback
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    });
    
    document.body.appendChild(button);
}

// Uncomment the line below if you want a floating button on every page
// createFloatingButton();