import React from "react";
import { useFirebaseConnection } from "../context/FirebaseConnectionContext";
import FirebaseConnectionError from "../pages/FirebaseConnectionError";

/**
 * Wrapper component kiểm tra kết nối Firebase trước khi render children
 * Hiển thị trang lỗi nếu không kết nối được Firebase
 * 
 * QUAN TRỌNG: 
 * - isConnected === null: Chưa kiểm tra, hiển thị loading
 * - isConnected === false: Mất kết nối, hiển thị trang lỗi
 * - isConnected === true: Đã kết nối, render children
 */
const FirebaseConnectionGuard = ({ children }) => {
  const {
    isConnected,
    isChecking,
    retryCount,
    maxRetries,
    hasInitialCheck,
    retryConnection,
  } = useFirebaseConnection();

  // Trạng thái 1: Chưa kiểm tra hoặc đang kiểm tra lần đầu - hiển thị loading
  // isConnected === null nghĩa là chưa biết trạng thái
  if (isConnected === null || (!hasInitialCheck && isChecking)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.5 5.25a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0v-6zm-.75 10.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">
            Đang kết nối đến máy chủ...
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      </div>
    );
  }

  // Trạng thái 2: Mất kết nối (isConnected === false) - hiển thị trang lỗi
  // QUAN TRỌNG: Không render children, chỉ hiển thị trang lỗi
  if (isConnected === false) {
    return (
      <FirebaseConnectionError
        onRetry={retryConnection}
        retryCount={retryCount}
        maxRetries={maxRetries}
      />
    );
  }

  // Trạng thái 3: Đã kết nối (isConnected === true) - render children
  return children;
};

export default FirebaseConnectionGuard;


