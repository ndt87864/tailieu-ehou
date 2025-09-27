// Chrome Extension Popup Script
// API Base URL - ưu tiên API online
function getApiBaseUrl() {
  // Always try online API first
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const currentUrl = tabs[0].url;
        
        // Always prioritize online API unless explicitly on localhost
        if (currentUrl.includes('localhost:5174') || currentUrl.includes('127.0.0.1:5174')) {
          resolve('http://localhost:5174/api');
        } else {
          // Use online API for all other cases
          resolve('https://tailieuehou.id.vn/api');
        }
      } else {
        // Default to online API
        resolve('https://tailieuehou.id.vn/api');
      }
    });
  });
}

let API_BASE_URL = 'https://tailieuehou.id.vn/api'; // Default to online

// Initialize API URL
getApiBaseUrl().then(url => {
  API_BASE_URL = url;
  console.log('Extension API Base URL:', API_BASE_URL);
});

// DOM Elements
let categorySelect, documentSearchInput, documentList, selectAllBtn, clearAllBtn, selectedCountSpan, questionsSection, questionsList, loading, error, clearCacheBtn, cacheSection;

// Data storage
let categories = [];
let documents = [];
let selectedDocuments = []; // Array of selected document IDs
let filteredDocuments = []; // Filtered documents for search
let questions = [];

// Cache keys for persistent storage
const CACHE_KEYS = {
    CATEGORIES: 'tailieu_categories',
    DOCUMENTS: 'tailieu_documents', 
    QUESTIONS: 'tailieu_questions',
    SELECTED_CATEGORY: 'tailieu_selected_category',
    SELECTED_DOCUMENTS: 'tailieu_selected_documents', // Changed from SELECTED_DOCUMENT
    LAST_SESSION: 'tailieu_last_session'
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing extension popup...');
        await initializeElements();
        setupEventListeners();
        
        // Try to restore from cache first
        await restoreFromCache();
        
        // Load categories (from API or cache)
        await loadCategories();
        
        // Auto-restore selections if available
        await autoRestoreSelections();
        
        console.log('Extension popup initialized successfully');
    } catch (error) {
        console.error('Failed to initialize extension popup:', error);
        showError('Lỗi khởi tạo extension. Vui lòng reload lại.');
    }
});

function initializeElements() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Initializing DOM elements...');
            
            categorySelect = document.getElementById('categorySelect');
            documentSearchInput = document.getElementById('documentSearchInput');
            documentList = document.getElementById('documentList');
            selectAllBtn = document.getElementById('selectAllBtn');
            clearAllBtn = document.getElementById('clearAllBtn');
            selectedCountSpan = document.getElementById('selectedCount');
            questionsSection = document.getElementById('questionsSection');
            questionsList = document.getElementById('questionsList');
            loading = document.getElementById('loading');
            error = document.getElementById('error');
            clearCacheBtn = document.getElementById('clearCacheBtn');
            cacheSection = document.getElementById('cacheSection');
            
            // Kiểm tra tất cả elements có tồn tại không
            const elements = {
                categorySelect, documentSearchInput, documentList, selectAllBtn,
                clearAllBtn, selectedCountSpan, questionsSection, questionsList, loading, error, clearCacheBtn, cacheSection
            };
            
            const missingElements = Object.keys(elements).filter(key => !elements[key]);
            
            if (missingElements.length > 0) {
                throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
            }
            
            console.log('All DOM elements found successfully');
            resolve();
            
        } catch (err) {
            console.error('Error initializing elements:', err);
            reject(err);
        }
    });
}

function setupEventListeners() {
    categorySelect.addEventListener('change', onCategoryChange);
    
    // Document search functionality
    documentSearchInput.addEventListener('input', onDocumentSearch);
    
    // Control buttons
    selectAllBtn.addEventListener('click', selectAllDocuments);
    clearAllBtn.addEventListener('click', clearAllDocuments);
    
    // Clear cache button
    clearCacheBtn.addEventListener('click', clearAllCache);
    
    // Document list will be populated dynamically with event listeners
}

// Cache Management Functions
async function saveToCache(key, data) {
    try {
        await chrome.storage.local.set({ [key]: data });
        console.log(`Saved to cache: ${key}`, data);
    } catch (error) {
        console.error(`Error saving to cache (${key}):`, error);
    }
}

async function getFromCache(key) {
    try {
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
    } catch (error) {
        console.error(`Error getting from cache (${key}):`, error);
        return null;
    }
}

async function restoreFromCache() {
    try {
        console.log('Restoring data from cache...');
        
        let hasUsefulCache = false;
        
        // Restore categories
        const cachedCategories = await getFromCache(CACHE_KEYS.CATEGORIES);
        if (cachedCategories && cachedCategories.length > 0) {
            categories = cachedCategories;
            console.log('Restored categories from cache:', categories.length);
        }

        // Restore documents  
        const cachedDocuments = await getFromCache(CACHE_KEYS.DOCUMENTS);
        if (cachedDocuments && cachedDocuments.length > 0) {
            documents = cachedDocuments;
            console.log('Restored documents from cache:', documents.length);
        }

        // Restore questions and check if we have useful cache (questions + selected documents)
        const cachedQuestions = await getFromCache(CACHE_KEYS.QUESTIONS);
        const selectedDocumentIds = await getFromCache(CACHE_KEYS.SELECTED_DOCUMENTS);
        
        if (cachedQuestions && cachedQuestions.length > 0 && selectedDocumentIds && selectedDocumentIds.length > 0) {
            questions = cachedQuestions;
            hasUsefulCache = true;
            console.log('Restored questions from cache:', questions.length);
            
            // Send to content script immediately
            sendQuestionsToContentScript(questions);
        }

        // Only show cache section if we have useful cache (questions + selected documents)
        if (hasUsefulCache) {
            showCacheSection();
        } else {
            hideCacheSection();
        }

        return hasUsefulCache;
    } catch (error) {
        console.error('Error restoring from cache:', error);
        hideCacheSection();
        return false;
    }
}

async function autoRestoreSelections() {
    try {
        const selectedCategoryId = await getFromCache(CACHE_KEYS.SELECTED_CATEGORY);
        const selectedDocumentIds = await getFromCache(CACHE_KEYS.SELECTED_DOCUMENTS);
        
        console.log('Auto-restoring selections:', { selectedCategoryId, selectedDocumentIds });
        
        if (selectedCategoryId && categories.length > 0) {
            // Restore category selection
            categorySelect.value = selectedCategoryId;
            
            // If we have documents, populate document list
            if (documents.length > 0) {
                populateDocumentList();
                
                if (selectedDocumentIds && selectedDocumentIds.length > 0) {
                    // Restore document selections
                    selectedDocuments = selectedDocumentIds;
                    updateDocumentSelections();
                    
                    // If we have questions, show status and auto-compare
                    if (questions.length > 0) {
                        showQuestionsStatus(questions.length);
                        // Auto-compare when restoring, with small delay to ensure content script is ready
                        setTimeout(() => compareQuestionsWithPage(), 1000);
                    }
                }
            } else {
                // No cached documents, load from API
                await loadDocuments(selectedCategoryId);
                if (selectedDocumentIds && selectedDocumentIds.length > 0) {
                    selectedDocuments = selectedDocumentIds;
                    updateDocumentSelections();
                    await onDocumentsChange();
                }
            }
        }
        
    } catch (error) {
        console.error('Error auto-restoring selections:', error);
    }
}

async function sendQuestionsToContentScript(questionsData) {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
            console.log('No active tab for sending questions');
            return;
        }
        
        // Check if tab is ready
        if (activeTab.status === 'loading' || !activeTab.url || 
            activeTab.url.startsWith('chrome://') || 
            activeTab.url.startsWith('chrome-extension://') ||
            activeTab.url.startsWith('edge://') ||
            activeTab.url.startsWith('about:')) {
            console.log('Tab not ready for questions:', activeTab.url);
            return;
        }
        
        try {
            await Promise.race([
                chrome.tabs.sendMessage(activeTab.id, {
                    action: 'setExtensionQuestions',
                    questions: questionsData
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Send questions timeout')), 3000)
                )
            ]);
            
            console.log('Questions sent to content script successfully');
        } catch (messageError) {
            console.log('Content script not ready for questions:', messageError.message);
            // Try to inject content script and retry
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content.js']
                });
                
                // Retry after injection
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(activeTab.id, {
                            action: 'setExtensionQuestions',
                            questions: questionsData
                        });
                        console.log('Questions sent after injection');
                    } catch (retryError) {
                        console.log('Still could not send questions after injection');
                    }
                }, 1500);
                
            } catch (injectionError) {
                console.log('Could not inject content script for questions');
            }
        }
        
    } catch (error) {
        console.log('Error sending questions to content script:', error.message);
    }
}

async function clearCache() {
    try {
        // Clear all cache data
        await chrome.storage.local.clear();
        
        // Reset local data
        categories = [];
        documents = [];
        selectedDocuments = [];
        filteredDocuments = [];
        questions = [];
        
        // Reset UI
        resetUI();
        
        hideCacheSection();
        
        // Clear content script cache and questions popup
        await clearContentScriptCache();
        
        // Reload categories
        await loadCategories();
        
        console.log('Cache cleared successfully');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// Clear all cache and reset extension state (triggered by button)
async function clearAllCache() {
    try {
        // Show loading while clearing
        showLoading(true);
        
        // Call the main clearCache function
        await clearCache();
        
        // Show success message
        showSuccessMessage('✅ Cache đã được xóa thành công! Extension được reset về trạng thái ban đầu.');
        
    } catch (error) {
        console.error('Error clearing all cache:', error);
        showError('Lỗi khi xóa cache: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Reset UI to initial state
function resetUI() {
    try {
        // Reset category select
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        categorySelect.value = '';
        
        // Reset document list
        documentList.innerHTML = '<div class="no-documents">Chưa có tài liệu nào</div>';
        
        // Reset document search
        documentSearchInput.value = '';
        documentSearchInput.disabled = true;
        
        // Reset controls
        selectAllBtn.disabled = true;
        clearAllBtn.disabled = true;
        selectedCountSpan.textContent = '0 được chọn';
        
        // Hide questions section
        questionsSection.style.display = 'none';
        
        // Clear error messages
        hideError();
        
        console.log('UI reset to initial state');
        
    } catch (error) {
        console.error('Error resetting UI:', error);
    }
}

// Clear content script cache
async function clearContentScriptCache() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.log('No active tab found for cache clearing');
            return;
        }
        
        // Check if tab is ready
        if (tab.status === 'loading' || !tab.url || 
            tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
            console.log('Tab not ready for cache clearing:', tab.url);
            return;
        }
        
        try {
            // Send clear cache message with timeout
            await Promise.race([
                chrome.tabs.sendMessage(tab.id, {
                    action: 'clearCache'
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Clear cache timeout')), 3000)
                )
            ]);
            
            // Also clear questions popup
            await Promise.race([
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateQuestionsPopup',
                    questions: []
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Clear popup timeout')), 3000)
                )
            ]);
            
            console.log('Content script cache cleared successfully');
        } catch (messageError) {
            console.log('Could not clear content script cache, content script not available:', messageError.message);
            // This is not critical, continue silently
        }
        
    } catch (error) {
        console.log('Error clearing content script cache:', error.message);
        // Not critical, continue silently
    }
}

// Show success message
function showSuccessMessage(message) {
    // Remove existing success messages
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        color: #155724;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
        font-size: 13px;
        animation: fadeIn 0.3s ease;
    `;
    successDiv.textContent = message;
    
    // Insert after header
    const header = document.querySelector('.header');
    header.insertAdjacentElement('afterend', successDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// API Functions
async function apiRequest(endpoint) {
    try {
        let url;
        
        // Determine URL based on API base and endpoint
        if (API_BASE_URL.includes('localhost')) {
            // Local development - dynamic API
            url = `${API_BASE_URL}${endpoint}`;
        } else {
            // Online production - static JSON files
            if (endpoint === '/categories') {
                url = `${API_BASE_URL}/categories.json`;
            } else if (endpoint === '/documents') {
                url = `${API_BASE_URL}/documents.json`;
            } else if (endpoint === '/questions') {
                url = `${API_BASE_URL}/questions.json`;
            } else if (endpoint.includes('categoryId=')) {
                // Documents by category: /documents?categoryId=xxx
                const categoryId = endpoint.split('categoryId=')[1];
                url = `${API_BASE_URL}/documents-${categoryId}.json`;
            } else if (endpoint.includes('documentId=')) {
                // Questions by document: /questions?documentId=xxx
                const documentId = endpoint.split('documentId=')[1];
                url = `${API_BASE_URL}/questions-${documentId}.json`;
            } else {
                // Fallback - append .json for static files
                url = `${API_BASE_URL}${endpoint}.json`;
            }
        }
        
        console.log('Extension API Request:', url);
        
        // Add timeout and retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                cache: 'no-cache', // Always fetch fresh data
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                // If online API fails, try fallback immediately
                if (!API_BASE_URL.includes('localhost') && (response.status === 404 || response.status >= 400)) {
                    console.warn(`API request failed: ${response.status} for ${url}, trying fallback...`);
                    return await tryFallbackRequest(endpoint, controller);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            console.log('Extension API Response:', { url, dataKeys: Object.keys(data), itemCount: data.categories?.length || data.documents?.length || data.questions?.length || 0 });
            return data;
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // If fetch fails completely, try fallback
            if (!API_BASE_URL.includes('localhost')) {
                console.warn(`Fetch failed for ${url}:`, fetchError.message, ', trying fallback...');
                return await tryFallbackRequest(endpoint, controller);
            } else {
                throw fetchError;
            }
        }
        
    } catch (err) {
        console.error('Extension API Request failed:', err);
        
        // If online API fails completely, show helpful message
        if (!API_BASE_URL.includes('localhost')) {
            console.warn('Online API failed, extension may work better on localhost for development');
        }
        
        throw err;
    }
}

// Separate fallback function for better error handling
async function tryFallbackRequest(endpoint, controller) {
    try {
        let fallbackUrl;
        let shouldFilter = false;
        let filterKey = '';
        let filterValue = '';
        
        if (endpoint.includes('categoryId=')) {
            fallbackUrl = `${API_BASE_URL}/documents.json`;
            shouldFilter = true;
            filterKey = 'categoryId';
            filterValue = endpoint.split('categoryId=')[1];
        } else if (endpoint.includes('documentId=')) {
            fallbackUrl = `${API_BASE_URL}/questions.json`;
            shouldFilter = true;
            filterKey = 'documentId';  
            filterValue = endpoint.split('documentId=')[1];
        } else {
            throw new Error(`No fallback available for endpoint: ${endpoint}`);
        }
        
        console.log(`Trying fallback: ${fallbackUrl}${shouldFilter ? ` (filtering by ${filterKey}=${filterValue})` : ''}`);
        
        const fallbackResponse = await fetch(fallbackUrl, {
            signal: controller.signal,
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!fallbackResponse.ok) {
            throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText} - Fallback also failed`);
        }
        
        const fallbackData = await fallbackResponse.json();
        console.log('Fallback data loaded from:', fallbackUrl);
        
        if (shouldFilter) {
            // Filter data based on the original request
            if (endpoint.includes('categoryId=')) {
                const filteredDocuments = fallbackData.documents?.filter(doc => doc.categoryId === filterValue) || [];
                console.log(`Filtered ${fallbackData.documents?.length || 0} documents to ${filteredDocuments.length} for category ${filterValue}`);
                return { documents: filteredDocuments };
            } else if (endpoint.includes('documentId=')) {
                const filteredQuestions = fallbackData.questions?.filter(q => q.documentId === filterValue) || [];
                console.log(`Filtered ${fallbackData.questions?.length || 0} questions to ${filteredQuestions.length} for document ${filterValue}`);
                return { questions: filteredQuestions };
            }
        }
        
        return fallbackData;
        
    } catch (fallbackError) {
        console.error('Fallback request also failed:', fallbackError);
        
        // Return empty data structure as last resort
        if (endpoint.includes('categoryId=')) {
            console.log('Returning empty documents array as last resort');
            return { documents: [] };
        } else if (endpoint.includes('documentId=')) {
            console.log('Returning empty questions array as last resort');
            return { questions: [] };
        }
        
        throw fallbackError;
    }
}

async function loadCategories() {
    try {
        // Use cached categories if available
        if (categories.length > 0) {
            console.log('Using cached categories:', categories.length);
            populateCategorySelect();
            return;
        }
        
        showLoading(true);
        hideError();
        
        console.log('Loading categories from API...');
        const data = await apiRequest('/categories');
        
        categories = data.categories || [];
        console.log('Categories loaded from API:', categories.length);
        
        // Save to cache
        await saveToCache(CACHE_KEYS.CATEGORIES, categories);
        
        populateCategorySelect();
        
    } catch (err) {
        console.error('Failed to load categories:', err);
        showError('Không thể tải danh sách danh mục. Vui lòng kiểm tra kết nối API.');
    } finally {
        showLoading(false);
    }
}

async function loadDocuments(categoryId) {
    try {
        // Check if we have cached documents for this category
        if (documents.length > 0 && categoryId) {
            const categoryDocuments = documents.filter(doc => doc.categoryId === categoryId);
            if (categoryDocuments.length > 0) {
                console.log('Using cached documents for category:', categoryId, categoryDocuments.length);
                documents = categoryDocuments;
                populateDocumentList();
                return;
            }
        }
        
        showLoading(true);
        hideError();
        
        console.log(`Loading documents from API${categoryId ? ` for category: ${categoryId}` : ''}...`);
        const endpoint = categoryId ? `/documents?categoryId=${categoryId}` : '/documents';
        const data = await apiRequest(endpoint);
        
        documents = data.documents || [];
        console.log('Documents loaded from API:', documents.length);
        
        // Save to cache (merge with existing cache)
        const allCachedDocuments = await getFromCache(CACHE_KEYS.DOCUMENTS) || [];
        const mergedDocuments = [...allCachedDocuments];
        
        // Add new documents if not already cached
        documents.forEach(doc => {
            if (!mergedDocuments.find(cached => cached.id === doc.id)) {
                mergedDocuments.push(doc);
            }
        });
        
        await saveToCache(CACHE_KEYS.DOCUMENTS, mergedDocuments);
        
        populateDocumentList();
        
        // Enable search input after documents are loaded
        // documentSearchInput is enabled on demand when user clicks select
        
    } catch (err) {
        console.error('Failed to load documents:', err);
        showError('Không thể tải danh sách tài liệu.');
    } finally {
        showLoading(false);
    }
}

async function loadQuestions(documentIds) {
    try {
        showLoading(true);
        hideError();
        
        if (!documentIds || documentIds.length === 0) {
            console.log('No documents selected');
            showQuestionsStatus(0);
            showLoading(false);
            return;
        }
        
        console.log(`Loading questions for documents: ${documentIds.join(', ')}...`);
        
        let allQuestions = [];
        
        // Load questions for each selected document
        for (const documentId of documentIds) {
            const endpoint = `/questions?documentId=${documentId}`;
            
            try {
                const data = await apiRequest(endpoint);
                const documentQuestions = data.questions || [];
                allQuestions = allQuestions.concat(documentQuestions);
                console.log(`Questions loaded for ${documentId}:`, documentQuestions.length);
            } catch (apiError) {
                console.error(`API request failed for document ${documentId}:`, apiError);
                
                // Try to use cached questions as fallback
                const cachedQuestions = await getFromCache(CACHE_KEYS.QUESTIONS);
                if (cachedQuestions && cachedQuestions.length > 0) {
                    const filteredQuestions = cachedQuestions.filter(q => q.documentId === documentId);
                    allQuestions = allQuestions.concat(filteredQuestions);
                    console.log(`Using cached questions for ${documentId}:`, filteredQuestions.length);
                }
            }
        }
        
        questions = allQuestions;
        console.log('Total questions loaded:', questions.length);
        
        // Show simple status message instead of full questions list
        showQuestionsStatus(questions.length);
        
        // Save questions to cache if we got some
        if (questions.length > 0) {
            await saveToCache(CACHE_KEYS.QUESTIONS, questions);
            
            // Send to content script
            sendQuestionsToContentScript(questions);
        } else {
            console.log('No questions found for selected documents');
            // Still show status even with 0 questions
            showQuestionsStatus(0);
        }
        
    } catch (err) {
        console.error('Failed to load questions:', err);
        showError('Không thể tải danh sách câu hỏi.');
    } finally {
        showLoading(false);
    }
}

// UI Functions
function populateCategorySelect() {
    // Clear existing options except first one
    categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
    
    try {
        categories.forEach(category => {
            const option = window.document.createElement('option');
            option.value = category.id;
            option.textContent = category.title;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating category select:', error);
        // Fallback: sử dụng innerHTML
        const optionsHTML = categories.map(category => 
            `<option value="${category.id}">${category.title}</option>`
        ).join('');
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>' + optionsHTML;
    }
}

function populateDocumentList() {
    // Clear existing documents
    documentList.innerHTML = '';
    
    try {
        // Show the document list container
        documentList.style.display = 'block';
        
        // Use filtered documents if search is active, otherwise use all documents
        const documentsToShow = filteredDocuments.length > 0 ? filteredDocuments : documents;
        
        if (documentsToShow.length === 0) {
            documentList.innerHTML = '<div class="no-documents">Không có tài liệu nào</div>';
            documentSearchInput.disabled = true;
            return;
        }
        
        // Enable search input when we have documents
        documentSearchInput.disabled = false;
        
        documentsToShow.forEach(doc => {
            const documentItem = document.createElement('div');
            documentItem.className = 'document-item';
            documentItem.innerHTML = `
                <input type="checkbox" id="doc-${doc.id}" class="document-checkbox" value="${doc.id}" ${selectedDocuments.includes(doc.id) ? 'checked' : ''}>
                <label for="doc-${doc.id}" class="document-label">${doc.title}</label>
            `;
            
            // Add event listener for checkbox change
            const checkbox = documentItem.querySelector('.document-checkbox');
            checkbox.addEventListener('change', onDocumentCheckboxChange);
            
            documentList.appendChild(documentItem);
        });
        
        // Update controls state
        updateControlsState();
        updateSelectedCount();
        
    } catch (error) {
        console.error('Error populating document list:', error);
        documentList.innerHTML = '<div class="no-documents">Lỗi tải danh sách tài liệu</div>';
    }
}

function updateDocumentSelections() {
    // Update checkboxes based on selectedDocuments array
    const checkboxes = documentList.querySelectorAll('.document-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectedDocuments.includes(checkbox.value);
    });
    updateSelectedCount();
    updateControlsState();
}

function updateSelectedCount() {
    selectedCountSpan.textContent = `${selectedDocuments.length} tài liệu được chọn`;
}

function updateControlsState() {
    const totalDocuments = documents.length;
    const selectedCount = selectedDocuments.length;
    
    selectAllBtn.disabled = totalDocuments === 0 || selectedCount === totalDocuments;
    clearAllBtn.disabled = selectedCount === 0;
}

function onDocumentCheckboxChange(event) {
    const documentId = event.target.value;
    const isChecked = event.target.checked;
    
    if (isChecked) {
        if (!selectedDocuments.includes(documentId)) {
            selectedDocuments.push(documentId);
        }
    } else {
        const index = selectedDocuments.indexOf(documentId);
        if (index > -1) {
            selectedDocuments.splice(index, 1);
        }
    }
    
    updateSelectedCount();
    updateControlsState();
    
    // Save to cache and trigger questions load
    saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
    onDocumentsChange();
}

function selectAllDocuments() {
    const checkboxes = documentList.querySelectorAll('.document-checkbox');
    selectedDocuments = [];
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedDocuments.push(checkbox.value);
    });
    
    updateSelectedCount();
    updateControlsState();
    
    // Save to cache and trigger questions load
    saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
    onDocumentsChange();
}

function clearAllDocuments() {
    const checkboxes = documentList.querySelectorAll('.document-checkbox');
    selectedDocuments = [];
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    updateSelectedCount();
    updateControlsState();
    
    // Save to cache and clear questions
    saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
    questionsSection.style.display = 'none';
}

function showQuestionsStatus(count) {
    try {
        if (count === 0) {
            questionsList.innerHTML = '<div class="no-questions">Không có câu hỏi nào cho tài liệu này.</div>';
            document.getElementById('questionsCount').textContent = 'Không có câu hỏi';
        } else {
            // Show notification banner like in the image
            questionsList.innerHTML = `
                <div id="notificationBanner" style="
                    background: linear-gradient(135deg, #42A5F5, #1E88E5);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    box-shadow: 0 2px 10px rgba(66, 165, 245, 0.3);
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 600; font-size: 14px;">${count} câu hỏi sẵn sàng</span>
                    </div>
                    <button id="compareNowBtn" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 5px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">
                        So sánh ngay
                    </button>
                    <button id="closeBannerBtn" style="
                        background: none;
                        color: white;
                        border: none;
                        font-size: 16px;
                        cursor: pointer;
                        padding: 5px;
                        margin-left: 5px;
                    ">
                        ✕
                    </button>
                </div>
                <div style="padding: 15px; text-align: center; color: #666; font-size: 13px;">
                    Extension sẽ tự động tìm và highlight câu hỏi trên trang web
                </div>
            `;
            
            // Add event listeners without inline handlers
            const compareBtn = document.getElementById('compareNowBtn');
            const closeBannerBtn = document.getElementById('closeBannerBtn');
            const notificationBanner = document.getElementById('notificationBanner');
            
            if (compareBtn) {
                compareBtn.addEventListener('click', () => {
                    compareQuestionsWithPage();
                });
                
                // Add hover effects
                compareBtn.addEventListener('mouseenter', () => {
                    compareBtn.style.background = '#45A049';
                });
                compareBtn.addEventListener('mouseleave', () => {
                    compareBtn.style.background = '#4CAF50';
                });
            }
            
            if (closeBannerBtn && notificationBanner) {
                closeBannerBtn.addEventListener('click', () => {
                    notificationBanner.style.display = 'none';
                });
            }
            
            // Update header with simple text
            document.getElementById('questionsCount').textContent = `${count} câu hỏi sẵn sàng`;
        }
        
        // Show questions section
        questionsSection.style.display = 'block';
        
        // Save questions to cache
        saveToCache(CACHE_KEYS.QUESTIONS, questions);
        
        // Only show cache section if we have questions (useful cache)
        if (count > 0) {
            showCacheSection();
        }
        
    } catch (err) {
        console.error('Error showing questions status:', err);
        showError('Lỗi hiển thị trạng thái câu hỏi.');
    }
}

// Event Handlers
async function onCategoryChange() {
    const selectedCategoryId = categorySelect.value;
    
    // Save category selection to cache
    await saveToCache(CACHE_KEYS.SELECTED_CATEGORY, selectedCategoryId);
    
    // Reset document selections and hide questions
    selectedDocuments = [];
    documentList.innerHTML = '<div class="no-documents">Đang tải tài liệu...</div>';
    documentSearchInput.value = '';
    filteredDocuments = [];
    questionsSection.style.display = 'none';
    
    // Clear document selections from cache when category changes
    await saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, []);
    hideCacheSection(); // Hide cache when changing category
    updateControlsState();
    
    if (selectedCategoryId) {
        // Load documents filtered by selected category
        await loadDocuments(selectedCategoryId);
    }
}

async function onDocumentsChange() {
    // Save document selections to cache
    await saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
    
    if (selectedDocuments.length > 0) {
        // Hide previous questions
        questionsSection.style.display = 'none';
        hideCacheSection();
        
        // Load questions for selected documents
        await onLoadQuestions();
    } else {
        questionsSection.style.display = 'none';
        hideCacheSection(); // Hide cache when no documents selected
    }
}

async function loadQuestions(documentIds) {
    try {
        showLoading(true);
        hideError();
        
        if (!documentIds || documentIds.length === 0) {
            console.log('No documents selected');
            showQuestionsStatus(0);
            showLoading(false);
            return;
        }
        
        console.log(`Loading questions for documents: ${documentIds.join(', ')}...`);
        
        let allQuestions = [];
        
        // Load questions for each selected document
        for (const documentId of documentIds) {
            const endpoint = `/questions?documentId=${documentId}`;
            
            try {
                const data = await apiRequest(endpoint);
                const documentQuestions = data.questions || [];
                allQuestions = allQuestions.concat(documentQuestions);
                console.log(`Questions loaded for ${documentId}:`, documentQuestions.length);
            } catch (apiError) {
                console.error(`API request failed for document ${documentId}:`, apiError);
                
                // Try to use cached questions as fallback
                const cachedQuestions = await getFromCache(CACHE_KEYS.QUESTIONS);
                if (cachedQuestions && cachedQuestions.length > 0) {
                    const filteredQuestions = cachedQuestions.filter(q => q.documentId === documentId);
                    allQuestions = allQuestions.concat(filteredQuestions);
                    console.log(`Using cached questions for ${documentId}:`, filteredQuestions.length);
                }
            }
        }
        
        questions = allQuestions;
        console.log('Total questions loaded:', questions.length);
        
        // Show simple status message instead of full questions list
        showQuestionsStatus(questions.length);
        
        // Save questions to cache if we got some
        if (questions.length > 0) {
            await saveToCache(CACHE_KEYS.QUESTIONS, questions);
            
            // Send to content script
            sendQuestionsToContentScript(questions);
            
            // Update questions popup
            await updateQuestionsPopup(questions);
        } else {
            console.log('No questions found for selected documents');
            // Still show status even with 0 questions
            showQuestionsStatus(0);
            
            // Clear questions popup
            await updateQuestionsPopup([]);
        }
        
    } catch (err) {
        console.error('Failed to load questions:', err);
        showError('Lỗi không mong đợi khi tải câu hỏi.');
    } finally {
        showLoading(false);
    }
}

async function onLoadQuestions() {
    if (selectedDocuments.length > 0) {
        await loadQuestions(selectedDocuments);
        
        // After loading questions, compare with current page
        if (questions.length > 0) {
            setTimeout(() => compareQuestionsWithPage(), 500);
        }
    } else {
        showError('Vui lòng chọn ít nhất một tài liệu.');
    }
}

// Utility Functions
function showLoading(show) {
    try {
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    } catch (err) {
        console.error('Error showing loading:', err);
    }
}

function showError(message) {
    try {
        console.error('Extension Error:', message);
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
        } else {
            // Fallback: alert nếu không có error element
            alert('Error: ' + message);
        }
    } catch (err) {
        console.error('Error showing error message:', err);
        alert('Critical Error: ' + message);
    }
}

function hideError() {
    try {
        if (error) {
            error.style.display = 'none';
        }
    } catch (err) {
        console.error('Error hiding error:', err);
    }
}

// Cache UI Functions
function showCacheSection() {
    if (cacheSection) {
        cacheSection.style.display = 'flex';
        console.log('Cache section shown');
    }
}

function hideCacheSection() {
    if (cacheSection) {
        cacheSection.style.display = 'none';
        console.log('Cache section hidden');
    }
}

function showCacheIndicator() {
    // Use the static cache section instead of creating dynamic indicator
    showCacheSection();
}

function hideCacheIndicator() {
    // Use the static cache section instead of hiding dynamic indicator
    hideCacheSection();
}

// Question comparison functionality
async function compareQuestionsWithPage() {
    try {
        console.log('Comparing questions with current page...');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('No active tab found');
            return;
        }
        
        // Check if tab is ready (not loading and has valid URL)
        if (tab.status === 'loading' || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            console.log('Tab not ready for extension interaction:', tab.url);
            return;
        }
        
        try {
            // Send questions to content script for comparison with timeout
            const response = await Promise.race([
                chrome.tabs.sendMessage(tab.id, {
                    action: 'compareQuestions',
                    questions: questions
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Message timeout')), 5000)
                )
            ]);
            
            if (response && response.success) {
                console.log('Question comparison completed:', response);
                
                // Update questions status with results
                updateQuestionsStatusWithResults(response.matchedQuestions, response.totalPageQuestions);
            } else {
                console.log('No valid response from content script');
                updateQuestionsStatusWithResults(0, 0);
            }
            
        } catch (messageError) {
            console.log('Content script not available:', messageError.message);
            // Try to inject content script if it's not loaded
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                
                // Wait a bit and try again
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'compareQuestions',
                        questions: questions
                    }).catch(() => {
                        console.log('Content script still not ready after injection');
                        updateQuestionsStatusWithResults(0, 0);
                    });
                }, 1000);
                
            } catch (injectionError) {
                console.log('Could not inject content script:', injectionError.message);
                updateQuestionsStatusWithResults(0, 0);
            }
        }
        
    } catch (error) {
        console.error('Error comparing questions:', error);
        // Don't show error to user as this is a background feature
        updateQuestionsStatusWithResults(0, 0);
    }
}

function updateQuestionsStatusWithResults(matchedQuestions, totalPageQuestions) {
    try {
        const matchCount = matchedQuestions || 0;
        const totalQuestions = questions.length;
        
        // Update questions count header
        const questionsCount = document.getElementById('questionsCount');
        if (questionsCount) {
            if (matchCount > 0) {
                questionsCount.textContent = `Tìm thấy ${matchCount}/${totalQuestions} câu hỏi trên trang`;
                questionsCount.style.color = '#4CAF50';
            } else {
                questionsCount.textContent = `${totalQuestions} câu hỏi - Chưa tìm thấy trên trang`;
                questionsCount.style.color = '#ff9800';
            }
        }
        
        // Update content with results
        if (questionsList) {
            const title = matchCount > 0 ? 'Thành công!' : 'Đang tìm kiếm...';
            const message = matchCount > 0 
                ? `Đã tìm thấy và highlight ${matchCount} câu hỏi trên trang web`
                : 'Chưa tìm thấy câu hỏi nào. Hãy thử tải lại trang hoặc điều hướng đến trang có câu hỏi.';
            
            questionsList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: ${matchCount > 0 ? '#4CAF50' : '#ff9800'};">${title}</div>
                    <div style="font-size: 13px; line-height: 1.4;">${message}</div>
                    ${matchCount > 0 ? '<div style="font-size: 11px; color: #999; margin-top: 8px;">Câu hỏi đã được highlight màu vàng trên trang</div>' : ''}
                </div>
            `;
        }
        
    } catch (err) {
        console.error('Error updating questions status:', err);
    }
}

function showComparisonResults(matchedQuestions, totalPageQuestions) {
    // Legacy function - now using updateQuestionsStatusWithResults  
    return updateQuestionsStatusWithResults(matchedQuestions, totalPageQuestions);
}

async function clearPageHighlights() {
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('No active tab found');
            return;
        }
        
        // Check if tab is ready
        if (tab.status === 'loading' || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            console.log('Tab not ready for clearing highlights');
            return;
        }
        
        try {
            // Send clear message to content script with timeout
            await Promise.race([
                chrome.tabs.sendMessage(tab.id, {
                    action: 'clearHighlights'
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Clear timeout')), 3000)
                )
            ]);
            
            console.log('Page highlights cleared');
        } catch (messageError) {
            console.log('Could not clear highlights, content script not available:', messageError.message);
        }
        
        // Remove comparison results from popup
        const resultsSection = document.getElementById('comparisonResults');
        if (resultsSection) {
            resultsSection.remove();
        }
        
    } catch (error) {
        console.error('Error clearing highlights:', error);
    }
}



// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'comparisonComplete') {
        console.log('Received comparison results from content script:', message);
        
        // Update UI with results from auto-comparison
        updateQuestionsStatusWithResults(message.matched, message.total);
        
        sendResponse({ success: true });
    }
});

// Add auto-compare when popup opens (optional)
async function autoCompareOnOpen() {
    // Only auto-compare if we have loaded questions
    if (questions && questions.length > 0) {
        await compareQuestionsWithPage();
    }
}

// Document search functions - integrated with select dropdown
let selectedResultIndex = -1;

function showSearchInput() {
    if (!documentSelect.disabled && documents.length > 0) {
        const wrapper = documentSelect.parentElement;
        wrapper.classList.add('searching');
        
        // Match the height of the select element
        const selectHeight = documentSelect.offsetHeight;
        documentSearchInput.style.height = selectHeight + 'px';
        
        documentSearchInput.style.display = 'block';
        documentSearchInput.style.visibility = 'visible';
        documentSearchInput.classList.add('active');
        documentSearchInput.focus();
        
        // Pre-fill with current selection if any
        const currentValue = documentSelect.value;
        if (currentValue) {
            const currentDoc = documents.find(doc => doc.id === currentValue);
            if (currentDoc) {
                documentSearchInput.value = currentDoc.title;
                documentSearchInput.select(); // Select all text for easy replacement
            }
        }
        
        // Show initial results (all documents)
        showSearchResults(documents);
    }
}

function hideSearchInput() {
    const wrapper = documentSelect.parentElement;
    wrapper.classList.remove('searching');
    
    documentSearchInput.style.display = 'none';
    documentSearchInput.style.visibility = 'hidden';
    documentSearchInput.classList.remove('active');
    searchResults.style.display = 'none';
    selectedResultIndex = -1;
}

function hideSearchInputDelayed() {
    // Use mousedown instead of click to capture result selection before blur
    setTimeout(() => {
        hideSearchInput();
    }, 150);
}

function showSearchResults(results) {
    searchResults.innerHTML = '';
    selectedResultIndex = -1;
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">Không tìm thấy tài liệu nào</div>';
    } else {
        results.forEach((doc, index) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = doc.title;
            item.dataset.docId = doc.id;
            item.dataset.index = index;
            searchResults.appendChild(item);
        });
    }
    
    searchResults.style.display = 'block';
}

function handleSearchResultClick(e) {
    e.preventDefault();
    const item = e.target.closest('.search-result-item');
    if (item && item.dataset.docId) {
        selectDocument(item.dataset.docId);
    }
}

function selectDocument(docId) {
    documentSelect.value = docId;
    hideSearchInput();
    onDocumentChange();
}

function handleSearchKeydown(e) {
    const items = searchResults.querySelectorAll('.search-result-item:not(.no-results)');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedResultIndex = Math.min(selectedResultIndex + 1, items.length - 1);
        updateSelectedResult(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
        updateSelectedResult(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        
        if (selectedResultIndex >= 0 && items[selectedResultIndex]) {
            const docId = items[selectedResultIndex].dataset.docId;
            selectDocument(docId);
        } else {
            // If only one result, auto-select it
            if (items.length === 1) {
                const docId = items[0].dataset.docId;
                selectDocument(docId);
            }
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideSearchInput();
        clearDocumentSearch();
    }
}

function updateSelectedResult(items) {
    items.forEach((item, index) => {
        if (index === selectedResultIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function onDocumentSearch() {
    const searchTerm = documentSearchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        // Show all documents
        filteredDocuments = [];
        showAllDocuments();
    } else {
        // Filter documents based on search term
        filteredDocuments = documents.filter(doc => 
            doc.title.toLowerCase().includes(searchTerm)
        );
        showFilteredDocuments(filteredDocuments);
    }
}

function showAllDocuments() {
    const documentItems = documentList.querySelectorAll('.document-item');
    documentItems.forEach(item => {
        item.classList.remove('hidden');
    });
}

function showFilteredDocuments(filteredDocs) {
    const documentItems = documentList.querySelectorAll('.document-item');
    
    documentItems.forEach(item => {
        const checkbox = item.querySelector('.document-checkbox');
        const documentId = checkbox.value;
        
        // Show item if it matches the filtered documents
        const isVisible = filteredDocs.some(doc => doc.id === documentId);
        if (isVisible) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// No longer needed - using checkbox interface

// Duplicate function removed

function updateControlsState() {
    const totalDocuments = documents.length;
    const selectedCount = selectedDocuments.length;
    
    // Update selected count display
    selectedCountSpan.textContent = `${selectedCount}/${totalDocuments} được chọn`;
    
    // Update button states
    selectAllBtn.disabled = selectedCount === totalDocuments;
    clearAllBtn.disabled = selectedCount === 0;
}

function selectAllDocuments() {
    selectedDocuments = documents.map(doc => doc.id);
    updateDocumentSelections();
    updateControlsState();
    saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
    onDocumentsChange();
}

function clearAllDocuments() {
    selectedDocuments = [];
    updateDocumentSelections();
    updateControlsState();
    saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
    onDocumentsChange();
}

function updateDocumentSelections() {
    // Update checkbox states to match selectedDocuments array
    documentList.querySelectorAll('.document-checkbox').forEach(checkbox => {
        checkbox.checked = selectedDocuments.includes(checkbox.value);
    });
}

async function onDocumentsChange() {
    if (selectedDocuments.length > 0) {
        // Hide previous questions
        questionsSection.style.display = 'none';
        hideCacheIndicator();
        
        // Load questions for selected documents
        await onLoadQuestions();
    } else {
        questionsSection.style.display = 'none';
        // Clear questions popup when no documents selected
        updateQuestionsPopup([]);
    }
}

// Update questions popup in content script
async function updateQuestionsPopup(questions) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.log('No active tab found for questions popup update');
            return;
        }
        
        // Check if tab is ready for extension interaction
        if (tab.status === 'loading' || !tab.url || 
            tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
            console.log('Tab not ready for questions popup update:', tab.url);
            return;
        }
        
        // Try to send message with timeout
        try {
            await Promise.race([
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateQuestionsPopup',
                    questions: questions
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Message timeout')), 3000)
                )
            ]);
            
            console.log('Questions popup updated successfully');
        } catch (messageError) {
            if (messageError.message.includes('Could not establish connection') || 
                messageError.message.includes('Receiving end does not exist') ||
                messageError.message === 'Message timeout') {
                
                console.log('Content script not available, trying to inject...');
                
                // Try to inject content script
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    
                    // Wait a bit and try again
                    setTimeout(async () => {
                        try {
                            await chrome.tabs.sendMessage(tab.id, {
                                action: 'updateQuestionsPopup',
                                questions: questions
                            });
                            console.log('Questions popup updated after injection');
                        } catch (retryError) {
                            console.log('Still could not update questions popup after injection:', retryError.message);
                        }
                    }, 1500);
                    
                } catch (injectionError) {
                    console.log('Could not inject content script:', injectionError.message);
                }
            } else {
                console.log('Unexpected error updating questions popup:', messageError.message);
            }
        }
        
    } catch (error) {
        console.log('Error in updateQuestionsPopup:', error.message);
        // Don't throw error to prevent breaking the popup functionality
    }
}

// No longer needed - using checkbox interface