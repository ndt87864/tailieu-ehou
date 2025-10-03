// Ẩn thanh scroll cho phần nội dung form
const hideScrollbarStyle = `
  .custom-hide-scrollbar::-webkit-scrollbar { display: none; }
  .custom-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

import React, { useState, useRef, useEffect } from "react";

const AddQuestionModal = ({
  showAddModal,
  isDarkMode,
  formError,
  imageError,
  handleAddQuestion,
  questionType,
  setQuestionType,
  documents,
  allCategories,
  categoryDocuments,
  selectedDocumentFilter,
  setSelectedDocumentFilter,
  newQuestion,
  handleInputChange,
  questionImageInputRef,
  questionImage,
  questionImageUrl,
  setQuestionImage,
  setQuestionImageUrl,
  answerImageInputRef,
  answerImage,
  answerImageUrl,
  setAnswerImage,
  setAnswerImageUrl,
  handleImageChange,
  fileInputRef,
  excelFile,
  setExcelFile,
  fileError,
  handleFileChange,
  processingExcel,
  uploadProgress,
  processedRows,
  totalRows,
  isSubmitting,
  setShowAddModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState("");
  const documentInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Initialize category and document from current selection
  useEffect(() => {
    if (selectedDocumentFilter && allCategories && categoryDocuments) {
      // Find the category that contains the selected document
      for (const category of allCategories) {
        if (categoryDocuments[category.id]) {
          const selectedDoc = categoryDocuments[category.id].find(
            (doc) => doc.id === selectedDocumentFilter
          );
          if (selectedDoc) {
            setSelectedCategory(category.id);
            setSelectedDocumentTitle(selectedDoc.title);
            break;
          }
        }
      }
    }
  }, [selectedDocumentFilter, allCategories, categoryDocuments]);

  // Update filtered documents when category or search changes
  useEffect(() => {
    if (selectedCategory && categoryDocuments[selectedCategory]) {
      const documents = categoryDocuments[selectedCategory];
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
  }, [selectedCategory, categoryDocuments, documentSearch]);

  // Handle document search input focus
  const handleDocumentSearchFocus = () => {
    if (selectedCategory && categoryDocuments[selectedCategory]) {
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
    setSelectedDocumentFilter(doc.id);
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

  // Handle category change
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    setSelectedDocumentFilter(null);
    setSelectedDocumentTitle("");
    setDocumentSearch("");
    setShowDocumentDropdown(false);
  };
  if (!showAddModal) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full max-w-3xl mx-auto">
        <div
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full transition-colors ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600 hover:border-blue-500"
              : "bg-gray-50 border border-gray-200 hover:border-blue-500"
          }`}
          style={{ maxHeight: "90vh" }}
        >
          {/* Thêm style ẩn thanh scroll */}
          <style>{hideScrollbarStyle}</style>
          <div
            className={`px-6 pt-6 pb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } custom-hide-scrollbar`}
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <h3 className="text-xl font-medium leading-6 mb-5">
              Thêm câu hỏi mới
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                {formError}
              </div>
            )}

            {imageError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                {imageError}
              </div>
            )}

            <form onSubmit={handleAddQuestion}>
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">
                  Loại nhập liệu
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="questionType"
                      value="text"
                      checked={questionType === "text"}
                      onChange={() => setQuestionType("text")}
                      className={`h-4 w-4 ${
                        isDarkMode
                          ? "text-blue-600 bg-gray-700 border-gray-600"
                          : "text-blue-600 bg-gray-100 border-gray-300"
                      }`}
                    />
                    <span className="ml-2">Nhập câu hỏi</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="questionType"
                      value="excel"
                      checked={questionType === "excel"}
                      onChange={() => setQuestionType("excel")}
                      className={`h-4 w-4 ${
                        isDarkMode
                          ? "text-blue-600 bg-gray-700 border-gray-600"
                          : "text-blue-600 bg-gray-100 border-gray-300"
                      }`}
                    />
                    <span className="ml-2">Nhập từ Excel</span>
                  </label>
                </div>
              </div>

              {/* Category selection */}
              <div className="mb-5">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium mb-2"
                >
                  Danh mục
                </label>
                <select
                  id="category"
                  className={`w-full rounded-xl py-3 px-4 ${
                    isDarkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={selectedCategory}
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

              {/* Document selection */}
              <div className="mb-5" ref={dropdownRef}>
                <label
                  htmlFor="document"
                  className="block text-sm font-medium mb-2"
                >
                  Tài liệu
                </label>
                <div className="relative">
                  <input
                    ref={documentInputRef}
                    type="text"
                    id="document"
                    className={`w-full rounded-xl py-3 px-4 pr-10 ${
                      isDarkMode
                        ? "bg-gray-700 text-white border-gray-600"
                        : "bg-gray-50 text-gray-900 border-gray-200"
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder={
                      selectedCategory
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
                    disabled={!selectedCategory}
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
                  {showDocumentDropdown && selectedCategory && (
                    <div
                      className={`absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg shadow-lg ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-200"
                      } border`}
                    >
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className={`px-4 py-3 cursor-pointer hover:${
                              isDarkMode ? "bg-gray-600" : "bg-gray-100"
                            } ${
                              selectedDocumentFilter === doc.id
                                ? isDarkMode
                                  ? "bg-blue-700"
                                  : "bg-blue-100"
                                : ""
                            }`}
                            onClick={() => handleDocumentSelect(doc)}
                          >
                            <div className="text-sm font-medium">
                              {doc.title}
                            </div>
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

              {questionType === "text" ? (
                <>
                  {/* Câu hỏi */}
                  <div className="mb-5">
                    <label
                      htmlFor="question"
                      className="block text-sm font-medium mb-2"
                    >
                      Câu hỏi
                    </label>
                    <textarea
                      id="question"
                      name="question"
                      rows="3"
                      className={`w-full rounded-xl py-3 px-4 ${
                        isDarkMode
                          ? "bg-gray-700 text-white border-gray-600"
                          : "bg-gray-50 text-gray-900 border-gray-200"
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Nhập câu hỏi..."
                      value={newQuestion.question}
                      onChange={handleInputChange}
                    />
                  </div>
                  {/* Ảnh câu hỏi */}
                  <div className="mb-5">
                    <label
                      htmlFor="questionImage"
                      className="block text-sm font-semibold mb-2"
                    >
                      Ảnh (không bắt buộc)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-2 text-center ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 hover:border-gray-500"
                          : "bg-gray-50 border-gray-300 hover:border-gray-400"
                      } transition-colors`}
                      style={{ minHeight: 180 }}
                    >
                      <input
                        type="file"
                        id="questionImage"
                        accept="image/*"
                        ref={questionImageInputRef}
                        className="hidden"
                        onChange={(e) => handleImageChange(e, "question")}
                      />
                      {questionImage ? (
                        <div className="py-1">
                          <img
                            src={questionImageUrl}
                            alt="Question Preview"
                            className="max-w-full h-40 object-contain rounded mb-1 mx-auto"
                          />
                          <p className="text-xs font-semibold mb-1 truncate">
                            {questionImage.name}
                          </p>
                          <div className="flex gap-1 justify-center mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionImage(null);
                                setQuestionImageUrl("");
                                if (questionImageInputRef.current)
                                  questionImageInputRef.current.value = "";
                                setTimeout(() => {}, 0);
                              }}
                              className={`px-2 py-1 text-xs rounded-md ${
                                isDarkMode
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-red-100 hover:bg-red-200 text-red-700"
                              }`}
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionImage(null);
                                setQuestionImageUrl("");
                                if (questionImageInputRef.current)
                                  questionImageInputRef.current.value = "";
                                questionImageInputRef.current?.click();
                              }}
                              className={`px-2 py-1 text-xs rounded-md ${
                                isDarkMode
                                  ? "bg-gray-600 hover:bg-gray-500 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                              }`}
                            >
                              Đổi ảnh
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="py-4 cursor-pointer"
                          onClick={() => questionImageInputRef.current?.click()}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 mx-auto text-gray-400 mb-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-xs font-semibold mb-1">Chọn ảnh</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Tối đa 5MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Câu trả lời */}
                  <div className="mb-5">
                    <label
                      htmlFor="answer"
                      className="block text-sm font-medium mb-2"
                    >
                      Câu trả lời
                    </label>
                    <textarea
                      id="answer"
                      name="answer"
                      rows="5"
                      className={`w-full rounded-xl py-3 px-4 ${
                        isDarkMode
                          ? "bg-gray-700 text-white border-gray-600"
                          : "bg-gray-50 text-gray-900 border-gray-200"
                      } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Nhập câu trả lời..."
                      value={newQuestion.answer}
                      onChange={handleInputChange}
                    />
                  </div>
                  {/* Ảnh câu trả lời */}
                  <div className="mb-5">
                    <label
                      htmlFor="answerImage"
                      className="block text-sm font-semibold mb-2"
                    >
                      Ảnh (không bắt buộc)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-2 text-center ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 hover:border-gray-500"
                          : "bg-gray-50 border-gray-300 hover:border-gray-400"
                      } transition-colors`}
                      style={{ minHeight: 180 }}
                    >
                      <input
                        type="file"
                        id="answerImage"
                        accept="image/*"
                        ref={answerImageInputRef}
                        className="hidden"
                        onChange={(e) => handleImageChange(e, "answer")}
                      />
                      {answerImage ? (
                        <div className="py-1">
                          <img
                            src={answerImageUrl}
                            alt="Answer Preview"
                            className="max-w-full h-40 object-contain rounded mb-1 mx-auto"
                          />
                          <p className="text-xs font-semibold mb-1 truncate">
                            {answerImage.name}
                          </p>
                          <div className="flex gap-1 justify-center mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAnswerImage(null);
                                setAnswerImageUrl("");
                                if (answerImageInputRef.current)
                                  answerImageInputRef.current.value = "";
                                setTimeout(() => {}, 0);
                              }}
                              className={`px-2 py-1 text-xs rounded-md ${
                                isDarkMode
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-red-100 hover:bg-red-200 text-red-700"
                              }`}
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAnswerImage(null);
                                setAnswerImageUrl("");
                                if (answerImageInputRef.current)
                                  answerImageInputRef.current.value = "";
                                answerImageInputRef.current?.click();
                              }}
                              className={`px-2 py-1 text-xs rounded-md ${
                                isDarkMode
                                  ? "bg-gray-600 hover:bg-gray-500 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                              }`}
                            >
                              Đổi ảnh
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="py-4 cursor-pointer"
                          onClick={() => answerImageInputRef.current?.click()}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 mx-auto text-gray-400 mb-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-xs font-semibold mb-1">Chọn ảnh</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Tối đa 5MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-5">
                  <label
                    htmlFor="excelFile"
                    className="block text-sm font-medium mb-2"
                  >
                    File Excel
                  </label>
                  {processingExcel ? (
                    <div
                      className={`p-4 rounded-md border ${
                        isDarkMode
                          ? "bg-gray-600 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Đang tải lên Firestore...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-center mt-2">
                        Đã xử lý {processedRows}/{totalRows} câu hỏi
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 text-center ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 hover:border-gray-500"
                          : "bg-gray-50 border-gray-300 hover:border-gray-400"
                      } transition-colors`}
                    >
                      <input
                        type="file"
                        id="excelFile"
                        accept=".xlsx,.xls"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      {excelFile ? (
                        <div className="py-2">
                          <div className="flex items-center justify-center mb-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-8 w-8"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold mb-1">
                            {excelFile.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(excelFile.size / 1024).toFixed(2)} KB
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setExcelFile(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className={`mt-2 px-3 py-1 text-xs rounded-md ${
                              isDarkMode
                                ? "bg-gray-600 hover:bg-gray-500 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            Chọn file khác
                          </button>
                        </div>
                      ) : (
                        <div
                          className="py-8 cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 mx-auto text-gray-400 mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-sm font-semibold mb-1">
                            Chọn file Excel
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Chấp nhận file .xlsx, .xls (tối đa 5MB)
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {fileError && (
                    <p className="mt-2 text-sm text-red-600">{fileError}</p>
                  )}
                  <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-xs">
                    <p className="font-semibold mb-1">Định dạng file Excel:</p>
                    <ul className="list-disc list-inside ml-3 space-y-1">
                      <li>
                        <span className="font-medium">Cột A:</span> Câu hỏi
                      </li>
                      <li>
                        <span className="font-medium">Cột B:</span> Câu trả lời
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? "bg-gray-600 hover:bg-gray-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  } transition-colors`}
                  onClick={() => setShowAddModal(false)}
                  disabled={processingExcel}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  } transition-colors ${
                    isSubmitting || processingExcel
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={isSubmitting || processingExcel}
                >
                  {processingExcel
                    ? `Đang xử lý (${uploadProgress}%)`
                    : isSubmitting
                    ? "Đang thêm..."
                    : "Thêm câu hỏi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AddQuestionModal;
