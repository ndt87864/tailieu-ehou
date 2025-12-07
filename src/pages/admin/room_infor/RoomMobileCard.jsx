import React from "react";
import { formatDate } from "../student_infor/studentInforHelpers";

const RoomMobileCard = ({
  room,
  index,
  isDarkMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`p-4 mb-3 rounded-lg shadow-sm border ${
        isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
    >
      {/* Header: Checkbox, Index & Subject */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(room.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="ml-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {index}
              </span>
              <span
                className={`text-base font-medium ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {room.subject || "(Không có tên môn)"}
              </span>
            </div>
            {room.majorCode && (
              <span
                className={`text-xs mt-1 block ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Mã ngành: {room.majorCode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div
        className={`border-t pt-3 space-y-2 ${
          isDarkMode ? "border-gray-700" : "border-gray-100"
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Ngày thi
            </span>
            <span
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {formatDate(room.examDate) || "-"}
            </span>
          </div>

          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Ca thi
            </span>
            <span
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {room.examSession || "-"}
            </span>
          </div>

          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Thời gian
            </span>
            <span
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {room.examTime || "-"}
            </span>
          </div>

          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Phòng
            </span>
            <span
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {room.examRoom || "-"}
            </span>
          </div>
        </div>

        {/* Link phòng */}
        {room.examLink && (
          <div className="flex flex-col pt-2">
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Link phòng
            </span>
            <a
              href={room.examLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm truncate ${
                isDarkMode
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-800"
              }`}
            >
              {room.examLink}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={`mt-4 pt-3 border-t flex justify-end space-x-3 ${
          isDarkMode ? "border-gray-700" : "border-gray-100"
        }`}
      >
        <button
          onClick={() => onEdit(room)}
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
          onClick={() => onDelete(room)}
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

export default RoomMobileCard;
