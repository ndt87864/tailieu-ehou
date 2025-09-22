// Chrome Extension Popup Script
// API Base URL - có thể thay đổi tùy theo environment
const API_BASE_URL = 'http://localhost:3001/api';

// DOM Elements
let categorySelect, documentSelect, loadQuestionsBtn, compareQuestionsBtn, questionsSection, questionsList, loading, error;

// Data storage
let categories = [];
let documents = [];
let questions = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing extension popup...');
        await initializeElements();
        await loadCategories();
        setupEventListeners();
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
        showLoading(true);
        hideError();
        
        console.log('Loading categories...');
        const data = await apiRequest('/categories');
        
        categories = data.categories || [];
        console.log('Categories loaded:', categories.length);
        
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
        showLoading(true);
        hideError();
        
        console.log(`Loading documents${categoryId ? ` for category: ${categoryId}` : ''}...`);
        const endpoint = categoryId ? `/documents?categoryId=${categoryId}` : '/documents';
        const data = await apiRequest(endpoint);
        
        documents = data.documents || [];
        console.log('Documents loaded:', documents.length);
        
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
        
        console.log(`Loading questions${documentId ? ` for document: ${documentId}` : ''}...`);
        const endpoint = documentId ? `/questions?documentId=${documentId}` : '/questions';
        const data = await apiRequest(endpoint);
        
        questions = data.questions || [];
        console.log('Questions loaded:', questions.length);
        
        displayQuestions(questions);
        
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
            const option = document.createElement('option');
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
        documents.forEach(document => {
            const option = document.createElement('option');
            option.value = document.id;
            option.textContent = document.title;
            documentSelect.appendChild(option);
        });
        documentSelect.disabled = false;
    } catch (error) {
        console.error('Error populating document select:', error);
        // Fallback: sử dụng innerHTML
        const optionsHTML = documents.map(document => 
            `<option value="${document.id}">${document.title}</option>`
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
    
    // Reset document select and hide questions
    documentSelect.innerHTML = '<option value="">-- Chọn tài liệu --</option>';
    documentSelect.disabled = true;
    loadQuestionsBtn.disabled = true;
    if (compareQuestionsBtn) {
        compareQuestionsBtn.disabled = true;
    }
    questionsSection.style.display = 'none';
    
    if (selectedCategoryId) {
        // Load documents filtered by selected category
        await loadDocuments(selectedCategoryId);
    }
}

function onDocumentChange() {
    const selectedDocumentId = documentSelect.value;
    
    if (selectedDocumentId) {
        loadQuestionsBtn.disabled = false;
        // Hide previous questions
        questionsSection.style.display = 'none';
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

// Add auto-compare when popup opens (optional)
async function autoCompareOnOpen() {
    // Only auto-compare if we have loaded questions
    if (questions && questions.length > 0) {
        await compareQuestionsWithPage();
    }
}