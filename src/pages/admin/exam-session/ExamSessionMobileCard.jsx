import React from "react";

const ExamSessionMobileCard = ({ session, onEdit, onDelete, isDarkMode }) => {
  return (
    <div
      className={`p-4 mb-3 rounded-lg shadow-sm border ${
        isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header: Title & Status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`font-medium text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {session.title}
          </h3>
          <div className="mt-1">
            {session.isActive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Hoạt động
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Đã tắt
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className={`border-t pt-3 space-y-2 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Bắt đầu
            </span>
            <span className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {session.startTime || "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Kết thúc
            </span>
            <span className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {session.endTime || "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`mt-4 pt-3 border-t flex justify-end space-x-3 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        <button
          onClick={() => onEdit(session)}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
            isDarkMode
              ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
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
          Sửa
        </button>
        <button
          onClick={() => onDelete(session.id)}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
            isDarkMode
              ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              : "bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
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
          Xóa
        </button>
      </div>
    </div>
  );
};

export default ExamSessionMobileCard;
