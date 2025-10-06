// popup-firestore.js - Sử dụng Firestore thay vì API tĩnh
// Không dùng ES6 imports vì extension không support

// DOM Elements
let categorySelect, documentSearchInput, documentList, selectAllBtn, clearAllBtn, selectedCountSpan, 
    questionsSection, questionsList, loading, error, clearCacheBtn, cacheSection, highlightAnswersCheckbox;

// Data storage
let categories = [];
let documents = [];
let selectedDocuments = [];
let filteredDocuments = [];
let questions = [];
let highlightAnswersEnabled = true;

// Cache keys for persistent storage
const CACHE_KEYS = {
    CATEGORIES: 'tailieu_categories',
    DOCUMENTS: 'tailieu_documents', 
    QUESTIONS: 'tailieu_questions',
    SELECTED_CATEGORY: 'tailieu_selected_category',
    SELECTED_DOCUMENTS: 'tailieu_selected_documents',
    LAST_SESSION: 'tailieu_last_session',
    HIGHLIGHT_ANSWERS: 'tailieu_highlight_answers'
};

// Initialize Firebase khi DOM loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Initializing extension popup with Firestore...');
    
    // Wait for Firebase to be ready
    await waitForFirebase();
    
    // Initialize Firebase app (sử dụng cùng project với web)
    if (!firebase.apps || !firebase.apps.find(app => app.name === 'extendsApp')) {
      const config = {
        apiKey: "AIzaSyDj_FhdiYG8sgrqzSBlf9SrGF8FQR4fCI4",
        authDomain: "tailieu-89ca9.firebaseapp.com",
        projectId: "tailieu-89ca9",
        storageBucket: "tailieu-89ca9.firebasestorage.app",
        messagingSenderId: "739034600322",
        appId: "1:739034600322:web:771c49578c29c8cabe359b",
        measurementId: "G-4KTZWXH5KE"
      };
      firebase.initializeApp(config, "extendsApp");
      console.log('✅ Firebase initialized with project:', config.projectId);
    }
    
    await initializeElements();
    setupEventListeners();
    
    // Try to restore from cache first
    await restoreFromCache();
    
    // Load categories (from Firestore or cache)
    await loadCategories();
    
    // Auto-restore selections if available
    await autoRestoreSelections();
    
    console.log('✅ Extension popup initialized successfully with Firestore');
  } catch (error) {
    console.error('❌ Failed to initialize extension popup:', error);
    showError('Lỗi khởi tạo extension: ' + error.message);
  }
});

// Wait for Firebase to be loaded from CDN
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    if (typeof firebase !== 'undefined') {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof firebase !== 'undefined') {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('Firebase SDK không load được từ CDN'));
      }
    }, 100);
  });
}

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
      highlightAnswersCheckbox = document.getElementById('highlightAnswers');
      
      // Kiểm tra elements
      const elements = {
        categorySelect, documentSearchInput, documentList, selectAllBtn,
        clearAllBtn, selectedCountSpan, questionsSection, questionsList, 
        loading, error, clearCacheBtn, cacheSection, highlightAnswersCheckbox
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
  documentSearchInput.addEventListener('input', onDocumentSearch);
  selectAllBtn.addEventListener('click', selectAllDocuments);
  clearAllBtn.addEventListener('click', clearAllDocuments);
  clearCacheBtn.addEventListener('click', clearAllCache);
  highlightAnswersCheckbox.addEventListener('change', onHighlightAnswersChange);
}

// Cache Management Functions
async function saveToCache(key, data) {
  try {
    await chrome.storage.local.set({ [key]: data });
    console.log(`Saved to cache: ${key}`);
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
    
    const cachedCategories = await getFromCache(CACHE_KEYS.CATEGORIES);
    if (cachedCategories && cachedCategories.length > 0) {
      categories = cachedCategories;
      console.log('Restored categories from cache:', categories.length);
      // ⚠️ Note: Will reload fresh data from Firestore to ensure up-to-date
    }

    const cachedDocuments = await getFromCache(CACHE_KEYS.DOCUMENTS);
    if (cachedDocuments && cachedDocuments.length > 0) {
      documents = cachedDocuments;
      console.log('Restored documents from cache:', documents.length);
    }

    const cachedQuestions = await getFromCache(CACHE_KEYS.QUESTIONS);
    const selectedDocumentIds = await getFromCache(CACHE_KEYS.SELECTED_DOCUMENTS);
    
    if (cachedQuestions && cachedQuestions.length > 0 && selectedDocumentIds && selectedDocumentIds.length > 0) {
      questions = cachedQuestions;
      hasUsefulCache = true;
      console.log('Restored questions from cache:', questions.length);
      sendQuestionsToContentScript(questions);
    }

    const highlightAnswersSetting = await getFromCache(CACHE_KEYS.HIGHLIGHT_ANSWERS);
    if (highlightAnswersSetting !== null && highlightAnswersCheckbox) {
      highlightAnswersEnabled = highlightAnswersSetting;
      highlightAnswersCheckbox.checked = highlightAnswersEnabled;
      console.log('Answer highlighting setting restored:', highlightAnswersEnabled);
    }

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
      categorySelect.value = selectedCategoryId;
      
      if (documents.length > 0) {
        populateDocumentList();
        
        if (selectedDocumentIds && selectedDocumentIds.length > 0) {
          selectedDocuments = selectedDocumentIds;
          updateDocumentSelections();
          
          if (questions.length > 0) {
            showQuestionsStatus(questions.length);
            setTimeout(() => compareQuestionsWithPage(), 1000);
          }
        }
      } else {
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

// Firestore Functions
async function loadCategories(forceReload = false) {
  try {
    if (categories.length > 0 && !forceReload) {
      console.log('Using cached categories:', categories.length);
      populateCategorySelect();
      return;
    }
    
    showLoading(true);
    hideError();
    
    console.log('📂 Loading categories from Firestore...');
    categories = await getAllCategories();
    console.log('✅ Categories loaded from Firestore:', categories.length);
    
    await saveToCache(CACHE_KEYS.CATEGORIES, categories);
    populateCategorySelect();
    
  } catch (err) {
    console.error('❌ Failed to load categories:', err);
    showError('Không thể tải danh sách danh mục từ Firestore: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function loadDocuments(categoryId) {
  try {
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
    
    console.log(`📄 Loading documents from Firestore for category: ${categoryId}...`);
    documents = await getDocumentsByCategory(categoryId);
    console.log('✅ Documents loaded from Firestore:', documents.length);
    
    const allCachedDocuments = await getFromCache(CACHE_KEYS.DOCUMENTS) || [];
    const mergedDocuments = [...allCachedDocuments];
    
    documents.forEach(doc => {
      if (!mergedDocuments.find(cached => cached.id === doc.id)) {
        mergedDocuments.push(doc);
      }
    });
    
    await saveToCache(CACHE_KEYS.DOCUMENTS, mergedDocuments);
    populateDocumentList();
    
  } catch (err) {
    console.error('❌ Failed to load documents:', err);
    showError('Không thể tải danh sách tài liệu từ Firestore: ' + err.message);
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
    
    console.log(`❓ Loading questions from Firestore for documents: ${documentIds.join(', ')}...`);
    
    questions = await getQuestionsByDocuments(documentIds);
    console.log('✅ Questions loaded from Firestore:', questions.length);
    
    showQuestionsStatus(questions.length);
    
    if (questions.length > 0) {
      await saveToCache(CACHE_KEYS.QUESTIONS, questions);
      sendQuestionsToContentScript(questions);
    } else {
      console.log('No questions found for selected documents');
      showQuestionsStatus(0);
    }
    
  } catch (err) {
    console.error('❌ Failed to load questions:', err);
    showError('Không thể tải danh sách câu hỏi từ Firestore: ' + err.message);
  } finally {
    showLoading(false);
  }
}

// Event Handlers
async function onCategoryChange() {
  const categoryId = categorySelect.value;
  console.log('Category changed:', categoryId);
  
  if (categoryId) {
    await saveToCache(CACHE_KEYS.SELECTED_CATEGORY, categoryId);
    await loadDocuments(categoryId);
  } else {
    documents = [];
    populateDocumentList();
  }
  
  selectedDocuments = [];
  updateSelectedCount();
  updateControlsState();
  questionsSection.style.display = 'none';
}

function onDocumentSearch() {
  const searchTerm = documentSearchInput.value.toLowerCase().trim();
  
  if (!searchTerm) {
    filteredDocuments = [];
    populateDocumentList();
    return;
  }
  
  filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm)
  );
  
  populateDocumentList();
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
  
  saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
  onDocumentsChange();
}

async function onDocumentsChange() {
  if (selectedDocuments.length > 0) {
    await loadQuestions(selectedDocuments);
  } else {
    questions = [];
    questionsSection.style.display = 'none';
  }
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
  
  saveToCache(CACHE_KEYS.SELECTED_DOCUMENTS, selectedDocuments);
  questionsSection.style.display = 'none';
}

function onHighlightAnswersChange() {
  highlightAnswersEnabled = highlightAnswersCheckbox.checked;
  saveToCache(CACHE_KEYS.HIGHLIGHT_ANSWERS, highlightAnswersEnabled);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'setAnswerHighlighting',
        enabled: highlightAnswersEnabled
      }).catch(() => {});
    }
  });
}

// UI Functions
function populateCategorySelect() {
  categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
  
  console.log('📋 Populating categories, total:', categories.length);
  categories.forEach(category => {
    console.log(`  - ${category.stt || '?'}. ${category.title} (${category.id})`);
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.title;
    categorySelect.appendChild(option);
  });
}

function populateDocumentList() {
  documentList.innerHTML = '';
  documentList.style.display = 'block';
  
  const documentsToShow = filteredDocuments.length > 0 ? filteredDocuments : documents;
  
  if (documentsToShow.length === 0) {
    documentList.innerHTML = '<div class="no-documents">Không có tài liệu nào</div>';
    documentSearchInput.disabled = true;
    return;
  }
  
  documentSearchInput.disabled = false;
  
  documentsToShow.forEach(doc => {
    const documentItem = document.createElement('div');
    documentItem.className = 'document-item';
    documentItem.innerHTML = `
      <input type="checkbox" id="doc-${doc.id}" class="document-checkbox" value="${doc.id}" ${selectedDocuments.includes(doc.id) ? 'checked' : ''}>
      <label for="doc-${doc.id}" class="document-label">${doc.title}</label>
    `;
    
    const checkbox = documentItem.querySelector('.document-checkbox');
    checkbox.addEventListener('change', onDocumentCheckboxChange);
    
    documentList.appendChild(documentItem);
  });
  
  updateControlsState();
  updateSelectedCount();
}

function updateDocumentSelections() {
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

function showQuestionsStatus(count) {
  if (count === 0) {
    questionsList.innerHTML = '<div class="no-questions">Không có câu hỏi nào cho tài liệu này.</div>';
    document.getElementById('questionsCount').textContent = 'Không có câu hỏi';
  } else {
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
        ">So sánh ngay</button>
        <button id="closeBannerBtn" style="
          background: none;
          color: white;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 5px;
          margin-left: 5px;
        ">✕</button>
      </div>
      <div style="padding: 15px; text-align: center; color: #666; font-size: 13px;">
        Extension sẽ tự động tìm và highlight câu hỏi trên trang web
      </div>
    `;
    
    const compareBtn = document.getElementById('compareNowBtn');
    const closeBannerBtn = document.getElementById('closeBannerBtn');
    const notificationBanner = document.getElementById('notificationBanner');
    
    if (compareBtn) {
      compareBtn.addEventListener('click', compareQuestionsWithPage);
      compareBtn.addEventListener('mouseenter', () => compareBtn.style.background = '#45A049');
      compareBtn.addEventListener('mouseleave', () => compareBtn.style.background = '#4CAF50');
    }
    
    if (closeBannerBtn && notificationBanner) {
      closeBannerBtn.addEventListener('click', () => notificationBanner.style.display = 'none');
    }
    
    document.getElementById('questionsCount').textContent = `${count} câu hỏi sẵn sàng`;
  }
  
  questionsSection.style.display = 'block';
  
  if (count > 0) {
    saveToCache(CACHE_KEYS.QUESTIONS, questions);
    showCacheSection();
  }
}

async function compareQuestionsWithPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'compareQuestions'
    });
    
    console.log('✅ Sent compare command to content script');
  } catch (error) {
    console.log('Could not compare questions:', error.message);
  }
}

async function sendQuestionsToContentScript(questionsData) {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) return;
    
    if (activeTab.status === 'loading' || !activeTab.url || 
        activeTab.url.startsWith('chrome://') || 
        activeTab.url.startsWith('chrome-extension://') ||
        activeTab.url.startsWith('edge://') ||
        activeTab.url.startsWith('about:')) {
      return;
    }
    
    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        action: 'setExtensionQuestions',
        questions: questionsData
      });
      
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'setAnswerHighlighting',
        enabled: highlightAnswersEnabled
      }).catch(() => {});
      
      console.log('Questions sent to content script successfully');
    } catch (messageError) {
      console.log('Content script not ready for questions');
    }
    
  } catch (error) {
    console.log('Error sending questions to content script:', error.message);
  }
}

async function clearAllCache() {
  try {
    showLoading(true);
    
    await chrome.storage.local.clear();
    
    categories = [];
    documents = [];
    selectedDocuments = [];
    filteredDocuments = [];
    questions = [];
    
    resetUI();
    hideCacheSection();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'clearCache' }).catch(() => {});
      chrome.tabs.sendMessage(tab.id, { action: 'updateQuestionsPopup', questions: [] }).catch(() => {});
    }
    
    // Force reload categories from Firestore
    await loadCategories(true);
    
    showSuccessMessage('✅ Cache đã được xóa thành công!');
    
  } catch (error) {
    console.error('Error clearing all cache:', error);
    showError('Lỗi khi xóa cache: ' + error.message);
  } finally {
    showLoading(false);
  }
}

function resetUI() {
  categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
  categorySelect.value = '';
  documentList.innerHTML = '<div class="no-documents">Chưa có tài liệu nào</div>';
  documentSearchInput.value = '';
  documentSearchInput.disabled = true;
  selectAllBtn.disabled = true;
  clearAllBtn.disabled = true;
  selectedCountSpan.textContent = '0 được chọn';
  questionsSection.style.display = 'none';
  hideError();
}

// UI Helper Functions
function showLoading(show) {
  if (loading) {
    loading.style.display = show ? 'block' : 'none';
  }
}

function hideError() {
  if (error) {
    error.style.display = 'none';
    error.textContent = '';
  }
}

function showError(message) {
  if (error) {
    error.textContent = message;
    error.style.display = 'block';
  }
}

function showSuccessMessage(message) {
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
  `;
  successDiv.textContent = message;
  
  const header = document.querySelector('.header');
  header.insertAdjacentElement('afterend', successDiv);
  
  setTimeout(() => {
    if (successDiv && successDiv.parentNode) {
      successDiv.remove();
    }
  }, 5000);
}

function showCacheSection() {
  if (cacheSection) {
    cacheSection.style.display = 'flex';
  }
}

function hideCacheSection() {
  if (cacheSection) {
    cacheSection.style.display = 'none';
  }
}
