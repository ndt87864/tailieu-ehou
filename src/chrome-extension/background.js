// Polyfill window for libraries that rely on it
self.window = self;

// Load Firebase Compat Libraries and Helpers
try {
    importScripts(
        'firebase-app-compat.js',
        'firebase-firestore-compat.js',
        'firebase.extends.js',
        'firebaseService.js'
    );
    console.log('[Background] Firebase scripts imported successfully.');

    // Initialize Firebase
    if (typeof initializeFirebase === 'function') {
        initializeFirebase();
        console.log('[Background] Firebase initialized.');
    }
} catch (e) {
    console.error('[Background] Failed to load Firebase scripts:', e);
}

// Background script setup
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

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fixMixedContent') {
        console.log('Content script requested help with mixed content');
        sendResponse({ success: true });
        return false;
    }

    if (request.action === 'batchAddQuestionsToDB') {
        handleBatchAddQuestions(request.questions)
            .then(results => sendResponse({ success: true, results }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }
});

// Batch Add Logic
async function handleBatchAddQuestions(questions) {
    console.log('[Background] Processing batch of', questions.length, 'questions');
    const results = [];

    // Ensure we have DB access
    let db;
    try {
        db = getDb(); // from firebaseService.js
    } catch (e) {
        throw new Error('Database not initialized: ' + e.message);
    }

    for (const q of questions) {
        try {
            // Check exists
            const exists = await checkQuestionExists(db, q.question);

            if (exists) {
                results.push({ index: q.index, status: 'exists', message: 'Đã có trong DB' });
            } else {
                // Add
                await addQuestionToDB(db, q);
                results.push({ index: q.index, status: 'success', message: 'Đã thêm' });
            }
        } catch (error) {
            console.error('Error processing question', q.index, error);
            results.push({ index: q.index, status: 'error', message: error.message });
        }
    }
    return results;
}

// Check if question exists in Firestore
async function checkQuestionExists(db, questionText) {
    const q = db.collection('questions').where('question', '==', questionText.trim());
    const snapshot = await q.get();
    return !snapshot.empty;
}

// Add question to Firestore
async function addQuestionToDB(db, questionObj) {
    // Extract correct answers text
    const correctAnswers = (questionObj.answers || [])
        .filter(a => a.isTicked || a.isCorrect || a.isSelected)
        .map(a => a.text)
        .join('\n');

    // Format data matching the App's structure
    const data = {
        question: questionObj.question,
        answer: correctAnswers || '',
        answers: questionObj.answers || [],
        type: questionObj.type || 'scanner',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        source: 'scanner_extension'
    };

    await db.collection('questions').add(data);
    return true;
}