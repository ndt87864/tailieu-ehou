import ExamSessionManagement from "./pages/admin/exam-session/ExamSessionManagement";
import React, { useEffect, useState, Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoadingSpinner from "./components/content/LoadingSpinner";
import DocumentView from "./pages/DocumentView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { UserRoleProvider } from "./context/UserRoleContext";
import { SidebarProvider } from "./context/SidebarContext";
import { FirebaseConnectionProvider } from "./context/FirebaseConnectionContext";
import FirebaseConnectionGuard from "./components/FirebaseConnectionGuard";
import { AppSettingsProvider, useAppSettings } from "./context/AppSettingsContext";
import AdminUserManagement from "./pages/admin/user/AdminUserManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import DocumentManagement from "./pages/admin/DocumentManagement";
import QuestionManagement from "./pages/admin/question/QuestionManagement";
import HomePage from "./pages/HomePage";
import StudentPage from "./pages/StudentPage";
import Pricing from "./pages/Pricing";
import EditorPage from "./pages/EditorPage";
import StudentInforManagement from "./pages/admin/student_infor/StudentInforManagement";
import RoomInforManagement from "./pages/admin/room_infor/RoomInforManagement";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase/firebase";
import { useUserRole } from "./context/UserRoleContext";
import ZaloContact from "./components/content/ZaloContact";
import CalendarReminder from "./components/content/CalendarReminder";
import AdSenseComponent from "./components/ads/RealAdSenseComponent";
import AdminDashboard from "./pages/admin/AdminDashboard";
import {
  setUserOnline,
  setUserOffline,
  incrementAnonymousVisitor,
  decrementAnonymousVisitor,
} from "./firebase/firestoreService";
import { increment } from "firebase/firestore";
import CalendarNoteManagement from "./pages/admin/CalendarNoteManagement";
import PremiumUserManagement from "./pages/admin/PremiumUserManagement";
import FooterManagement from "./pages/admin/FooterManagement";
import { redirectToCustomDomain } from "./utils/domainRedirect";
import { clearApplicationCache } from "./utils/storage/domainSync";
import {
  redirectToPrimaryDomain,
  initUpdateChecker,
  clearAppCache,
} from "./utils/storage/cacheControl";
import {
  checkAndHandleUpdate,
  forceRefresh,
} from "./utils/storage/cacheManager";
import PricingContentManagement from "./pages/admin/PricingContentManagement";

// Component bảo vệ route admin đơn giản
const ProtectedAdminRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const { isAdmin, roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Lưu đường dẫn admin hiện tại vào localStorage
  useEffect(() => {
    if (user && isAdmin && !loading && !roleLoading) {
      localStorage.setItem("lastAdminRoute", location.pathname);
    }
  }, [user, isAdmin, location.pathname, loading, roleLoading]);

  useEffect(() => {
    // Đợi cho đến khi cả auth loading và role loading xong
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/login", { state: { from: location.pathname } });
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, loading, isAdmin, roleLoading, navigate, location]);

  // Nếu đang load auth hoặc role, hiển thị loading
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return user && isAdmin ? children : null;
};

// Component bảo vệ route StudentPage khi bị tắt
const ProtectedStudentRoute = () => {
  const { studentPageEnabled, loading } = useAppSettings();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Nếu StudentPage bị tắt, redirect về trang chủ
  if (!studentPageEnabled) {
    return <Navigate to="/" replace />;
  }

  return <StudentPage />;
};

// Xử lý trang chủ cho admin với cải tiến lưu đường dẫn
const ConditionalHomeRoute = () => {
  const [user] = useAuthState(auth);
  const { isAdmin, roleLoading } = useUserRole();
  const location = useLocation();

  // Kiểm tra cả state và localStorage để phục hồi đường dẫn admin
  const isReturnFromAdmin =
    location.state &&
    location.state.from &&
    location.state.from.startsWith("/admin");
  const lastAdminRoute = localStorage.getItem("lastAdminRoute");

  // Nếu role đang load, hiển thị loading screen
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (user && isAdmin) {
    // Ưu tiên sử dụng state nếu có
    if (isReturnFromAdmin) {
      return <Navigate to={location.state.from} replace />;
    }
    // Nếu không có state nhưng có lastAdminRoute, sử dụng lastAdminRoute
    if (lastAdminRoute) {
      return <Navigate to={lastAdminRoute} replace />;
    }
    // Mặc định chuyển đến dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <HomePage />;
};

// Add domain redirect helper
const redirectIfNeeded = () => {
  const currentDomain = window.location.hostname;
  const newDomain = "tailieuehou.id.vn";

  if (currentDomain !== newDomain && currentDomain !== "localhost") {
    window.location.href = `https://${newDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
    return true;
  }
  return false;
};

function App() {
  const [user] = useAuthState(auth);
  const [isAnonymousVisitor, setIsAnonymousVisitor] = useState(false);
  const location = useLocation();
  const { darkMode } = useTheme();

  // Check for domain redirect on initial load
  useEffect(() => {
    redirectToCustomDomain();

    // Clear cache in case of updates
    if (window.performance && window.performance.navigation.type === 1) {
      // Page was refreshed, clear cache for dynamic content
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            if (name.includes("dynamic-content")) {
              caches.delete(name);
            }
          });
        });
      }
    }

    // Add event listener for online status changes
    window.addEventListener("online", handleOnlineStatusChange);
    window.addEventListener("offline", handleOnlineStatusChange);

    return () => {
      window.removeEventListener("online", handleOnlineStatusChange);
      window.removeEventListener("offline", handleOnlineStatusChange);
    };
  }, []);

  const handleOnlineStatusChange = () => {
    if (navigator.onLine) {
      // When coming back online, reload page to get fresh content
      window.location.reload();
    }
  };

  // Theo dõi trạng thái người dùng và cập nhật số lượng người dùng ẩn danh
  useEffect(() => {
    // Sử dụng localStorage để theo dõi trạng thái visitor thay vì Firestore
    // để tránh quá nhiều truy vấn
    const handleUserPresence = async () => {
      try {
        // Nếu không có user (chưa đăng nhập), đánh dấu là khách
        if (!user) {
          if (!isAnonymousVisitor) {
            // Thử tăng số người dùng ẩn danh nhưng có catch để tránh lỗi
            try {
              // Gửi request với tốc độ giới hạn
              if (Math.random() < 0.1) {
                // Chỉ gửi request ~10% thời gian
                await incrementAnonymousVisitor();
              }
            } catch (e) {}

            // Lưu trạng thái vào localStorage
            localStorage.setItem("isAnonymousVisitor", "true");
            setIsAnonymousVisitor(true);
          }

          // Xử lý khi khách rời trang
          const handleBeforeUnload = () => {
            try {
              // Giảm số visitor trong trường hợp unload
              if (Math.random() < 0.1) {
                // Giới hạn số lượng request
                decrementAnonymousVisitor().catch((e) => {
                  // Bỏ qua lỗi
                });
              }
              localStorage.removeItem("isAnonymousVisitor");
            } catch (e) {
              // Bỏ qua lỗi
            }
          };

          window.addEventListener("beforeunload", handleBeforeUnload);

          return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);

            // Khi component unmount mà vẫn là visitor
            if (isAnonymousVisitor) {
              try {
                // Thử giảm số lượng visitor với tỷ lệ thấp
                if (Math.random() < 0.1) {
                  decrementAnonymousVisitor().catch((e) => {
                    // Bỏ qua lỗi
                  });
                }
                localStorage.removeItem("isAnonymousVisitor");
              } catch (e) {
                // Bỏ qua lỗi
              }
            }
          };
        }
        // Có user (đã đăng nhập)
        else {
          // Đánh dấu user online
          setUserOnline(user.uid);

          // Nếu trước đó là visitor, giảm số lượng
          if (isAnonymousVisitor) {
            try {
              if (Math.random() < 0.1) {
                // Giới hạn số lượng request
                await decrementAnonymousVisitor();
              }
            } catch (e) {}

            localStorage.removeItem("isAnonymousVisitor");
            setIsAnonymousVisitor(false);
          }

          const handleBeforeUnload = () => {
            setUserOffline(user.uid);
          };

          window.addEventListener("beforeunload", handleBeforeUnload);

          return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            setUserOffline(user.uid);
          };
        }
      } catch (error) {
        console.error("Lỗi khi xử lý trạng thái người dùng:", error);
      }
    };

    handleUserPresence();
  }, [user]);

  useEffect(() => {
    // Xóa cache khi ứng dụng khởi động
    const initApp = async () => {
      // Kiểm tra nếu có tham số force-update trong URL
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.has("force-update")) {
        await clearApplicationCache();
        // Xóa tham số force-update từ URL
        searchParams.delete("force-update");
        window.history.replaceState(
          {},
          "",
          location.pathname +
            (searchParams.toString() ? `?${searchParams.toString()}` : "") +
            location.hash
        );
      }
    };

    initApp();
  }, [location.search, location.pathname, location.hash]);

  // NOTE: Question cache clearing is handled directly by sidebar click handlers
  // to avoid running on every route change. See `Sidebar.jsx` for the logic.

  useEffect(() => {
    // Chuyển hướng domain nếu cần
    if (redirectToPrimaryDomain()) {
      return; // Nếu đã chuyển hướng, không cần thực hiện các bước sau
    }

    // Xóa cache khi có tham số force-update
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("force-update")) {
      clearAppCache().then(() => {
        // Xóa tham số force-update và tải lại trang
        searchParams.delete("force-update");
        window.history.replaceState(
          {},
          "",
          location.pathname +
            (searchParams.toString() ? `?${searchParams.toString()}` : "") +
            location.hash
        );
        window.location.reload();
      });
    }

    // Khởi tạo hệ thống kiểm tra cập nhật
    initUpdateChecker();
  }, []);

  useEffect(() => {
    // Kiểm tra các tham số trong URL
    const params = new URLSearchParams(location.search);

    // Nếu có tham số clear-cache, thực hiện xóa cache và làm mới
    if (params.has("clear-cache")) {
      forceRefresh().then(() => {
        // Xóa tham số này khỏi URL
        params.delete("clear-cache");
        const newUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);
      });
    } else {
      // Kiểm tra cập nhật thông thường
      checkAndHandleUpdate();
    }
  }, [location.search]);

  // Kiểm tra phiên bản và xóa cache khi cần
  useEffect(() => {
    // Hàm kiểm tra version mới
    const checkForNewVersion = async () => {
      try {
        // Thêm timestamp để phá vỡ cache
        const timestamp = Date.now();
        const response = await fetch(`/version.json?t=${timestamp}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!response.ok) {
          throw new Error(
            `Không thể tải file version.json: ${response.status}`
          );
        }

        const data = await response.json();
        const storedVersion = localStorage.getItem("app_version");

        // Nếu không có phiên bản lưu trữ hoặc phiên bản mới khác với phiên bản lưu trữ
        if (!storedVersion || storedVersion !== data.version) {
          localStorage.setItem("app_version", data.version);

          // Xóa cache nếu trình duyệt hỗ trợ
          if ("caches" in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
          }

          // Tải lại trang nếu _fresh không phải tham số trong URL
          if (!location.search.includes("_fresh")) {
            window.location.reload(true);
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra phiên bản:", error);
      }
    };

    // Kiểm tra version ngay khi component được mount
    checkForNewVersion();

    // Kiểm tra định kỳ version mới (mỗi 5 phút)
    const intervalId = setInterval(checkForNewVersion, 5 * 60 * 1000);

    // Kiểm tra khi người dùng quay lại tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForNewVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [location.search]);

  return (
    <ThemeProvider>
      <FirebaseConnectionProvider>
        <UserRoleProvider>
          <AppSettingsProvider>
          <SidebarProvider>
            <FirebaseConnectionGuard>
              <AdSenseComponent />
              <div className={`App ${darkMode ? "dark" : ""}`}>
                <ToastContainer position="top-right" autoClose={3000} />
                <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<ConditionalHomeRoute />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/students" element={<ProtectedStudentRoute />} />

                {/* Sử dụng các component bảo vệ riêng lẻ */}
                <Route
                  path="/admin/exam-sessions"
                  element={
                    <ProtectedAdminRoute>
                      <ExamSessionManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedAdminRoute>
                      <AdminUserManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/categories"
                  element={
                    <ProtectedAdminRoute>
                      <CategoryManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/student-infor"
                  element={
                    <ProtectedAdminRoute>
                      <StudentInforManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/documents"
                  element={
                    <ProtectedAdminRoute>
                      <DocumentManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/questions"
                  element={
                    <ProtectedAdminRoute>
                      <QuestionManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/calendar-notes"
                  element={
                    <ProtectedAdminRoute>
                      <CalendarNoteManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/room-infor"
                  element={
                    <ProtectedAdminRoute>
                      <RoomInforManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/premium-users"
                  element={
                    <ProtectedAdminRoute>
                      <PremiumUserManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/footer"
                  element={
                    <ProtectedAdminRoute>
                      <FooterManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  }
                />
                {/* Trang upload ảnh admin
                <Route
                  path="/admin/image-uploader"
                  element={
                    <ProtectedAdminRoute>
                      <AdminImageUploader />
                    </ProtectedAdminRoute>
                  }
                /> */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  }
                />

                <Route path="/pricing" element={<Pricing />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route
                  path="/admin/pricing-content-management"
                  element={
                    <ProtectedAdminRoute>
                      <PricingContentManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/:categorySlug/:documentSlug"
                  element={<DocumentView />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CalendarReminder />
            <ZaloContact />
          </div>
        </FirebaseConnectionGuard>
        </SidebarProvider>
          </AppSettingsProvider>
      </UserRoleProvider>
    </FirebaseConnectionProvider>
    </ThemeProvider>
  );
}

export default App;
