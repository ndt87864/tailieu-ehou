import React from "react";
import { formatDate } from "./studentInforHelpers";

/**
 * Component hiển thị thông tin sinh viên dạng card cho mobile
 * Sử dụng trong StudentInforManagement khi màn hình < 770px
 */
const StudentMobileCard = ({
  student,
  isDarkMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`relative p-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out ${
        isDarkMode
          ? "bg-gray-800/80 border border-gray-700/50 hover:bg-gray-800"
          : "bg-white/80 border border-gray-200/50 hover:bg-white"
      } ${isSelected ? "ring-2 ring-blue-500" : ""} backdrop-blur-md`}
    >
      {/* Checkbox và Actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="min-w-0 flex-1">
            <div
              className={`text-base font-semibold truncate ${
                isDarkMode ? "text-gray-100" : "text-gray-900"
              }`}
            >
              {student.fullName || "-"}
            </div>
            <div
              className={`text-sm truncate ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              MSV: {student.studentId || "-"}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Thông tin chính */}
      <div className="space-y-2 mb-3">
        <div
          className={`flex items-center gap-2 text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
            />
          </svg>
          <span className="truncate">{student.username || "-"}</span>
        </div>
        <div
          className={`flex items-center gap-2 text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>
            {formatDate(student.examDate) || (
              <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                Chưa cập nhật
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Chi tiết grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div
          className={`rounded-lg p-2.5 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Môn học
          </span>
          <span
            className={`block truncate ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {student.subject || "-"}
          </span>
        </div>
        <div
          className={`rounded-lg p-2.5 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Ca thi
          </span>
          <span
            className={`block truncate ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {student.examSession || "-"}
          </span>
        </div>
        <div
          className={`rounded-lg p-2.5 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Thời gian
          </span>
          <span
            className={`block truncate ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {student.examTime || "-"}
          </span>
        </div>
        <div
          className={`rounded-lg p-2.5 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Phòng thi
          </span>
          <span
            className={`block truncate ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {student.examRoom || "-"}
          </span>
        </div>
        <div
          className={`rounded-lg p-2.5 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Khóa
          </span>
          <span
            className={`block truncate ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {student.course || "-"}
          </span>
        </div>
        <div
          className={`rounded-lg p-2.5 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Mã ngành
          </span>
          <span
            className={`block truncate ${
              isDarkMode ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {student.majorCode || "-"}
          </span>
        </div>
      </div>

      {/* Link phòng */}
      {student.examLink && (
        <div
          className={`rounded-lg p-2.5 mb-3 ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <span
            className={`font-medium block text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Link phòng
          </span>
          <a
            href={student.examLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-sm break-all"
          >
            {student.examLink.length > 50
              ? student.examLink.slice(0, 50) + "..."
              : student.examLink}
          </a>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onEdit}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDarkMode
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
          onClick={onDelete}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDarkMode
              ? "bg-red-700 hover:bg-red-600 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

export default StudentMobileCard;
