import React from "react";

const CategoryMobileCard = ({
  category,
  isDarkMode,
  renderCategoryIcon,
  handleEditClick,
  handleDeleteClick,
  handlePinClick,
}) => {
  return (
    <div
      className={`p-4 mb-4 rounded-lg shadow-sm border ${
        isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header: Icon & Title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div
            className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              isDarkMode ? "bg-gray-700" : "bg-indigo-100"
            } ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}
          >
            {renderCategoryIcon(category.logo)}
          </div>
          <div className="ml-3">
            <div
              className={`text-base font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {category.title}
            </div>
            {category.stt === 1 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                <svg
                  className="mr-1 h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                Được ghim
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`border-t pt-3 space-y-2 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        {/* Info Rows */}
        <div className="flex justify-between items-center">
          <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Số tài liệu:
          </span>
          <span className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
            {category.documentCount || 0}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Quyền truy cập:
          </span>
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              category.adminOnly
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {category.adminOnly ? "Chỉ Admin" : "Công khai"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={`mt-4 pt-3 border-t flex justify-end space-x-3 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        <button
          onClick={() => handlePinClick(category)}
          className={`${
            category.stt === 1
              ? "text-yellow-500 cursor-not-allowed"
              : isDarkMode
              ? "text-gray-400 hover:text-yellow-400"
              : "text-gray-400 hover:text-yellow-600"
          }`}
          disabled={category.stt === 1}
          title="Đưa lên đầu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill={category.stt === 1 ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
        <button
          onClick={() => handleEditClick(category)}
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
          onClick={() => handleDeleteClick(category)}
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

export default CategoryMobileCard;
