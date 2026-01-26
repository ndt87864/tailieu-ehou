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

    if (request.action === 'verifyQuestionsExist') {
        // request.questions: array of { question, documentId }
        (async () => {
            try {
                const db = getDb();
                const checks = [];
                for (const q of request.questions || []) {
                    try {
                        const exists = await checkQuestionExists(db, q.question, q.documentId || null);
                        checks.push({ question: q.question, documentId: q.documentId || null, exists });
                    } catch (e) {
                        checks.push({ question: q.question, documentId: q.documentId || null, exists: false, error: e.message || String(e) });
                    }
                }
                sendResponse({ success: true, checks });
            } catch (err) {
                sendResponse({ success: false, error: err.message || String(err) });
            }
        })();
        return true;
    }

    if (request.action === 'checkOutdatedData') {
        (async () => {
            try {
                // Get selected documents and cached questions from storage
                const storage = await chrome.storage.local.get(['tailieu_selected_documents', 'tailieu_questions', 'tailieu_db_updated']);
                const selectedDocIds = storage.tailieu_selected_documents;
                const cachedQuestions = storage.tailieu_questions || [];
                const flagDbUpdated = storage.tailieu_db_updated || false;

                if (!selectedDocIds || selectedDocIds.length === 0) {
                    sendResponse({ success: true, isOutdated: false });
                    return;
                }

                // If explicit flag is set, it's definitely outdated
                if (flagDbUpdated) {
                    sendResponse({ success: true, isOutdated: true, reason: 'flag_set' });
                    return;
                }

                // Check count in Firestore
                const remoteCount = await getQuestionsCountByDocuments(Array.isArray(selectedDocIds) ? selectedDocIds : [selectedDocIds]);

                const isOutdated = remoteCount !== cachedQuestions.length;
                if (isOutdated) {
                    // Update the flag so other parts of the extension know
                    await chrome.storage.local.set({ 'tailieu_db_updated': true });
                }

                sendResponse({ success: true, isOutdated, remoteCount, cachedCount: cachedQuestions.length });
            } catch (err) {
                console.error('[Background] Error checking outdated data:', err);
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }

    if (request.action === 'getCategories') {
        getAllCategories()
            .then(categories => sendResponse({ success: true, categories }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'getDocumentsByCategory') {
        getDocumentsByCategory(request.categoryId)
            .then(documents => sendResponse({ success: true, documents }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'getQuestionsByDocuments') {
        getQuestionsByDocuments(request.documentIds)
            .then(questions => sendResponse({ success: true, questions }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
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
            // Prepare document/category metadata (for better messages)
            const docId = q.documentId || null;
            let documentTitle = null;
            let categoryId = null;
            let categoryTitle = null;

            if (docId) {
                try {
                    const docSnap = await db.collection('documents').doc(docId).get();
                    if (docSnap.exists) {
                        const docData = docSnap.data();
                        documentTitle = docData.title || null;
                        categoryId = docData.categoryId || null;
                    }
                } catch (e) {
                    console.warn('[Background] Unable to read document metadata for', docId, e.message || e);
                }
            }

            if (categoryId) {
                try {
                    const catSnap = await db.collection('categories').doc(categoryId).get();
                    if (catSnap.exists) {
                        categoryTitle = (catSnap.data() && catSnap.data().title) || null;
                    }
                } catch (e) {
                    console.warn('[Background] Unable to read category metadata for', categoryId, e.message || e);
                }
            }

            // Prefer checking existence within the same document if provided
            const exists = await checkQuestionExists(db, q.question, docId);

            if (exists) {
                results.push({ index: q.index, status: 'exists', message: `Đã có trong DB`, documentId: docId, documentTitle, categoryId, categoryTitle });
            } else {
                // Add (will attach documentId/categoryId if possible)
                const addedId = await addQuestionToDB(db, q);

                // Verify write by reading back the created document
                let addedDoc = null;
                try {
                    addedDoc = await db.collection('questions').doc(addedId).get();
                } catch (e) {
                    console.warn('[Background] Unable to re-read added question:', e.message || e);
                }

                if (!addedDoc || !addedDoc.exists) {
                    throw new Error('Không xác nhận được câu hỏi đã được ghi vào Firestore');
                }

                const msgParts = [];
                if (documentTitle) msgParts.push(`tài liệu: "${documentTitle}"`);
                else if (docId) msgParts.push(`tài liệuId: ${docId}`);
                if (categoryTitle) msgParts.push(`danh mục: "${categoryTitle}"`);
                const msg = msgParts.length ? `Đã thêm vào ${msgParts.join(' / ')}` : 'Đã thêm';
                results.push({ index: q.index, status: 'success', message: msg, documentId: docId, documentTitle, categoryId, categoryTitle, addedId });
            }
        } catch (error) {
            console.error('Error processing question', q.index, error);
            results.push({ index: q.index, status: 'error', message: error.message });
        }
    }
    return results;
}

// Check if question exists in Firestore
async function checkQuestionExists(db, questionText, documentId = null) {
    let queryRef = db.collection('questions').where('question', '==', questionText.trim());
    if (documentId) {
        queryRef = queryRef.where('documentId', '==', documentId);
    }
    const snapshot = await queryRef.get();
    return !snapshot.empty;
}

// Add question to Firestore
async function addQuestionToDB(db, questionObj) {
    // Extract correct answers text
    const correctAnswers = (questionObj.answers || [])
        .filter(a => a.isTicked || a.isCorrect || a.isSelected)
        .map(a => a.text)
        .join('\n');

    // Calculate STT (Order Number)
    let stt = 1;
    if (questionObj.documentId) {
        try {
            const snapshot = await db.collection('questions')
                .where('documentId', '==', questionObj.documentId)
                .get();
            stt = snapshot.size + 1;
        } catch (e) {
            console.warn('[Background] Failed to calculate STT:', e);
        }
    }

    // Format data matching the App's structure (Standard Schema)
    const data = {
        question: questionObj.question,
        answer: correctAnswers || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        stt: stt
    };

    // Attach documentId if caller provided it
    if (questionObj.documentId) {
        data.documentId = questionObj.documentId;
    }

    const docRef = await db.collection('questions').add(data);
    return docRef.id;
}