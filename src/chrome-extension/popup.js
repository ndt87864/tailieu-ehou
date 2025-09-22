// Chrome Extension Popup Script
// API Base URL - có thể thay đổi tùy theo environment
const API_BASE_URL = 'http://localhost:3001/api';

// DOM Elements
let categorySelect, documentSelect, loadQuestionsBtn, compareQuestionsBtn, questionsSection, questionsList, loading, error;

// Data storage
let categories = [];
let documents = [];
let questions = [];

// Cache keys for persistent storage
const CACHE_KEYS = {
    CATEGORIES: 'tailieu_categories',
    DOCUMENTS: 'tailieu_documents', 
    QUESTIONS: 'tailieu_questions',
    SELECTED_CATEGORY: 'tailieu_selected_category',
    SELECTED_DOCUMENT: 'tailieu_selected_document',
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
            documentSelect = document.getElementById('documentSelect');
            loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
            compareQuestionsBtn = document.getElementById('compareQuestionsBtn');
            questionsSection = document.getElementById('questionsSection');
            questionsList = document.getElementById('questionsList');
            loading = document.getElementById('loading');
            error = document.getElementById('error');
            
            // Kiểm tra tất cả elements có tồn tại không
            const elements = {
                categorySelect, documentSelect, loadQuestionsBtn, compareQuestionsBtn,
                questionsSection, questionsList, loading, error
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
    documentSelect.addEventListener('change', onDocumentChange);
    loadQuestionsBtn.addEventListener('click', onLoadQuestions);
    compareQuestionsBtn.addEventListener('click', compareQuestionsWithPage);
    
    // Debug toggle button
    const toggleDebugBtn = document.getElementById('toggleDebugBtn');
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', toggleDebugMode);
    }
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

        // Restore questions
        const cachedQuestions = await getFromCache(CACHE_KEYS.QUESTIONS);
        if (cachedQuestions && cachedQuestions.length > 0) {
            questions = cachedQuestions;
            console.log('Restored questions from cache:', questions.length);
            
            // Send to content script immediately
            sendQuestionsToContentScript(questions);
        }

        return true;
    } catch (error) {
        console.error('Error restoring from cache:', error);
        return false;
    }
}

async function autoRestoreSelections() {
    try {
        const selectedCategoryId = await getFromCache(CACHE_KEYS.SELECTED_CATEGORY);
        const selectedDocumentId = await getFromCache(CACHE_KEYS.SELECTED_DOCUMENT);
        
        console.log('Auto-restoring selections:', { selectedCategoryId, selectedDocumentId });
        
        if (selectedCategoryId && categories.length > 0) {
            // Restore category selection
            categorySelect.value = selectedCategoryId;
            
            // If we have documents, populate document select
            if (documents.length > 0) {
                populateDocumentSelect();
                
                if (selectedDocumentId) {
                    // Restore document selection
                    documentSelect.value = selectedDocumentId;
                    loadQuestionsBtn.disabled = false;
                    
                    // If we have questions, display them and enable compare
                    if (questions.length > 0) {
                        displayQuestions(questions);
                        compareQuestionsBtn.disabled = false;
                        showCacheIndicator();
                    }
                }
            } else {
                // No cached documents, load from API
                await loadDocuments(selectedCategoryId);
                if (selectedDocumentId) {
                    documentSelect.value = selectedDocumentId;
                    loadQuestionsBtn.disabled = false;
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
        if (activeTab && activeTab.id) {
            await chrome.tabs.sendMessage(activeTab.id, {
                action: 'setExtensionQuestions',
                questions: questionsData
            }).catch(err => {
                console.log('Content script not ready for questions:', err.message);
            });
        }
    } catch (error) {
        console.log('Could not send questions to content script:', error);
    }
}

async function clearCache() {
    try {
        // Clear all cache data
        await chrome.storage.local.clear();
        
        // Reset local data
        categories = [];
        documents = [];
        questions = [];
        
        // Reset UI
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        documentSelect.innerHTML = '<option value="">-- Chọn tài liệu --</option>';
        questionsList.innerHTML = '';
        
        loadQuestionsBtn.disabled = true;
        compareQuestionsBtn.disabled = true;
        
        hideCacheIndicator();
        
        // Reload categories
        await loadCategories();
        
        console.log('Cache cleared successfully');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// API Functions
async function apiRequest(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (err) {
        console.error('API Request failed:', err);
        throw err;
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
                populateDocumentSelect();
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
        
        populateDocumentSelect();
        
    } catch (err) {
        console.error('Failed to load documents:', err);
        showError('Không thể tải danh sách tài liệu.');
    } finally {
        showLoading(false);
    }
}

async function loadQuestions(documentId) {
    try {
        showLoading(true);
        hideError();
        
        console.log(`Loading questions from API${documentId ? ` for document: ${documentId}` : ''}...`);
        const endpoint = documentId ? `/questions?documentId=${documentId}` : '/questions';
        const data = await apiRequest(endpoint);
        
        questions = data.questions || [];
        console.log('Questions loaded from API:', questions.length);
        
        // Save questions to cache
        await saveToCache(CACHE_KEYS.QUESTIONS, questions);
        
        // Send to content script
        sendQuestionsToContentScript(questions);
        
        displayQuestions(questions);
        
        // Enable compare button
        compareQuestionsBtn.disabled = false;
        
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

function populateDocumentSelect() {
    // Clear existing options except first one
    documentSelect.innerHTML = '<option value="">-- Chọn tài liệu --</option>';
    
    try {
        documents.forEach(doc => {
            const option = window.document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.title;
            documentSelect.appendChild(option);
        });
        documentSelect.disabled = false;
    } catch (error) {
        console.error('Error populating document select:', error);
        // Fallback: sử dụng innerHTML
        const optionsHTML = documents.map(doc => 
            `<option value="${doc.id}">${doc.title}</option>`
        ).join('');
        documentSelect.innerHTML = '<option value="">-- Chọn tài liệu --</option>' + optionsHTML;
        documentSelect.disabled = false;
    }
}

function displayQuestions(questionsToShow) {
    if (!questionsToShow || questionsToShow.length === 0) {
        questionsList.innerHTML = '<div class="no-questions">Không có câu hỏi nào cho tài liệu này.</div>';
    } else {
        questionsList.innerHTML = questionsToShow.map(question => `
            <div class="question-item">
                <div class="question-text">❓ ${question.question || 'Câu hỏi không có nội dung'}</div>
                <div class="answer-text">💡 ${question.answer || 'Chưa có đáp án'}</div>
            </div>
        `).join('');
    }
    
    // Update questions count
    document.getElementById('questionsCount').textContent = 
        `Danh sách câu hỏi (${questionsToShow.length})`;
    
    // Show questions section
    questionsSection.style.display = 'block';
}

// Event Handlers
async function onCategoryChange() {
    const selectedCategoryId = categorySelect.value;
    
    // Save category selection to cache
    await saveToCache(CACHE_KEYS.SELECTED_CATEGORY, selectedCategoryId);
    
    // Reset document select and hide questions
    documentSelect.innerHTML = '<option value="">-- Chọn tài liệu --</option>';
    documentSelect.disabled = true;
    loadQuestionsBtn.disabled = true;
    if (compareQuestionsBtn) {
        compareQuestionsBtn.disabled = true;
    }
    questionsSection.style.display = 'none';
    
    // Clear document selection from cache when category changes
    await saveToCache(CACHE_KEYS.SELECTED_DOCUMENT, '');
    hideCacheIndicator();
    
    if (selectedCategoryId) {
        // Load documents filtered by selected category
        await loadDocuments(selectedCategoryId);
    }
}

async function onDocumentChange() {
    const selectedDocumentId = documentSelect.value;
    
    // Save document selection to cache
    await saveToCache(CACHE_KEYS.SELECTED_DOCUMENT, selectedDocumentId);
    
    if (selectedDocumentId) {
        loadQuestionsBtn.disabled = false;
        // Hide previous questions
        questionsSection.style.display = 'none';
        hideCacheIndicator();
    } else {
        loadQuestionsBtn.disabled = true;
        if (compareQuestionsBtn) {
            compareQuestionsBtn.disabled = true;
        }
        questionsSection.style.display = 'none';
    }
}

async function loadQuestions(documentId) {
    try {
        showLoading(true);
        hideError();
        
        console.log(`Loading questions for document: ${documentId}...`);
        const endpoint = documentId ? `/questions?documentId=${documentId}` : '/questions';
        const data = await apiRequest(endpoint);
        
        questions = data.questions || [];
        console.log('Questions loaded:', questions.length);
        
        displayQuestions(questions);
        
        // Enable compare button when questions are loaded
        if (compareQuestionsBtn) {
            compareQuestionsBtn.disabled = false;
        }
        
    } catch (err) {
        console.error('Failed to load questions:', err);
        showError('Không thể tải danh sách câu hỏi.');
    } finally {
        showLoading(false);
    }
}

async function onLoadQuestions() {
    const selectedDocumentId = documentSelect.value;
    if (selectedDocumentId) {
        await loadQuestions(selectedDocumentId);
        
        // After loading questions, compare with current page
        await compareQuestionsWithPage();
    } else {
        showError('Vui lòng chọn tài liệu trước.');
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
function showCacheIndicator() {
    let indicator = document.getElementById('cacheIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'cacheIndicator';
        indicator.innerHTML = `
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 8px; margin: 10px 0; font-size: 12px; color: #1976d2; display: flex; align-items: center; justify-content: space-between;">
                <span>📋 Sử dụng dữ liệu đã lưu</span>
                <button id="clearCacheBtn" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 11px; cursor: pointer; margin-left: 8px;">
                    Xóa cache
                </button>
            </div>
        `;
        
        // Insert after header
        const header = document.querySelector('.header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(indicator, header.nextSibling);
        } else {
            // Fallback: insert before selection section
            const selectionSection = document.querySelector('.selection-section');
            if (selectionSection) {
                selectionSection.parentNode.insertBefore(indicator, selectionSection);
            }
        }
        
        // Add event listener for clear cache button
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', clearCache);
        }
    }
    indicator.style.display = 'block';
}

function hideCacheIndicator() {
    const indicator = document.getElementById('cacheIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
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
        
        // Send questions to content script for comparison
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'compareQuestions',
            questions: questions
        });
        
        if (response && response.success) {
            console.log('Question comparison completed:', response);
            
            // Show comparison results
            showComparisonResults(response.matchedQuestions, response.totalPageQuestions);
        } else {
            console.log('No response from content script - may not be ready');
        }
        
    } catch (error) {
        console.error('Error comparing questions:', error);
        // Don't show error to user as this is a background feature
    }
}

function showComparisonResults(matchedQuestions, totalPageQuestions) {
    // Add comparison results section if not exists
    let resultsSection = document.getElementById('comparisonResults');
    
    if (!resultsSection) {
        resultsSection = document.createElement('div');
        resultsSection.id = 'comparisonResults';
        resultsSection.className = 'comparison-results';
        resultsSection.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        `;
        
        // Insert after questions section
        questionsSection.appendChild(resultsSection);
    }
    
    const matchCount = matchedQuestions ? matchedQuestions.length : 0;
    
    resultsSection.innerHTML = `
        <div class="comparison-header" style="
            font-weight: bold;
            color: #2e7d32;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        ">
            🔍 Kết quả so sánh trang web
        </div>
        <div class="comparison-stats" style="
            font-size: 14px;
            color: #555;
            margin-bottom: 10px;
        ">
            📊 Tìm thấy <strong>${totalPageQuestions || 0}</strong> câu hỏi trên trang<br>
            ✅ Khớp với <strong>${matchCount}</strong> câu hỏi trong database
        </div>
        ${matchCount > 0 ? `
            <div class="matched-questions" style="
                max-height: 150px;
                overflow-y: auto;
                font-size: 13px;
            ">
                <div style="font-weight: bold; margin-bottom: 5px; color: #2e7d32;">
                    🎯 Câu hỏi được highlight:
                </div>
                ${matchedQuestions.map((match, index) => `
                    <div class="matched-item" style="
                        background: white;
                        padding: 6px;
                        margin: 4px 0;
                        border-radius: 4px;
                        border-left: 3px solid #4CAF50;
                        font-size: 12px;
                    ">
                        <strong>${index + 1}.</strong> ${match.pageQuestion.substring(0, 50)}...
                        <div style="color: #666; font-style: italic; margin-top: 2px;">
                            💡 ${match.answer.substring(0, 40)}...
                        </div>
                    </div>
                `).join('')}
            </div>
            <button id="clearHighlightsBtn" style="
                background: #ff6b35;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                margin-top: 8px;
            ">
                🧹 Xóa highlights
            </button>
        ` : `
            <div style="
                color: #666;
                font-style: italic;
                font-size: 13px;
            ">
                ℹ️ Không tìm thấy câu hỏi nào khớp
            </div>
        `}
    `;
    
    // Add event listener for clear highlights button
    const clearBtn = document.getElementById('clearHighlightsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearPageHighlights);
    }
}

async function clearPageHighlights() {
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('No active tab found');
            return;
        }
        
        // Send clear message to content script
        await chrome.tabs.sendMessage(tab.id, {
            action: 'clearHighlights'
        });
        
        // Remove comparison results
        const resultsSection = document.getElementById('comparisonResults');
        if (resultsSection) {
            resultsSection.remove();
        }
        
        console.log('Page highlights cleared');
        
    } catch (error) {
        console.error('Error clearing highlights:', error);
    }
}

// Toggle debug mode in content script
async function toggleDebugMode() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'toggleDebug'
        }).catch(() => null);
        
        const toggleBtn = document.getElementById('toggleDebugBtn');
        if (response && response.debugMode !== undefined) {
            toggleBtn.textContent = response.debugMode ? '🐛 Debug OFF' : '🐛 Debug ON';
            toggleBtn.style.background = response.debugMode ? '#f44336' : '#4caf50';
        }
    } catch (error) {
        console.error('Error toggling debug mode:', error);
    }
}

// Add auto-compare when popup opens (optional)
async function autoCompareOnOpen() {
    // Only auto-compare if we have loaded questions
    if (questions && questions.length > 0) {
        await compareQuestionsWithPage();
    }
}