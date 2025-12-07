import React from "react";

const DocumentMobileCard = ({
  doc,
  isDarkMode,
  index,
  currentPage,
  limit,
  handleEditClick,
  handleDeleteClick,
}) => {
  return (
    <div
      className={`p-4 mb-4 rounded-lg shadow-sm border ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      {/* Header: Icon & Title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div
            className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              isDarkMode ? "bg-gray-700" : "bg-blue-100"
            } ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <div
              className={`text-base font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {doc.title}
            </div>
            <div
              className={`text-xs mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              STT: {(currentPage - 1) * limit + index + 1}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`border-t pt-3 space-y-2 ${
          isDarkMode ? "border-gray-700" : "border-gray-100"
        }`}
      >
        {/* Info Rows */}
        <div className="flex justify-between items-center">
          <span
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Danh mục:
          </span>
          <span
            className={`text-sm font-medium ${
              isDarkMode ? "text-gray-200" : "text-gray-900"
            }`}
          >
            {doc.categoryTitle || "Không có danh mục"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Loại:
          </span>
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              doc.isVip
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {doc.isVip ? "VIP" : "Thường"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className={`mt-4 pt-3 border-t flex justify-end space-x-3 ${
          isDarkMode ? "border-gray-700" : "border-gray-100"
        }`}
      >
        <button
          onClick={() => handleEditClick(doc)}
          className={`${
            isDarkMode
              ? "text-indigo-400 hover:text-indigo-300"
              : "text-indigo-600 hover:text-indigo-900"
          }`}
          title="Sửa"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          onClick={() => handleDeleteClick(doc)}
          className={`${
            isDarkMode
              ? "text-red-400 hover:text-red-300"
              : "text-red-600 hover:text-red-900"
          }`}
          title="Xóa"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DocumentMobileCard;
