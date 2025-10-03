import React, { useState, useRef, useEffect } from "react";

const FilterQuestionModal = ({
  showFilterModal,
  isDarkMode,
  filterCategory,
  setFilterCategory,
  filterDocument,
  setFilterDocument,
  allCategories,
  categoryDocuments,
  handleApplyFilter,
  setShowFilterModal,
}) => {
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState("");
  const categoryInputRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  
  const [documentSearch, setDocumentSearch] = useState("");
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState("");
  const documentInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update filtered categories when search changes
  useEffect(() => {
    if (categorySearch.trim()) {
      const filtered = allCategories.filter((category) =>
        category.title.toLowerCase().includes(categorySearch.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(allCategories);
    }
  }, [allCategories, categorySearch]);

  // Update filtered documents when category or search changes
  useEffect(() => {
    // Get documents from all selected categories
    let allDocuments = [];
    selectedCategories.forEach(categoryId => {
      if (categoryDocuments[categoryId]) {
        allDocuments = [...allDocuments, ...categoryDocuments[categoryId]];
      }
    });
    
    if (documentSearch.trim()) {
      const filtered = allDocuments.filter((doc) =>
        doc.title.toLowerCase().includes(documentSearch.toLowerCase())
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(allDocuments);
    }
  }, [selectedCategories, categoryDocuments, documentSearch]);

  // Update selected categories and documents when props change
  useEffect(() => {
    // Handle category selection
    if (filterCategory && !Array.isArray(filterCategory)) {
      setSelectedCategories([filterCategory]);
    } else if (Array.isArray(filterCategory)) {
      setSelectedCategories(filterCategory);
    }
    
    // Update category display title
    if (selectedCategories.length === 0) {
      setSelectedCategoryTitle("");
    } else if (selectedCategories.length === 1) {
      const selectedCat = allCategories.find(
        (cat) => cat.id === selectedCategories[0]
      );
      setSelectedCategoryTitle(selectedCat ? selectedCat.title : "");
    } else {
      setSelectedCategoryTitle(`${selectedCategories.length} danh mục đã chọn`);
    }
  }, [filterCategory, allCategories, selectedCategories.length]);

  // Update selected document title when filterDocument changes
  useEffect(() => {
    // Convert single filterDocument to array for backward compatibility
    if (filterDocument && !Array.isArray(filterDocument)) {
      setSelectedDocuments([filterDocument]);
    } else if (Array.isArray(filterDocument)) {
      setSelectedDocuments(filterDocument);
    }
    
    // Update display title
    if (selectedDocuments.length === 0) {
      setSelectedDocumentTitle("");
    } else if (selectedDocuments.length === 1) {
      // Find document in any selected category
      let selectedDoc = null;
      for (const categoryId of selectedCategories) {
        if (categoryDocuments[categoryId]) {
          selectedDoc = categoryDocuments[categoryId].find(
            (doc) => doc.id === selectedDocuments[0]
          );
          if (selectedDoc) break;
        }
      }
      setSelectedDocumentTitle(selectedDoc ? selectedDoc.title : "");
    } else {
      setSelectedDocumentTitle(`${selectedDocuments.length} tài liệu đã chọn`);
    }
  }, [filterDocument, selectedCategories, categoryDocuments, selectedDocuments.length]);

  // Handle category search input focus
  const handleCategorySearchFocus = () => {
    setShowCategoryDropdown(true);
    setCategorySearch(selectedCategoryTitle);
    // Select all text for easy replacement
    setTimeout(() => {
      if (categoryInputRef.current) {
        categoryInputRef.current.select();
      }
    }, 0);
  };

  // Handle category search input change
  const handleCategorySearchChange = (e) => {
    setCategorySearch(e.target.value);
    setShowCategoryDropdown(true);
  };

  // Handle document search input focus
  const handleDocumentSearchFocus = () => {
    if (selectedCategories.length > 0) {
      setShowDocumentDropdown(true);
      setDocumentSearch(selectedDocumentTitle);
      // Select all text for easy replacement
      setTimeout(() => {
        if (documentInputRef.current) {
          documentInputRef.current.select();
        }
      }, 0);
    }
  };

  // Handle document search input change
  const handleDocumentSearchChange = (e) => {
    setDocumentSearch(e.target.value);
    setShowDocumentDropdown(true);
  };

  // Handle checkbox change for category selection
  const handleCategoryCheckboxChange = (categoryId, isChecked) => {
    let newSelectedCategories;
    if (isChecked) {
      newSelectedCategories = [...selectedCategories, categoryId];
    } else {
      newSelectedCategories = selectedCategories.filter(id => id !== categoryId);
    }
    
    setSelectedCategories(newSelectedCategories);
    setFilterCategory(newSelectedCategories);
    
    // Reset documents when categories change
    setSelectedDocuments([]);
    setFilterDocument([]);
    setSelectedDocumentTitle("");
    
    // Update display title
    if (newSelectedCategories.length === 0) {
      setSelectedCategoryTitle("");
    } else if (newSelectedCategories.length === 1) {
      const selectedCat = allCategories.find(
        (cat) => cat.id === newSelectedCategories[0]
      );
      setSelectedCategoryTitle(selectedCat ? selectedCat.title : "");
    } else {
      setSelectedCategoryTitle(`${newSelectedCategories.length} danh mục đã chọn`);
    }
  };

  // Handle select all / deselect all categories
  const handleSelectAllCategories = () => {
    const allCatIds = filteredCategories.map(cat => cat.id);
    const allSelected = allCatIds.every(id => selectedCategories.includes(id));
    
    if (allSelected) {
      // Deselect all
      const newSelected = selectedCategories.filter(id => !allCatIds.includes(id));
      setSelectedCategories(newSelected);
      setFilterCategory(newSelected);
    } else {
      // Select all
      const newSelected = [...new Set([...selectedCategories, ...allCatIds])];
      setSelectedCategories(newSelected);
      setFilterCategory(newSelected);
    }
    
    // Reset documents when categories change
    setSelectedDocuments([]);
    setFilterDocument([]);
    setSelectedDocumentTitle("");
  };

  // Handle checkbox change for document selection
  const handleDocumentCheckboxChange = (docId, isChecked) => {
    let newSelectedDocuments;
    if (isChecked) {
      newSelectedDocuments = [...selectedDocuments, docId];
    } else {
      newSelectedDocuments = selectedDocuments.filter(id => id !== docId);
    }
    
    setSelectedDocuments(newSelectedDocuments);
    setFilterDocument(newSelectedDocuments);
    
    // Update display title
    if (newSelectedDocuments.length === 0) {
      setSelectedDocumentTitle("");
    } else if (newSelectedDocuments.length === 1) {
      // Find document in any selected category
      let selectedDoc = null;
      for (const categoryId of selectedCategories) {
        if (categoryDocuments[categoryId]) {
          selectedDoc = categoryDocuments[categoryId].find(
            (doc) => doc.id === newSelectedDocuments[0]
          );
          if (selectedDoc) break;
        }
      }
      setSelectedDocumentTitle(selectedDoc ? selectedDoc.title : "");
    } else {
      setSelectedDocumentTitle(`${newSelectedDocuments.length} tài liệu đã chọn`);
    }
  };

  // Handle select all / deselect all
  const handleSelectAllDocuments = () => {
    const allDocIds = filteredDocuments.map(doc => doc.id);
    const allSelected = allDocIds.every(id => selectedDocuments.includes(id));
    
    if (allSelected) {
      // Deselect all
      const newSelected = selectedDocuments.filter(id => !allDocIds.includes(id));
      setSelectedDocuments(newSelected);
      setFilterDocument(newSelected);
    } else {
      // Select all
      const newSelected = [...new Set([...selectedDocuments, ...allDocIds])];
      setSelectedDocuments(newSelected);
      setFilterDocument(newSelected);
    }
  };

  // Handle document selection from dropdown (keep for backward compatibility)
  const handleDocumentSelect = (doc) => {
    // Toggle selection instead of replace
    const isSelected = selectedDocuments.includes(doc.id);
    handleDocumentCheckboxChange(doc.id, !isSelected);
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
        setCategorySearch("");
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDocumentDropdown(false);
        setDocumentSearch("");
      }
    };

    if (showCategoryDropdown || showDocumentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCategoryDropdown, showDocumentDropdown]);

  // Handle category selection from dropdown (keep for backward compatibility)
  const handleCategorySelect = (category) => {
    // Toggle selection instead of replace
    const isSelected = selectedCategories.includes(category.id);
    handleCategoryCheckboxChange(category.id, !isSelected);
  };

  // Reset document selection when category changes (legacy function)
  const handleCategoryChange = (e) => {
    setFilterCategory([e.target.value]);
    setSelectedCategories([e.target.value]);
    setFilterDocument([]);
    setSelectedDocuments([]);
    setSelectedDocumentTitle("");
    setDocumentSearch("");
    setShowDocumentDropdown(false);
  };

  if (!showFilterModal) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span
          className="hidden sm:inline-block sm-align-middle sm:h-screen"
          aria-hidden="true"
        >
          &zwnj;
        </span>
        <div
          className={`inline-block align-bottom rounded-lg text-left sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600"
              : "bg-gray-50 border border-gray-200"
          }`}
          style={{
            minHeight: showDocumentDropdown ? "600px" : "350px",
            maxHeight: "90vh",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            className={`px-6 pt-6 pb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
            style={{
              minHeight: showDocumentDropdown ? "550px" : "300px",
              position: "relative",
              overflow: "visible",
              height: "100%",
            }}
          >
            <h3 className="text-xl font-medium leading-6 mb-5">Lọc câu hỏi</h3>
            <div className="mb-5" ref={categoryDropdownRef}>
              <label
                htmlFor="filterCategory"
                className="block text-sm font-medium mb-2"
              >
                Danh mục
              </label>
              <div
                className="relative"
                style={{
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <input
                  ref={categoryInputRef}
                  type="text"
                  id="filterCategory"
                  className={`w-full rounded-xl py-3 px-4 pr-10 ${
                    isDarkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Tìm kiếm danh mục..."
                  value={
                    showCategoryDropdown
                      ? categorySearch
                      : selectedCategoryTitle
                  }
                  onChange={handleCategorySearchChange}
                  onFocus={handleCategorySearchFocus}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className={`h-5 w-5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-400"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {showCategoryDropdown ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    )}
                  </svg>
                </div>

                {/* Category Dropdown list */}
                {showCategoryDropdown && (
                  <div
                    className={`absolute w-full mt-1 overflow-auto rounded-lg shadow-xl border-2 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-500"
                        : "bg-white border-gray-300"
                    }`}
                    style={{
                      maxHeight: "200px",
                      zIndex: 11,
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      top: "100%",
                      left: 0,
                      right: 0,
                      position: "absolute",
                    }}
                  >
                    {filteredCategories.length > 0 ? (
                      <>
                        {/* Select All / Deselect All Categories */}
                        <div
                          className={`px-4 py-2 border-b cursor-pointer hover:${
                            isDarkMode ? "bg-gray-600" : "bg-gray-100"
                          } ${
                            isDarkMode ? "border-gray-600" : "border-gray-200"
                          }`}
                          onClick={handleSelectAllCategories}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-3 rounded"
                              checked={filteredCategories.every(cat => selectedCategories.includes(cat.id))}
                              onChange={() => {}} // Handled by parent click
                            />
                            <div className="text-sm font-medium">
                              {filteredCategories.every(cat => selectedCategories.includes(cat.id)) 
                                ? "Bỏ chọn tất cả" 
                                : "Chọn tất cả"
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* Category list with checkboxes */}
                        {filteredCategories.map((category) => (
                          <div
                            key={category.id}
                            className={`px-4 py-3 cursor-pointer hover:${
                              isDarkMode ? "bg-gray-600" : "bg-gray-100"
                            } ${
                              selectedCategories.includes(category.id)
                                ? isDarkMode
                                  ? "bg-blue-700"
                                  : "bg-blue-100"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleCategoryCheckboxChange(category.id, !selectedCategories.includes(category.id));
                            }}
                          >
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                className="mr-3 mt-0.5 rounded"
                                checked={selectedCategories.includes(category.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleCategoryCheckboxChange(category.id, e.target.checked);
                                }}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{category.title}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div
                        className={`px-4 py-3 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {categorySearch.trim()
                          ? "Không tìm thấy danh mục nào"
                          : "Không có danh mục nào"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mb-20" ref={dropdownRef}>
              <label
                htmlFor="filterDocument"
                className="block text-sm font-medium mb-2"
              >
                Tài liệu
              </label>
              <div
                className="relative"
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <input
                  ref={documentInputRef}
                  type="text"
                  id="filterDocument"
                  className={`w-full rounded-xl py-3 px-4 pr-10 ${
                    isDarkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={
                    selectedCategories.length > 0
                      ? "Tìm kiếm tài liệu..."
                      : "Chọn danh mục trước"
                  }
                  value={
                    showDocumentDropdown
                      ? documentSearch
                      : selectedDocumentTitle
                  }
                  onChange={handleDocumentSearchChange}
                  onFocus={handleDocumentSearchFocus}
                  disabled={selectedCategories.length === 0}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className={`h-5 w-5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-400"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {showDocumentDropdown ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    )}
                  </svg>
                </div>

                {/* Dropdown list */}
                {showDocumentDropdown && selectedCategories.length > 0 && (
                  <div
                    className={`absolute w-full mt-1 overflow-auto rounded-lg shadow-xl border-2 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-500"
                        : "bg-white border-gray-300"
                    }`}
                    style={{
                      maxHeight: "300px",
                      zIndex: 10,
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      top: "100%",
                      left: 0,
                      right: 0,
                      position: "absolute",
                    }}
                  >
                    {filteredDocuments.length > 0 ? (
                      <>
                        {/* Select All / Deselect All */}
                        <div
                          className={`px-4 py-2 border-b cursor-pointer hover:${
                            isDarkMode ? "bg-gray-600" : "bg-gray-100"
                          } ${
                            isDarkMode ? "border-gray-600" : "border-gray-200"
                          }`}
                          onClick={handleSelectAllDocuments}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-3 rounded"
                              checked={filteredDocuments.every(doc => selectedDocuments.includes(doc.id))}
                              onChange={() => {}} // Handled by parent click
                            />
                            <div className="text-sm font-medium">
                              {filteredDocuments.every(doc => selectedDocuments.includes(doc.id)) 
                                ? "Bỏ chọn tất cả" 
                                : "Chọn tất cả"
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* Document list with checkboxes */}
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className={`px-4 py-3 cursor-pointer hover:${
                              isDarkMode ? "bg-gray-600" : "bg-gray-100"
                            } ${
                              selectedDocuments.includes(doc.id)
                                ? isDarkMode
                                  ? "bg-blue-700"
                                  : "bg-blue-100"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDocumentCheckboxChange(doc.id, !selectedDocuments.includes(doc.id));
                            }}
                          >
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                className="mr-3 mt-0.5 rounded"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleDocumentCheckboxChange(doc.id, e.target.checked);
                                }}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{doc.title}</div>
                                {doc.description && (
                                  <div
                                    className={`text-xs ${
                                      isDarkMode ? "text-gray-400" : "text-gray-500"
                                    }`}
                                  >
                                    {doc.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div
                        className={`px-4 py-3 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {documentSearch.trim()
                          ? "Không tìm thấy tài liệu nào"
                          : "Không có tài liệu trong danh mục này"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              className="flex justify-end space-x-4"
              style={{
                position: "relative",
                zIndex: 0,
                marginTop: "auto",
              }}
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-md font-medium ${
                  isDarkMode
                    ? "bg-gray-600 hover:bg-gray-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } transition-colors`}
                onClick={() => setShowFilterModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md font-medium ${
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                } transition-colors ${
                  selectedCategories.length === 0 || selectedDocuments.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={handleApplyFilter}
                disabled={selectedCategories.length === 0 || selectedDocuments.length === 0}
              >
                Áp dụng ({selectedDocuments.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterQuestionModal;
