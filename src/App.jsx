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
import LoadingSpinner from "./components/LoadingSpinner";
import DocumentView from "./pages/DocumentView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { UserRoleProvider } from "./context/UserRoleContext";
import { SidebarProvider } from "./context/SidebarContext";
import AdminUserManagement from "./pages/admin/user/AdminUserManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import DocumentManagement from "./pages/admin/DocumentManagement";
import QuestionManagement from "./pages/admin/question/QuestionManagement";
import HomePage from "./pages/HomePage";
import StudentPage from "./pages/StudentPage";
import Pricing from "./pages/Pricing";
import EditorPage from "./pages/EditorPage";
import StudentInforManagement from "./pages/admin/student_infor/StudentInforManagement";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase/firebase";
import { useUserRole } from "./context/UserRoleContext";
import ZaloContact from "./components/ZaloContact";
import CalendarReminder from "./components/CalendarReminder";
import AdSenseComponent from "./components/RealAdSenseComponent";
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
import { clearApplicationCache } from "./utils/domainSync";
import {
  redirectToPrimaryDomain,
  initUpdateChecker,
  clearAppCache,
} from "./utils/cacheControl";
import { checkAndHandleUpdate, forceRefresh } from "./utils/cacheManager";
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
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/login", { state: { from: location.pathname } });
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, loading, isAdmin, roleLoading, navigate, location]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return user && isAdmin ? children : null;
};

// Xử lý trang chủ cho admin với cải tiến lưu đường dẫn
const ConditionalHomeRoute = () => {
  const [user] = useAuthState(auth);
  const { isAdmin, loading } = useUserRole();
  const location = useLocation();

  // Kiểm tra cả state và localStorage để phục hồi đường dẫn admin
  const isReturnFromAdmin =
    location.state &&
    location.state.from &&
    location.state.from.startsWith("/admin");
  const lastAdminRoute = localStorage.getItem("lastAdminRoute");

  if (loading) {
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

// Các component được bảo vệ riêng lẻ
const AdminUserManagementPage = () => (
  <ProtectedAdminRoute>
    <AdminUserManagement />
  </ProtectedAdminRoute>
);

const AdminCategoryManagementPage = () => (
  <ProtectedAdminRoute>
    <CategoryManagement />
  </ProtectedAdminRoute>
);

const AdminDocumentManagementPage = () => (
  <ProtectedAdminRoute>
    <DocumentManagement />
  </ProtectedAdminRoute>
);

const AdminQuestionManagementPage = () => (
  <ProtectedAdminRoute>
    <QuestionManagement />
  </ProtectedAdminRoute>
);

const AdminDashboardPage = () => (
  <ProtectedAdminRoute>
    <AdminDashboard />
  </ProtectedAdminRoute>
);

const AdminStudentInforManagementPage = () => (
  <ProtectedAdminRoute>
    <StudentInforManagement />
  </ProtectedAdminRoute>
);

const AdminCalendarNoteManagementPage = () => (
  <ProtectedAdminRoute>
    <CalendarNoteManagement />
  </ProtectedAdminRoute>
);

const PremiumUserManagementPage = () => (
  <ProtectedAdminRoute>
    <PremiumUserManagement />
  </ProtectedAdminRoute>
);

const FooterManagementPage = () => (
  <ProtectedAdminRoute>
    <FooterManagement />
  </ProtectedAdminRoute>
);

// Trang upload ảnh admin
//import AdminImageUploader from "./pages/admin/AdminImageUploader";
// const AdminImageUploaderPage = () => (
//   <ProtectedAdminRoute>
//     <AdminImageUploader />
//   </ProtectedAdminRoute>
// );

const PricingContentManagementPage = () => (
  <ProtectedAdminRoute>
    <PricingContentManagement />
  </ProtectedAdminRoute>
);

const ExamQuestionManagementPage = () => (
  <ProtectedAdminRoute>
    <ExamQuestionManagement />
  </ProtectedAdminRoute>
);

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

    // Hiển thị thông tin phiên bản trong console (để debug)
    console.log(`App version: ${window.APP_VERSION || "unknown"}`);
    console.log(
      `Build time: ${
        new Date(parseInt(window.BUILD_TIMESTAMP || "0")).toLocaleString() ||
        "unknown"
      }`
    );
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
          console.log(`Phát hiện phiên bản mới: ${data.version}`);
          localStorage.setItem("app_version", data.version);

          // Xóa cache nếu trình duyệt hỗ trợ
          if ("caches" in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
            console.log("Đã xóa tất cả cache");
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
      <UserRoleProvider>
        <SidebarProvider>
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
                <Route path="/students" element={<StudentPage />} />

                {/* Sử dụng các component bảo vệ riêng lẻ */}
                <Route
                  path="/admin/users"
                  element={<AdminUserManagementPage />}
                />
                <Route
                  path="/admin/categories"
                  element={<AdminCategoryManagementPage />}
                />
                <Route
                  path="/admin/student-infor"
                  element={<AdminStudentInforManagementPage />}
                />
                <Route
                  path="/admin/documents"
                  element={<AdminDocumentManagementPage />}
                />
                <Route
                  path="/admin/questions"
                  element={<AdminQuestionManagementPage />}
                />
                <Route
                  path="/admin/calendar-notes"
                  element={<AdminCalendarNoteManagementPage />}
                />
                <Route
                  path="/admin/premium-users"
                  element={<PremiumUserManagementPage />}
                />
                <Route
                  path="/admin/footer"
                  element={<FooterManagementPage />}
                />
                <Route
                  path="/admin/dashboard"
                  element={<AdminDashboardPage />}
                />
                {/* Trang upload ảnh admin
                <Route
                  path="/admin/image-uploader"
                  element={<AdminImageUploaderPage />}
                /> */}
                <Route path="/admin" element={<AdminDashboardPage />} />

                <Route path="/pricing" element={<Pricing />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route
                  path="/admin/pricing-content-management"
                  element={<PricingContentManagementPage />}
                />
                <Route
                  path="/:categorySlug/:documentSlug"
                  element={<DocumentView />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <CalendarReminder />
            <ZaloContact />
          </div>
        </SidebarProvider>
      </UserRoleProvider>
    </ThemeProvider>
  );
}

export default App;
