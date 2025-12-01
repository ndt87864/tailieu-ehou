import React from "react";

const CategoryManagementModal = ({
  showCategoryModal,
  userToManageCategories,
  isDarkMode,
  isLoadingCategories,
  filteredCategories,
  filteredDocuments,
  activeCategoryId,
  selectedCategories,
  selectedDocuments,
  handleCategoryClick,
  handleCategoryChange,
  handleDocumentChange,
  handleCategorySearch,
  handleDocumentSearch,
  categorySearch,
  documentSearch,
  handleSaveCategories,
  isSavingCategories,
  setShowCategoryModal,
}) => {
  if (!showCategoryModal || !userToManageCategories) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-black bg-opacity-70"></div>
        </div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {/* Modal Header */}
          <div
            className={`px-6 py-4 border-b ${
              isDarkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`text-lg font-medium ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Quản lý danh mục trả phí cho người dùng
              </h3>
              <button
                type="button"
                className={`rounded-md p-1 focus:outline-none ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setShowCategoryModal(false)}
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          {/* Modal Body */}
          <div
            className={`px-6 py-5 ${
              isDarkMode
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-50 text-gray-800"
            } max-h-[70vh] overflow-y-auto`}
          >
            <div className="mb-5">
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                } mb-4`}
              >
                Chọn danh mục và tài liệu có thể truy cập cho người dùng:
              </p>
              <div
                className="flex items-center p-4 rounded-md mb-4 border border-dashed bg-opacity-50"
                style={{
                  backgroundColor: isDarkMode ? "#37415180" : "#f3f4f680",
                  borderColor: isDarkMode ? "#6b7280" : "#d1d5db",
                }}
              >
                {/* User info */}
                <div className="flex items-center">
                  {userToManageCategories?.photoURL ? (
                    <img
                      className="h-10 w-10 rounded-full mr-3"
                      src={userToManageCategories.photoURL}
                      alt=""
                    />
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-gray-200" : "text-gray-600"
                        }`}
                      >
                        {userToManageCategories?.displayName
                          ? userToManageCategories.displayName
                              .charAt(0)
                              .toUpperCase()
                          : "?"}
                      </span>
                    </div>
                  )}
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {userToManageCategories?.displayName || "Không có tên"}
                    </div>
                    <div
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {userToManageCategories?.email}
                    </div>
                  </div>
                </div>
              </div>
              {isLoadingCategories ? (
                <div className="flex justify-center items-center py-8">
                  <svg
                    className="animate-spin h-8 w-8 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row">
                  <div
                    className="w-full md:w-1/2 overflow-y-auto max-h-[40vh] md:max-h-[60vh] border-b md:border-b-0 md:border-r mb-4 md:mb-0 pb-4 md:pb-0"
                    style={{ borderColor: isDarkMode ? "#6b7280" : "#d1d5db" }}
                  >
                    <h4 className={`font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Danh mục</h4>
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={handleCategorySearch}
                      className={`w-full px-3 py-2 mb-4 border ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                        isDarkMode
                          ? "focus:ring-green-500 focus:border-green-500"
                          : "focus:ring-green-500 focus:border-green-500"
                      }`}
                    />
                    {filteredCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`p-3 cursor-pointer rounded-md mb-1 ${
                          activeCategoryId === category.id
                            ? isDarkMode
                              ? "bg-gray-800 text-white"
                              : "bg-gray-200 text-gray-900"
                            : isDarkMode
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => handleCategoryClick(category.id)}
                      >
                        <div className="flex items-center">
                            <input
                            type="checkbox"
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleCategoryChange(category.id)}
                            className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            onClick={(e) => e.stopPropagation()}
                            />
                            <label htmlFor={`category-${category.id}`} className="cursor-pointer flex-1">
                            {category.title || "Danh mục không có tên"}
                            </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="w-full md:w-1/2 overflow-y-auto max-h-[40vh] md:max-h-[60vh] md:pl-4">
                    <h4 className={`font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Tài liệu</h4>
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={documentSearch}
                      onChange={handleDocumentSearch}
                      className={`w-full px-3 py-2 mb-4 border ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                        isDarkMode
                          ? "focus:ring-green-500 focus:border-green-500"
                          : "focus:ring-green-500 focus:border-green-500"
                      }`}
                    />
                    {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                        <div key={doc.id} className={`flex items-center mb-2 p-2 rounded-md ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-100"}`}>
                            <input
                            type="checkbox"
                            id={`document-${doc.id}`}
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() =>
                                handleDocumentChange(doc.id, activeCategoryId)
                            }
                            className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`document-${doc.id}`} className={`cursor-pointer flex-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {doc.title}
                            </label>
                        </div>
                        ))
                    ) : (
                        <p className={`text-sm italic ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Không có tài liệu nào trong danh mục này</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Modal Footer */}
          <div
            className={`px-6 py-4 flex sm:flex-row-reverse ${
              isDarkMode
                ? "bg-gray-700 border-t border-gray-600"
                : "bg-gray-50 border-t border-gray-200"
            }`}
          >
            <button
              type="button"
              onClick={handleSaveCategories}
              disabled={isSavingCategories}
              className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                isSavingCategories
                  ? "bg-green-500 cursor-not-allowed"
                  : isDarkMode
                  ? "bg-green-700 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                  : "bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              }`}
            >
              {isSavingCategories ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Lưu thay đổi
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              }`}
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementModal;
