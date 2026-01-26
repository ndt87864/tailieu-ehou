// popup-firestore.js - Sử dụng Firestore thay vì API tĩnh
// Không dùng ES6 imports vì extension không support

// DOM Elements
let categorySelect, documentSearchInput, documentList, selectAllBtn, clearAllBtn, selectedCountSpan, 
    questionsSection, questionsList, loading, error, clearCacheBtn, cacheSection, highlightAnswersCheckbox;
let autoSelectCheckbox;

// Data storage
let categories = [];
let documents = [];
let selectedDocuments = [];
let filteredDocuments = [];
let questions = [];
let highlightAnswersEnabled = true;
let autoSelectEnabled = false;

// Cache keys for persistent storage
const CACHE_KEYS = {
    CATEGORIES: 'tailieu_categories',
    DOCUMENTS: 'tailieu_documents', 
    QUESTIONS: 'tailieu_questions',
    SELECTED_CATEGORY: 'tailieu_selected_category',
    SELECTED_DOCUMENTS: 'tailieu_selected_documents',
    LAST_SESSION: 'tailieu_last_session',
    HIGHLIGHT_ANSWERS: 'tailieu_highlight_answers'
    ,AUTO_SELECT: 'tailieu_auto_select'
};

// Helper: Check if tab can receive messages (valid URL, not chrome:// etc)
function isTabMessageable(tab) {
    if (!tab || !tab.id || tab.id === chrome.tabs.TAB_ID_NONE) return false;
    if (!tab.url) return false;
    const url = tab.url;
    // Skip internal browser pages
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('moz-extension://') ||
        url.startsWith('devtools://')) {
        return false;
    }
    return true;
}

// Helper: Safely send message to active tab's content script
async function safeSendToContentScript(message) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!isTabMessageable(tab)) {
            console.log('Tab not messageable, skipping message:', message.action);
            return { success: false, reason: 'tab_not_messageable' };
        }
        
        // Use Promise with timeout to avoid hanging
        return await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                resolve({ success: false, reason: 'timeout' });
            }, 2000);
            
            chrome.tabs.sendMessage(tab.id, message, (response) => {
                clearTimeout(timeoutId);
                if (chrome.runtime.lastError) {
                    // Silently handle - content script not ready
                    console.log('Message not delivered:', chrome.runtime.lastError.message);
                    resolve({ success: false, reason: chrome.runtime.lastError.message });
                } else {
                    resolve({ success: true, response });
                }
            });
        });
    } catch (error) {
        console.log('safeSendToContentScript error:', error.message);
        return { success: false, reason: error.message };
    }
}

// Initialize Firebase khi DOM loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log(' Initializing extension popup with Firestore...');
    
    // Wait for Firebase to be ready
    await waitForFirebase();
    
    // Initialize Firebase app using config from firebase.extends.js
    if (!firebase.apps || !firebase.apps.find(app => app.name === 'extendsApp')) {
      // Use config from firebase.extends.js (loaded before this script)
      const config = window.extendsFirebaseConfig || extendsFirebaseConfig;
      if (!config || !config.projectId) {
        throw new Error('Firebase config not found. Make sure firebase.extends.js is loaded first.');
      }
      firebase.initializeApp(config, "extendsApp");
      console.log('Firebase initialized with project:', config.projectId);
    }
    
    await initializeElements();
    setupEventListeners();
    
    // Try to restore from cache first
    const hasCache = await restoreFromCache();
    
    // Load categories (luôn load để đảm bảo có categories list)
    await loadCategories();
    
    // Auto-restore selections if available (chỉ khi có cache)
    if (hasCache) {
      await autoRestoreSelections();
    }
    
  } catch (error) {
    console.error('Failed to initialize extension popup:', error);
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
      // New auto-select toggle element
      autoSelectCheckbox = document.getElementById('autoSelectToggle');
      
      // Kiểm tra elements
      const elements = {
        categorySelect, documentSearchInput, documentList, selectAllBtn,
        clearAllBtn, selectedCountSpan, questionsSection, questionsList, 
        loading, error, clearCacheBtn, cacheSection, highlightAnswersCheckbox
        ,autoSelectCheckbox
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

// Small SVG icon helper used by popup UI
function svgIcon(name, size = 16) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.style.verticalAlign = 'middle';
  svg.style.display = 'inline-block';

  const path = document.createElementNS(ns, 'path');
  switch (name) {
    case 'upload':
      path.setAttribute('d', 'M5 20h14v-2H5v2zm7-18L5.33 9h3.67v6h6V9h3.67L12 2z');
      break;
    case 'trash':
      path.setAttribute('d', 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z');
      break;
    case 'close':
      path.setAttribute('d', 'M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.29 10.59 10.6 16.88 4.29z');
      break;
    case 'check':
      path.setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41z');
      break;
    default:
      path.setAttribute('d', '');
  }

  svg.appendChild(path);
  return svg;
}

function setupEventListeners() {
  categorySelect.addEventListener('change', onCategoryChange);
  documentSearchInput.addEventListener('input', onDocumentSearch);
  selectAllBtn.addEventListener('click', selectAllDocuments);
  clearAllBtn.addEventListener('click', clearAllDocuments);
  clearCacheBtn.addEventListener('click', clearAllCache);
  highlightAnswersCheckbox.addEventListener('change', onHighlightAnswersChange);
  if (autoSelectCheckbox) autoSelectCheckbox.addEventListener('change', onAutoSelectChange);
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
      //  Note: Will reload fresh data from Firestore to ensure up-to-date
    }

    // KHÔNG restore documents - sẽ load khi user chọn category
    // documents = []; // Keep empty
    
    // Restore questions và selected documents (nếu có session trước đó)
    const cachedQuestions = await getFromCache(CACHE_KEYS.QUESTIONS);
    const selectedDocumentIds = await getFromCache(CACHE_KEYS.SELECTED_DOCUMENTS);
    
    if (cachedQuestions && cachedQuestions.length > 0 && selectedDocumentIds && selectedDocumentIds.length > 0) {
      questions = cachedQuestions;
      selectedDocuments = selectedDocumentIds;
      hasUsefulCache = true;
      console.log(' Restored session:', {
        questions: questions.length,
        selectedDocuments: selectedDocuments.length
      });
      sendQuestionsToContentScript(questions);
    }

    const highlightAnswersSetting = await getFromCache(CACHE_KEYS.HIGHLIGHT_ANSWERS);
    if (highlightAnswersSetting !== null && highlightAnswersCheckbox) {
      highlightAnswersEnabled = highlightAnswersSetting;
      highlightAnswersCheckbox.checked = highlightAnswersEnabled;
      console.log('Answer highlighting setting restored:', highlightAnswersEnabled);
    }

    // Restore auto-select setting
    // Restore or set default for auto-select (default: OFF)
    const autoSelectSetting = await getFromCache(CACHE_KEYS.AUTO_SELECT);
    if (autoSelectSetting !== null && typeof autoSelectSetting !== 'undefined') {
      autoSelectEnabled = !!autoSelectSetting;
      if (autoSelectCheckbox) autoSelectCheckbox.checked = autoSelectEnabled;
      console.log('Auto-select setting restored:', autoSelectEnabled);
    } else {
      // Default to OFF and persist that default so content script can read it
      autoSelectEnabled = false;
      if (autoSelectCheckbox) autoSelectCheckbox.checked = false;
      try { await saveToCache(CACHE_KEYS.AUTO_SELECT, autoSelectEnabled); } catch (e) {}
      console.log('Auto-select defaulted to OFF and saved to cache');
    }

    // Always notify content script of current auto-select state
    safeSendToContentScript({ action: 'setAutoSelect', enabled: !!autoSelectEnabled });

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
    console.log(' Categories loaded from Firestore:', categories.length);
    
    await saveToCache(CACHE_KEYS.CATEGORIES, categories);
    populateCategorySelect();
    
  } catch (err) {
    console.error('Failed to load categories:', err);
    showError('Không thể tải danh sách danh mục từ Firestore: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function loadDocuments(categoryId) {
  try {
    showLoading(true);
    hideError();
    
    console.log(`📄 Loading documents from Firestore for category: ${categoryId}...`);
    
    // Luôn load fresh data từ Firestore khi user chọn category
    documents = await getDocumentsByCategory(categoryId);
    console.log(' Documents loaded from Firestore:', documents.length);
    
    // Reset selected documents khi đổi category
    selectedDocuments = [];
    filteredDocuments = [];
    
    populateDocumentList();
    updateSelectedCount();
    updateControlsState();
    
  } catch (err) {
    console.error('Failed to load documents:', err);
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
      console.log(' No documents selected');
      showQuestionsStatus(0);
      showLoading(false);
      return;
    }
    
    console.log(`❓ Loading questions from Firestore for documents: ${documentIds.join(', ')}...`);
    
    questions = await getQuestionsByDocuments(documentIds);
    console.log(' Questions loaded from Firestore:', questions.length);
    
    showQuestionsStatus(questions.length);
    
    if (questions.length > 0) {
      await saveToCache(CACHE_KEYS.QUESTIONS, questions);
      sendQuestionsToContentScript(questions);
    } else {
      console.log('No questions found for selected documents');
      showQuestionsStatus(0);
    }
    
  } catch (err) {
    console.error('Failed to load questions:', err);
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
  
  safeSendToContentScript({
    action: 'setAnswerHighlighting',
    enabled: highlightAnswersEnabled
  });
}

function onAutoSelectChange() {
  try {
    autoSelectEnabled = !!autoSelectCheckbox.checked;
    saveToCache(CACHE_KEYS.AUTO_SELECT, autoSelectEnabled);

    safeSendToContentScript({
      action: 'setAutoSelect',
      enabled: autoSelectEnabled
    });
  } catch (e) {
    console.error('onAutoSelectChange error', e);
  }
}

// UI Functions
function populateCategorySelect() {
  categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
  
  console.log(' Populating categories, total:', categories.length);
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
        "></button>
      </div>
      <div style="padding: 15px; text-align: center; color: #666; font-size: 13px;">
        Extension sẽ tự động tìm và highlight câu hỏi trên trang web
      </div>
    `;
    
    const compareBtn = document.getElementById('compareNowBtn');
    const closeBannerBtn = document.getElementById('closeBannerBtn');
    const notificationBanner = document.getElementById('notificationBanner');
    
    if (compareBtn) {
      // Disable the button until the content page is fully loaded to avoid premature clicks
      compareBtn.disabled = true;
      compareBtn.title = 'Chờ trang web tải xong để so sánh…';

      let _tries = 0;
      const _maxTries = 30; // ~15s max
      const _checkLoaded = async () => {
        const res = await safeSendToContentScript({ action: 'isPageLoaded' });
        if (res.success && res.response && res.response.loaded) {
          compareBtn.disabled = false;
          compareBtn.title = '';
          compareBtn.addEventListener('mouseenter', () => compareBtn.style.background = '#45A049');
          compareBtn.addEventListener('mouseleave', () => compareBtn.style.background = '#4CAF50');
        } else {
          _tries++;
          if (_tries < _maxTries) setTimeout(_checkLoaded, 500);
          else compareBtn.title = 'Trang chưa sẵn sàng để so sánh';
        }
      };
      _checkLoaded();

      compareBtn.addEventListener('click', compareQuestionsWithPage);
    }
    
    if (closeBannerBtn && notificationBanner) {
      closeBannerBtn.addEventListener('click', () => notificationBanner.style.display = 'none');
      // Insert close svg into closeBannerBtn
      try {
        closeBannerBtn.appendChild(svgIcon('close', 14));
      } catch (e) {}
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
  const result = await safeSendToContentScript({
    action: 'compareQuestions'
  });
  
  const compareBtn = document.getElementById('compareNowBtn');

  if (result.success) {
    console.log(' Sent compare command to content script');
    const matched = result.response && (result.response.matchedQuestions || result.response.matched) ? (result.response.matchedQuestions || result.response.matched) : 0;

    if (compareBtn) {
      compareBtn.textContent = `Làm lại (${matched})`;
      compareBtn.dataset.state = 'repeat';
      compareBtn.disabled = false;

      // Rewire click to clear highlights and re-run
      compareBtn.removeEventListener('click', compareQuestionsWithPage);
      compareBtn.addEventListener('click', async function _repeatClickHandler(e) {
        const originalText = compareBtn.textContent;
        compareBtn.disabled = true;
        compareBtn.textContent = 'Đang xử lý...';

        // Ask content script to clear highlights
        const clearRes = await safeSendToContentScript({ action: 'clearHighlights' });
        if (!clearRes.success) {
          console.warn('Failed to clear highlights before re-run:', clearRes.reason);
          compareBtn.disabled = false;
          compareBtn.textContent = originalText;
          return;
        }

        // Wait a tick for DOM cleanup then re-run the compare
        await new Promise(r => setTimeout(r, 150));
        await compareQuestionsWithPage();
      });
    }
  } else {
    console.log('Could not compare questions:', result.reason);
  }
}

async function sendQuestionsToContentScript(questionsData) {
  // Send questions
  const result = await safeSendToContentScript({
    action: 'setExtensionQuestions',
    questions: questionsData
  });
  
  if (result.success) {
    console.log('Questions sent to content script successfully');
    
    // Also send highlight and auto-select settings
    await safeSendToContentScript({
      action: 'setAnswerHighlighting',
      enabled: highlightAnswersEnabled
    });
    
    await safeSendToContentScript({
      action: 'setAutoSelect',
      enabled: !!(autoSelectCheckbox ? autoSelectCheckbox.checked : autoSelectEnabled)
    });
  } else {
    console.log('Content script not ready for questions:', result.reason);
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
    
    // Notify content script to clear its cache
    await safeSendToContentScript({ action: 'clearCache' });
    await safeSendToContentScript({ action: 'updateQuestionsPopup', questions: [] });
    
    // Force reload categories from Firestore
    await loadCategories(true);
    
    showSuccessMessage(' Cache đã được xóa thành công!');
    
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

// ---------------------- Scanner pending sync ----------------------
// Show a small UI in the popup header when there are scanned questions saved by the content script
async function checkScannerPending() {
  try {
    const result = await chrome.storage.local.get('tailieu_scanner_pending');
    const pending = result.tailieu_scanner_pending || [];
    renderScannerPendingUI(pending);
  } catch (e) {
    console.error('checkScannerPending error', e);
  }
}

function renderScannerPendingUI(pending) {
  // Remove existing scanner UI if present
  const existing = document.getElementById('scannerPendingContainer');
  if (existing) existing.remove();

  if (!pending || pending.length === 0) return;

  const container = document.createElement('div');
  container.id = 'scannerPendingContainer';
  container.style.cssText = 'display:flex; gap:8px; align-items:center; margin:10px 0;';

  const info = document.createElement('div');
  info.textContent = `Có ${pending.length} câu hỏi chờ đồng bộ`;
  info.style.cssText = 'font-size:13px; color:#333;';

  const syncBtn = document.createElement('button');
  syncBtn.textContent = '';
  syncBtn.appendChild(svgIcon('upload', 14));
  const syncText = document.createElement('span');
  syncText.style.marginLeft = '8px';
  syncText.textContent = 'Đồng bộ lên DB';
  syncBtn.appendChild(syncText);
  syncBtn.style.cssText = `
    background: #1976D2; color: white; border: none; padding: 8px 12px; border-radius:6px; cursor:pointer;
  `;
  syncBtn.onclick = () => syncPendingScannerToDB(syncBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '';
  clearBtn.appendChild(svgIcon('trash', 14));
  const clearText = document.createElement('span');
  clearText.style.marginLeft = '8px';
  clearText.textContent = 'Xóa tạm';
  clearBtn.appendChild(clearText);
  clearBtn.style.cssText = `
    background: #f44336; color: white; border: none; padding: 8px 12px; border-radius:6px; cursor:pointer;
  `;
  clearBtn.onclick = async () => {
    await chrome.storage.local.remove('tailieu_scanner_pending');
    renderScannerPendingUI([]);
    showSuccessMessage('Đã xóa tạm các câu hỏi quét');
  };

  container.appendChild(info);
  container.appendChild(syncBtn);
  container.appendChild(clearBtn);

  const header = document.querySelector('.header');
  if (header) {
    header.insertAdjacentElement('afterend', container);
  }
}

async function syncPendingScannerToDB(button) {
  try {
    button.disabled = true;

    // Ensure Firebase is ready
    try {
      await waitForFirebase();
    } catch (e) {
      console.error('Firebase not ready for sync:', e);
      showError('Firebase chưa sẵn sàng. Vui lòng thử lại.');
      button.disabled = false;
      return;
    }

    const res = await chrome.storage.local.get('tailieu_scanner_pending');
    const pending = res.tailieu_scanner_pending || [];

    if (!pending || pending.length === 0) {
      showSuccessMessage('Không có câu hỏi để đồng bộ');
      button.disabled = false;
      return;
    }

    showLoading(true);

    // Determine target documentId robustly
    let targetDocumentId = selectedDocuments && selectedDocuments.length > 0 ? selectedDocuments[0] : null;

    // If no selectedDocuments and documents list empty, try to load categories/documents to pick a default
    if (!targetDocumentId) {
      if (!documents || documents.length === 0) {
        // Load categories and documents so we can pick a sensible target
        try {
          await loadCategories();
          if (categories && categories.length > 0) {
            // Attempt to load documents for the previously selected category or first category
            const selectedCategoryId = categorySelect ? categorySelect.value : null;
            const catToLoad = selectedCategoryId || (categories[0] && categories[0].id);
            if (catToLoad) {
              await loadDocuments(catToLoad);
            }
          }
        } catch (e) {
          console.warn('Could not load categories/documents automatically:', e);
        }
      }

      if (documents && documents.length > 0) {
        targetDocumentId = documents[0].id;
      }
    }

    if (!targetDocumentId) {
      showError('Vui lòng chọn ít nhất 1 tài liệu trên popup trước khi đồng bộ.');
      button.disabled = false;
      showLoading(false);
      return;
    }

    // Confirm chosen document (for debugging/logging)
    let targetDocTitle = 'unknown';
    try {
      const docObj = documents.find(d => d.id === targetDocumentId);
      if (docObj) targetDocTitle = docObj.title || targetDocTitle;
    } catch (e) {}

    console.log(`Syncing ${pending.length} scanned questions into documentId=${targetDocumentId} title="${targetDocTitle}"`);

    // Upload each pending question to Firestore using addQuestion(questionData)
    const addedIds = [];
    let failCount = 0;

    for (const item of pending) {
      try {
        const questionData = {
          question: (item.question || '').toString(),
          answer: item.answer || null,
          documentId: targetDocumentId
        };

        // addQuestion returns the new ID
        const newId = await addQuestion(questionData);
        addedIds.push(newId);
        console.log('Added question id:', newId, 'data:', questionData);
      } catch (e) {
        console.error('Failed to add question from scanner:', e);
        failCount++;
      }
    }

    // Clear pending storage on success (or partial success)
    await chrome.storage.local.remove('tailieu_scanner_pending');
    renderScannerPendingUI([]);

    showSuccessMessage(`Đồng bộ xong: ${addedIds.length} thành công, ${failCount} lỗi`);

    // Extra verification: log current question count for the target document
    try {
      const currentQs = await getQuestionsByDocument(targetDocumentId);
      console.log(`Document ${targetDocumentId} now has ${currentQs.length} questions (sample 5):`, currentQs.slice(0,5));
    } catch (e) {
      console.warn('Could not fetch questions for verification:', e);
    }

  } catch (e) {
    console.error('syncPendingScannerToDB error', e);
    showError('Lỗi khi đồng bộ: ' + (e.message || e));
  } finally {
    if (button) button.disabled = false;
    showLoading(false);
  }
}

// Listen for message from content script that scanner saved items
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'tailieu_scanner_saved_local') {
    checkScannerPending();
    sendResponse({ success: true });
  }
  
  // Handle direct save-now requests from content script
  if (request && request.action === 'tailieu_scanner_save_now') {
    (async () => {
      try {
        const items = request.items || [];
        if (!items || items.length === 0) {
          sendResponse({ success: false, message: 'No items' });
          return;
        }

        // Ensure Firebase is initialized
        await waitForFirebase();

        // Determine a target documentId: prefer selectedDocuments, otherwise use first document loaded
        let targetDocumentId = selectedDocuments && selectedDocuments.length > 0 ? selectedDocuments[0] : null;
        if (!targetDocumentId && documents && documents.length > 0) targetDocumentId = documents[0].id;
        if (!targetDocumentId) {
          // Try to load documents for first category
          if (categories && categories.length > 0) {
            await loadDocuments(categories[0].id);
            if (documents && documents.length > 0) targetDocumentId = documents[0].id;
          }
        }

        if (!targetDocumentId) {
          sendResponse({ success: false, message: 'No target document selected' });
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const it of items) {
          try {
            const q = { question: it.question || '', answer: it.answer || null, documentId: targetDocumentId };
            await addQuestion(q);
            successCount++;
          } catch (e) {
            console.error('Error adding scanner question to Firestore', e);
            failCount++;
          }
        }

        sendResponse({ success: true, successCount, failCount });
      } catch (e) {
        console.error('tailieu_scanner_save_now handler error', e);
        sendResponse({ success: false, message: e.message || String(e) });
      }
    })();

    // Keep the message channel open for async response
    return true;
  }
});

// On popup open, check pending scanner items
document.addEventListener('DOMContentLoaded', () => {
  // small delay to ensure DOM header is available
  setTimeout(() => checkScannerPending(), 300);
});

