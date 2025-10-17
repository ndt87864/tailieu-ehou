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

// Note: removed chrome.webRequest.onErrorOccurred usage to avoid requesting the
// powerful "webRequest" permission which increases Chrome Web Store review risk.
// If you need to detect network errors in the future, consider using:
// - chrome.declarativeNetRequest rules for blocking/redirecting, or
// - try/catch and network error handling within extension pages (popup/content scripts)
// The DNR rules remain enabled below for declared blocking behavior.

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fixMixedContent') {
        // Help content script fix mixed content issues
        console.log('Content script requested help with mixed content');
        sendResponse({ success: true });
    }
});