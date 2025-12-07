import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const NotFound = () => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100"
      }`}
    >
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${
            isDarkMode ? "bg-blue-900/20" : "bg-blue-200/40"
          } animate-pulse`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${
            isDarkMode ? "bg-purple-900/20" : "bg-purple-200/40"
          } animate-pulse`}
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Main Content */}
      <div
        className={`relative z-10 max-w-lg w-full text-center ${
          isDarkMode
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        } backdrop-blur-xl rounded-2xl shadow-2xl border p-8`}
      >
        {/* 404 Number */}
        <div className="mb-6">
          <h1
            className={`text-9xl font-extrabold ${
              isDarkMode
                ? "text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text"
                : "text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text"
            }`}
          >
            404
          </h1>
        </div>

        {/* Icon */}
        <div className="mb-6">
          <div
            className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
              isDarkMode ? "bg-blue-900/30" : "bg-blue-100"
            }`}
          >
            <svg
              className={`w-10 h-10 ${
                isDarkMode ? "text-blue-400" : "text-blue-500"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-bold mb-3 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Trang không tìm thấy
        </h2>

        {/* Description */}
        <p
          className={`mb-8 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className={`py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
              isDarkMode
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>Về trang chủ</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className={`py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
              isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 17l-5-5m0 0l5-5m-5 5h12"
              />
            </svg>
            <span>Quay lại</span>
          </button>
        </div>

        {/* Helpful Links */}
        <div
          className={`mt-8 pt-6 border-t ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <p
            className={`text-sm mb-4 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Có thể bạn đang tìm kiếm:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className={`text-sm px-3 py-1 rounded-full ${
                isDarkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } transition-colors`}
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className={`text-sm px-3 py-1 rounded-full ${
                isDarkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } transition-colors`}
            >
              Đăng ký
            </Link>
            <Link
              to="/pricing"
              className={`text-sm px-3 py-1 rounded-full ${
                isDarkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } transition-colors`}
            >
              Bảng giá
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Nếu bạn tin rằng đây là lỗi, vui lòng liên hệ hỗ trợ
        </p>
      </div>
    </div>
  );
};

export default NotFound;
