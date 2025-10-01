// Background script to handle network security issues
chrome.runtime.onInstalled.addListener(() => {
    console.log('Tailieu Extension installed with Declarative Net Request rules');
    
    // Enable the declarative net request rules
    chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['ruleset_1']
    }).then(() => {
        console.log('Declarative Net Request rules enabled');
    }).catch(error => {
        console.log('Error enabling DNR rules:', error);
    });
});

// Monitor for network errors (non-blocking)
chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
        if (details.error === 'net::ERR_CERT_COMMON_NAME_INVALID') {
            console.log('SSL certificate error detected for:', details.url);
            
            // Notify content script about the error
            chrome.tabs.sendMessage(details.tabId, {
                action: 'sslError',
                url: details.url,
                error: details.error
            }).catch(() => {
                // Ignore if tab doesn't have content script
            });
        }
        
        // Log other common mixed content errors
        if (details.error.includes('ERR_BLOCKED_BY_CLIENT') || 
            details.error.includes('ERR_INSECURE_RESPONSE')) {
            console.log('Mixed content or security error:', details.url, details.error);
        }
    },
    {
        urls: ["<all_urls>"]
    }
);

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fixMixedContent') {
        // Help content script fix mixed content issues
        console.log('Content script requested help with mixed content');
        sendResponse({ success: true });
    }
});