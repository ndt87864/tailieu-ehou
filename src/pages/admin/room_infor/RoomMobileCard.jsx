import React from "react";
import { formatDate } from "../student_infor/studentInforHelpers";

const RoomMobileCard = ({
  room,
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
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <div className="min-w-0 flex-1">
            <div className={`text-base font-semibold truncate ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{room.subject || "-"}</div>
            <div className={`text-sm truncate ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Phòng: {room.examRoom || "-"}</div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className={`flex items-center gap-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{room.examDate ? formatDate(room.examDate) : <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>Chưa cập nhật</span>}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <span className={`font-medium block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Ca thi</span>
          <span className={`block truncate ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{room.examSession || "-"}</span>
        </div>
        <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <span className={`font-medium block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Thời gian</span>
          <span className={`block truncate ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{room.examTime || "-"}</span>
        </div>
        <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <span className={`font-medium block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Mã ngành</span>
          <span className={`block truncate ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{room.majorCode || "-"}</span>
        </div>
        <div className={`rounded-lg p-2.5 ${isDarkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <span className={`font-medium block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Phòng</span>
          <span className={`block truncate ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{room.examRoom || "-"}</span>
        </div>
      </div>

      {room.examLink && (
        <div className={`rounded-lg p-2.5 mb-3 ${isDarkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <span className={`font-medium block text-xs mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Link phòng</span>
          <a href={room.examLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm break-all">
            {room.examLink.length > 50 ? room.examLink.slice(0, 50) + "..." : room.examLink}
          </a>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onEdit} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
          Sửa
        </button>
        <button onClick={onDelete} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? "bg-red-700 hover:bg-red-600 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}>
          Xóa
        </button>
      </div>
    </div>
  );
};

export default RoomMobileCard;
