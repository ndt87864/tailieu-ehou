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
  const [documentSearch, setDocumentSearch] = useState("");
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState("");
  const documentInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update filtered documents when category or search changes
  useEffect(() => {
    if (filterCategory && categoryDocuments[filterCategory]) {
      const documents = categoryDocuments[filterCategory];
      if (documentSearch.trim()) {
        const filtered = documents.filter((doc) =>
          doc.title.toLowerCase().includes(documentSearch.toLowerCase())
        );
        setFilteredDocuments(filtered);
      } else {
        setFilteredDocuments(documents);
      }
    } else {
      setFilteredDocuments([]);
    }
  }, [filterCategory, categoryDocuments, documentSearch]);

  // Update selected document title when filterDocument changes
  useEffect(() => {
    if (filterDocument && filterCategory && categoryDocuments[filterCategory]) {
      const selectedDoc = categoryDocuments[filterCategory].find(
        (doc) => doc.id === filterDocument
      );
      if (selectedDoc) {
        setSelectedDocumentTitle(selectedDoc.title);
        setDocumentSearch("");
        setShowDocumentDropdown(false);
      }
    } else {
      setSelectedDocumentTitle("");
    }
  }, [filterDocument, filterCategory, categoryDocuments]);

  // Handle document search input focus
  const handleDocumentSearchFocus = () => {
    if (filterCategory && categoryDocuments[filterCategory]) {
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

  // Handle document selection from dropdown
  const handleDocumentSelect = (doc) => {
    setFilterDocument(doc.id);
    setSelectedDocumentTitle(doc.title);
    setDocumentSearch("");
    setShowDocumentDropdown(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDocumentDropdown(false);
        setDocumentSearch("");
      }
    };

    if (showDocumentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDocumentDropdown]);

  // Reset document selection when category changes
  const handleCategoryChange = (e) => {
    setFilterCategory(e.target.value);
    setFilterDocument(null);
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
            position: "relative"
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
              height: "100%"
            }}
          >
            <h3 className="text-xl font-medium leading-6 mb-5">Lọc câu hỏi</h3>
            <div className="mb-5">
              <label
                htmlFor="filterCategory"
                className="block text-sm font-medium mb-2"
              >
                Danh mục
              </label>
              <select
                id="filterCategory"
                className={`w-full rounded-xl py-3 px-4 ${
                  isDarkMode
                    ? "bg-gray-700 text-white border-gray-600"
                    : "bg-gray-50 text-gray-900 border-gray-200"
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={filterCategory || ""}
                onChange={handleCategoryChange}
              >
                <option value="">Chọn danh mục</option>
                {allCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
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
                  zIndex: 1
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
                    filterCategory
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
                  disabled={!filterCategory}
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
                {showDocumentDropdown && filterCategory && (
                  <div
                    className={`absolute w-full mt-1 overflow-auto rounded-lg shadow-xl border-2 ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-500"
                        : "bg-white border-gray-300"
                    }`}
                    style={{
                      maxHeight: "300px",
                      zIndex: 10,
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      top: "100%",
                      left: 0,
                      right: 0,
                      position: "absolute"
                    }}
                  >
                    {filteredDocuments.length > 0 ? (
                      filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className={`px-4 py-3 cursor-pointer hover:${
                            isDarkMode ? "bg-gray-600" : "bg-gray-100"
                          } ${
                            filterDocument === doc.id
                              ? isDarkMode
                                ? "bg-blue-700"
                                : "bg-blue-100"
                              : ""
                          }`}
                          onClick={() => handleDocumentSelect(doc)}
                        >
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
                      ))
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
                marginTop: "auto"
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
                  !filterCategory || !filterDocument
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={handleApplyFilter}
                disabled={!filterCategory || !filterDocument}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterQuestionModal;
