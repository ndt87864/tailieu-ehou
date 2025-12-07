import React, { useState } from "react";

const QuestionMobileCard = ({
  question,
  isDarkMode,
  index,
  isSelected,
  handleSelectRow,
  openEditModal,
  openDeleteModal,
}) => {
  const [imageModal, setImageModal] = useState({ open: false, url: "" });

  // Cắt ngắn text nếu quá dài
  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <>
      {/* Image Modal */}
      {imageModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4 relative">
            <button
              className="absolute -top-4 -right-4 bg-white shadow-lg rounded-full text-gray-600 hover:text-black text-2xl w-10 h-10 flex items-center justify-center border border-gray-300 hover:border-blue-500 transition-colors"
              onClick={() => setImageModal({ open: false, url: "" })}
              title="Đóng"
              style={{ zIndex: 60 }}
            >
              &times;
            </button>
            <img
              src={imageModal.url}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
            <div className="mt-3 text-center">
              <a
                href={imageModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Mở ảnh trong tab mới
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className={`p-4 mb-4 rounded-lg shadow-sm border ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } ${isSelected ? (isDarkMode ? "ring-2 ring-blue-500" : "ring-2 ring-blue-400") : ""}`}
      >
        {/* Header: Checkbox, STT & Actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectRow(question.id)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <div
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                isDarkMode ? "bg-gray-700" : "bg-blue-100"
              } ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
            >
              <span className="text-sm font-bold">
                {question._groupStt || index + 1}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => openEditModal(question)}
              className={`p-2 rounded-md ${
                isDarkMode
                  ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                  : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
              title="Chỉnh sửa"
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              onClick={() => openDeleteModal(question)}
              className={`p-2 rounded-md ${
                isDarkMode
                  ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                  : "text-red-600 hover:bg-red-50 hover:text-red-700"
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

        {/* Question Content */}
        <div
          className={`border-t pt-3 space-y-3 ${
            isDarkMode ? "border-gray-700" : "border-gray-100"
          }`}
        >
          {/* Câu hỏi */}
          <div>
            <span
              className={`text-xs font-semibold uppercase ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Câu hỏi:
            </span>
            <p
              className={`mt-1 text-sm ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {truncateText(question.question, 150)}
            </p>
            {question.url_question && (
              <div className="mt-2">
                <img
                  src={question.url_question}
                  alt="Question"
                  className="max-w-full h-24 object-contain rounded cursor-pointer border"
                  onClick={() =>
                    setImageModal({ open: true, url: question.url_question })
                  }
                />
              </div>
            )}
          </div>

          {/* Câu trả lời */}
          <div>
            <span
              className={`text-xs font-semibold uppercase ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Đáp án:
            </span>
            <p
              className={`mt-1 text-sm ${
                isDarkMode ? "text-green-300" : "text-green-700"
              }`}
            >
              {truncateText(question.answer, 150)}
            </p>
            {question.url_answer && (
              <div className="mt-2">
                <img
                  src={question.url_answer}
                  alt="Answer"
                  className="max-w-full h-24 object-contain rounded cursor-pointer border"
                  onClick={() =>
                    setImageModal({ open: true, url: question.url_answer })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer: Document & Category */}
        <div
          className={`mt-3 pt-3 border-t flex flex-wrap gap-2 ${
            isDarkMode ? "border-gray-700" : "border-gray-100"
          }`}
        >
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              isDarkMode
                ? "bg-gray-700 text-gray-300"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 mr-1"
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
            {question.documentTitle || "Không có tài liệu"}
          </span>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              isDarkMode
                ? "bg-blue-900/50 text-blue-300"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {question.categoryTitle || "Không có danh mục"}
          </span>
        </div>
      </div>
    </>
  );
};

export default QuestionMobileCard;
