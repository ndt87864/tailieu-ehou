import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

const FirebaseConnectionError = ({ onRetry, retryCount = 0, maxRetries = 5 }) => {
  const { isDarkMode } = useTheme();
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Auto-retry với countdown
  useEffect(() => {
    if (retryCount < maxRetries && retryCount > 0) {
      const delay = Math.min(5 + retryCount * 2, 30); // 5s, 7s, 9s, 11s, 13s...
      setCountdown(delay);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [retryCount, maxRetries]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setIsRetrying(false);
    }
  };

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
            isDarkMode ? "bg-red-900/20" : "bg-red-200/40"
          } animate-pulse`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${
            isDarkMode ? "bg-orange-900/20" : "bg-orange-200/40"
          } animate-pulse`}
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Main Content */}
      <div
        className={`relative z-10 max-w-md w-full text-center ${
          isDarkMode
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        } backdrop-blur-xl rounded-2xl shadow-2xl border p-8`}
      >
        {/* Icon */}
        <div className="mb-6">
          <div
            className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${
              isDarkMode ? "bg-red-900/30" : "bg-red-100"
            }`}
          >
            <svg
              className={`w-12 h-12 ${
                isDarkMode ? "text-red-400" : "text-red-500"
              } ${isRetrying ? "animate-pulse" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1
          className={`text-2xl font-bold mb-3 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Không thể kết nối đến máy chủ
        </h1>

        {/* Description */}
        <p
          className={`mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          Chúng tôi đang gặp sự cố khi kết nối đến Firebase. Vui lòng kiểm tra
          kết nối internet của bạn và thử lại.
        </p>

        {/* Retry Info */}
        {retryCount > 0 && retryCount < maxRetries && (
          <div
            className={`mb-6 p-3 rounded-lg ${
              isDarkMode
                ? "bg-yellow-900/30 border border-yellow-800"
                : "bg-yellow-50 border border-yellow-200"
            }`}
          >
            <p
              className={`text-sm ${
                isDarkMode ? "text-yellow-300" : "text-yellow-700"
              }`}
            >
              Lần thử {retryCount}/{maxRetries}
              {countdown > 0 && (
                <span className="ml-2">
                  • Tự động thử lại sau {countdown}s
                </span>
              )}
            </p>
          </div>
        )}

        {/* Max Retries Reached */}
        {retryCount >= maxRetries && (
          <div
            className={`mb-6 p-3 rounded-lg ${
              isDarkMode
                ? "bg-red-900/30 border border-red-800"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p
              className={`text-sm ${
                isDarkMode ? "text-red-300" : "text-red-700"
              }`}
            >
              Đã thử kết nối {maxRetries} lần không thành công. Vui lòng kiểm
              tra kết nối mạng hoặc thử lại sau.
            </p>
          </div>
        )}

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
            isRetrying
              ? isDarkMode
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
              : isDarkMode
              ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25"
              : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-blue-500/25"
          }`}
        >
          {isRetrying ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
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
                ></path>
              </svg>
              <span>Đang kết nối...</span>
            </>
          ) : (
            <>
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Thử lại kết nối</span>
            </>
          )}
        </button>

        {/* Troubleshooting Tips */}
        <div
          className={`mt-8 text-left p-4 rounded-lg ${
            isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
          }`}
        >
          <h3
            className={`text-sm font-semibold mb-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Gợi ý khắc phục:
          </h3>
          <ul
            className={`text-sm space-y-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <li className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Kiểm tra kết nối internet của bạn</span>
            </li>
            <li className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Tắt VPN nếu đang sử dụng</span>
            </li>
            <li className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Thử làm mới trang (F5 hoặc Ctrl+R)</span>
            </li>
            <li className="flex items-start space-x-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Xóa cache trình duyệt và thử lại</span>
            </li>
          </ul>
        </div>

        {/* Status Info */}
        <div
          className={`mt-6 pt-4 border-t ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <p
            className={`text-xs ${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Mã lỗi: FIREBASE_CONNECTION_FAILED
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Nếu vấn đề vẫn tiếp tục, vui lòng liên hệ hỗ trợ
        </p>
      </div>
    </div>
  );
};

export default FirebaseConnectionError;
