import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase/firebase";
import { collection, limit, query, getDocsFromServer } from "firebase/firestore";
import { setReportOfflineCallback } from "../firebase/errorHandler";

// Tạo context
const FirebaseConnectionContext = createContext();

// Hằng số
const INITIAL_CHECK_TIMEOUT = 8000; // 8 giây cho lần kiểm tra đầu tiên
const RETRY_CHECK_TIMEOUT = 5000; // 5 giây cho các lần retry
const MAX_RETRIES = 5;
const HEALTH_CHECK_INTERVAL = 5000; // Kiểm tra mỗi 5 giây

// Global reference để các component khác có thể báo cáo lỗi kết nối
let globalSetOffline = null;

// Hàm để các component khác gọi khi phát hiện lỗi offline
export const reportFirebaseOffline = (error) => {
  console.log("Firebase offline reported:", error?.message || error);
  if (globalSetOffline) {
    globalSetOffline();
  }
};

export const FirebaseConnectionProvider = ({ children }) => {
  // QUAN TRỌNG: Khởi tạo null = chưa biết trạng thái kết nối
  const [isConnected, setIsConnected] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [hasInitialCheck, setHasInitialCheck] = useState(false);
  const checkingRef = useRef(false);

  // Hàm đặt trạng thái offline
  const setOffline = useCallback(() => {
    console.log("Setting Firebase connection to OFFLINE");
    setIsConnected(false);
  }, []);

  // Đăng ký global handler và callback với errorHandler
  useEffect(() => {
    globalSetOffline = setOffline;
    
    // Đăng ký callback với errorHandler để bắt lỗi offline từ các service
    setReportOfflineCallback(setOffline);
    
    return () => {
      globalSetOffline = null;
      setReportOfflineCallback(null);
    };
  }, [setOffline]);

  // Hàm kiểm tra kết nối internet nhanh (không phụ thuộc Firebase)
  const checkInternetConnection = useCallback(async () => {
    try {
      // Thử fetch với timeout rất ngắn
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log("Internet connection check failed:", error.message);
      return false;
    }
  }, []);

  // Hàm kiểm tra kết nối Firebase - QUAN TRỌNG: Sử dụng getDocsFromServer
  const checkConnection = useCallback(async (timeout = INITIAL_CHECK_TIMEOUT) => {
    // Ngăn chặn nhiều lần kiểm tra đồng thời
    if (checkingRef.current) return isConnected;
    checkingRef.current = true;
    
    setIsChecking(true);
    setLastError(null);

    try {
      // Bước 1: Kiểm tra internet trước (nhanh hơn)
      const hasInternet = await checkInternetConnection();
      if (!hasInternet) {
        console.log("No internet connection detected");
        setIsConnected(false);
        setLastError("Không có kết nối internet");
        return false;
      }

      // Bước 2: Kiểm tra Firebase
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, timeout);
      });

      // QUAN TRỌNG: Sử dụng getDocsFromServer để bắt buộc lấy từ server
      const testQuery = query(collection(db, "categories"), limit(1));
      
      await Promise.race([
        getDocsFromServer(testQuery),
        timeoutPromise,
      ]);

      // Kết nối thành công
      console.log("Firebase connection check: CONNECTED");
      setIsConnected(true);
      setRetryCount(0);
      setLastError(null);
      return true;
    } catch (error) {
      console.error("Firebase connection check: FAILED", error.message);
      setLastError(error.message);
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
      setHasInitialCheck(true);
      checkingRef.current = false;
    }
  }, [isConnected, checkInternetConnection]);

  // Hàm retry kết nối
  const retryConnection = useCallback(async () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    const success = await checkConnection(RETRY_CHECK_TIMEOUT);
    
    if (success) {
      setRetryCount(0);
    }
    
    return success;
  }, [checkConnection, retryCount]);

  // Kiểm tra kết nối ban đầu
  useEffect(() => {
    checkConnection();
  }, []);

  // Health check định kỳ - LUÔN LUÔN chạy để phát hiện mất kết nối
  useEffect(() => {
    if (!hasInitialCheck) return;

    const interval = setInterval(() => {
      checkConnection(RETRY_CHECK_TIMEOUT);
    }, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [hasInitialCheck, checkConnection]);

  // Lắng nghe sự kiện online/offline của browser
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser: ONLINE - checking Firebase...");
      checkConnection(RETRY_CHECK_TIMEOUT);
    };

    const handleOffline = () => {
      console.log("Browser: OFFLINE");
      setIsConnected(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkConnection(RETRY_CHECK_TIMEOUT);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Kiểm tra trạng thái offline ban đầu
    if (!navigator.onLine) {
      setIsConnected(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkConnection]);

  const value = {
    isConnected,
    isChecking,
    retryCount,
    maxRetries: MAX_RETRIES,
    lastError,
    hasInitialCheck,
    checkConnection,
    retryConnection,
    setOffline,
  };

  return (
    <FirebaseConnectionContext.Provider value={value}>
      {children}
    </FirebaseConnectionContext.Provider>
  );
};

// Hook để sử dụng context
export const useFirebaseConnection = () => {
  const context = useContext(FirebaseConnectionContext);
  if (!context) {
    throw new Error(
      "useFirebaseConnection must be used within a FirebaseConnectionProvider"
    );
  }
  return context;
};

export default FirebaseConnectionContext;

