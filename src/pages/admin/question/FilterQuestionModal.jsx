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
  // showCategoryDropdown removed
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const categoryInputRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  const [documentSearch, setDocumentSearch] = useState("");
  // showDocumentDropdown removed
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  // selectedDocumentTitle removed
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
    selectedCategories.forEach((categoryId) => {
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
  }, [filterCategory]);

  // Update selected document title when filterDocument changes
  // Update selected document title when filterDocument changes
  useEffect(() => {
    // Convert single filterDocument to array for backward compatibility
    if (filterDocument && !Array.isArray(filterDocument)) {
      setSelectedDocuments([filterDocument]);
    } else if (Array.isArray(filterDocument)) {
      setSelectedDocuments(filterDocument);
    }
  }, [filterDocument]);

  // Handle category search input focus
  const handleCategorySearchFocus = () => {
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
  };

  // Handle document search input focus
  const handleDocumentSearchFocus = () => {
    if (selectedCategories.length > 0) {
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
  };

  // Handle checkbox change for category selection
  const handleCategoryCheckboxChange = (categoryId, isChecked) => {
    let newSelectedCategories;
    if (isChecked) {
      newSelectedCategories = [...selectedCategories, categoryId];
    } else {
      newSelectedCategories = selectedCategories.filter(
        (id) => id !== categoryId
      );
    }

    setSelectedCategories(newSelectedCategories);
    setFilterCategory(newSelectedCategories);

    // Reset documents when categories change
    setSelectedDocuments([]);
    setFilterDocument([]);


  };

  // Handle select all / deselect all categories
  const handleSelectAllCategories = () => {
    const allCatIds = filteredCategories.map((cat) => cat.id);
    const allSelected = allCatIds.every((id) =>
      selectedCategories.includes(id)
    );

    if (allSelected) {
      // Deselect all
      const newSelected = selectedCategories.filter(
        (id) => !allCatIds.includes(id)
      );
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
  };

  // Handle checkbox change for document selection
  const handleDocumentCheckboxChange = (docId, isChecked) => {
    let newSelectedDocuments;
    if (isChecked) {
      newSelectedDocuments = [...selectedDocuments, docId];
    } else {
      newSelectedDocuments = selectedDocuments.filter((id) => id !== docId);
    }

    setSelectedDocuments(newSelectedDocuments);
    setFilterDocument(newSelectedDocuments);

    // Update display title
  };

  // Handle select all / deselect all
  const handleSelectAllDocuments = () => {
    const allDocIds = filteredDocuments.map((doc) => doc.id);
    const allSelected = allDocIds.every((id) => selectedDocuments.includes(id));

    if (allSelected) {
      // Deselect all
      const newSelected = selectedDocuments.filter(
        (id) => !allDocIds.includes(id)
      );
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
  // Removed useEffect for handleClickOutside as dropdowns are always visible

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
    setDocumentSearch("");
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
          className={`inline-flex flex-col align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600"
              : "bg-gray-50 border border-gray-200"
          }`}
          style={{
            maxHeight: "80vh",
          }}
        >
          <div
            className={`flex flex-col flex-1 min-h-0 w-full ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-6">
              <h3 className="text-xl font-medium leading-6 mb-5">Lọc câu hỏi</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                {/* Left Column: Selected Items Summary */}
                <div
                  className={`rounded-xl p-4 h-fit ${
                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-lg">Đã chọn</h4>
                    {(selectedCategories.length > 0 ||
                      selectedDocuments.length > 0) && (
                      <button
                        onClick={() => {
                          setSelectedCategories([]);
                          setFilterCategory([]);
                          setSelectedDocuments([]);
                          setFilterDocument([]);
                        }}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {/* Selected Categories List */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">
                      Danh mục ({selectedCategories.length})
                    </h5>
                    {selectedCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCategories.map((catId) => {
                          const cat = allCategories.find((c) => c.id === catId);
                          return (
                            <div
                              key={catId}
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm ${
                                isDarkMode
                                  ? "bg-blue-900/50 text-blue-200 border border-blue-800"
                                  : "bg-blue-50 text-blue-700 border border-blue-100"
                              }`}
                            >
                              <span className="mr-1.5 max-w-[150px] truncate">
                                {cat?.title || "Unknown"}
                              </span>
                              <button
                                onClick={() =>
                                  handleCategoryCheckboxChange(catId, false)
                                }
                                className="text-blue-400 hover:text-blue-600 focus:outline-none"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                        className={`text-sm italic ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Chưa chọn danh mục
                      </p>
                    )}
                  </div>

                  {/* Selected Documents List */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">
                      Tài liệu ({selectedDocuments.length})
                    </h5>
                    {selectedDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDocuments.map((docId) => {
                          // Helper to find doc title
                          let docTitle = "Unknown";
                          for (const catId of selectedCategories) {
                            const docs = categoryDocuments[catId];
                            if (docs) {
                              const found = docs.find((d) => d.id === docId);
                              if (found) {
                                docTitle = found.title;
                                break;
                              }
                            }
                          }
                          return (
                            <div
                              key={docId}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                                isDarkMode
                                  ? "bg-gray-800 border border-gray-600"
                                  : "bg-white border border-gray-200 shadow-sm"
                              }`}
                            >
                              <span className="truncate mr-2" title={docTitle}>
                                {docTitle}
                              </span>
                              <button
                                onClick={() =>
                                  handleDocumentCheckboxChange(docId, false)
                                }
                                className="text-gray-400 hover:text-red-500 focus:outline-none flex-shrink-0"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                        className={`text-sm italic ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Chưa chọn tài liệu
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Selection Interface */}
                <div className="flex flex-col gap-5">
                  <div ref={categoryDropdownRef}>
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
                        value={categorySearch}
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>

                      {/* Category List (Always Visible) */}
                      <div
                        className={`w-full mt-2 rounded-lg border ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {filteredCategories.length > 0 ? (
                          <>
                            {/* Select All / Deselect All Categories */}
                            <div
                              className={`px-4 py-2 border-b cursor-pointer hover:${
                                isDarkMode ? "bg-gray-600" : "bg-gray-100"
                              } ${
                                isDarkMode
                                  ? "border-gray-600"
                                  : "border-gray-200"
                              }`}
                              onClick={handleSelectAllCategories}
                            >
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="mr-3 rounded"
                                  checked={filteredCategories.every((cat) =>
                                    selectedCategories.includes(cat.id)
                                  )}
                                  onChange={() => {}} // Handled by parent click
                                />
                                <div className="text-sm font-medium">
                                  {filteredCategories.every((cat) =>
                                    selectedCategories.includes(cat.id)
                                  )
                                    ? "Bỏ chọn tất cả"
                                    : "Chọn tất cả"}
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
                                  handleCategoryCheckboxChange(
                                    category.id,
                                    !selectedCategories.includes(category.id)
                                  );
                                }}
                              >
                                <div className="flex items-start">
                                  <input
                                    type="checkbox"
                                    className="mr-3 mt-0.5 rounded"
                                    checked={selectedCategories.includes(
                                      category.id
                                    )}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleCategoryCheckboxChange(
                                        category.id,
                                        e.target.checked
                                      );
                                    }}
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {category.title}
                                    </div>
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
                    </div>
                  </div>
                  <div ref={dropdownRef}>
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
                        value={documentSearch}
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>

                      {/* Document List (Always Visible) */}
                      {selectedCategories.length > 0 && (
                        <div
                          className={`w-full mt-2 rounded-lg border ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {filteredDocuments.length > 0 ? (
                            <>
                              {/* Select All / Deselect All */}
                              <div
                                className={`px-4 py-2 border-b cursor-pointer hover:${
                                  isDarkMode ? "bg-gray-600" : "bg-gray-100"
                                } ${
                                  isDarkMode
                                    ? "border-gray-600"
                                    : "border-gray-200"
                                }`}
                                onClick={handleSelectAllDocuments}
                              >
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    className="mr-3 rounded"
                                    checked={filteredDocuments.every((doc) =>
                                      selectedDocuments.includes(doc.id)
                                    )}
                                    onChange={() => {}} // Handled by parent click
                                  />
                                  <div className="text-sm font-medium">
                                    {filteredDocuments.every((doc) =>
                                      selectedDocuments.includes(doc.id)
                                    )
                                      ? "Bỏ chọn tất cả"
                                      : "Chọn tất cả"}
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
                                    handleDocumentCheckboxChange(
                                      doc.id,
                                      !selectedDocuments.includes(doc.id)
                                    );
                                  }}
                                >
                                  <div className="flex items-start">
                                    <input
                                      type="checkbox"
                                      className="mr-3 mt-0.5 rounded"
                                      checked={selectedDocuments.includes(
                                        doc.id
                                      )}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleDocumentCheckboxChange(
                                          doc.id,
                                          e.target.checked
                                        );
                                      }}
                                    />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">
                                        {doc.title}
                                      </div>
                                      {doc.description && (
                                        <div
                                          className={`text-xs ${
                                            isDarkMode
                                              ? "text-gray-400"
                                              : "text-gray-500"
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
                </div>
              </div>
            </div>
            <div
              className={`px-6 py-4 border-t flex justify-between items-center space-x-4 flex-shrink-0 ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <div className="flex space-x-4">
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
                    selectedCategories.length === 0 ||
                    selectedDocuments.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={handleApplyFilter}
                  disabled={
                    selectedCategories.length === 0 ||
                    selectedDocuments.length === 0
                  }
                >
                  Áp dụng ({selectedDocuments.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterQuestionModal;
