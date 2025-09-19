import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MemoizedMainContent from "../components/MemoizedMainContent";
import { DocumentMobileHeader } from "../components/MobileHeader";
import { COLLECTIONS } from "../firebase/firestoreService";
import { useTheme, THEME_COLORS } from "../context/ThemeContext";
import { auth } from "../firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import * as XLSX from "xlsx";
import UserHeader from "../components/UserHeader";
import UserManagementContent from "../components/admin/UserManagementContent";
import { useUserRole } from "../context/UserRoleContext";
import { registerScreenshotDetection } from "../utils/screenshotDetection";
import ThemeColorPicker from "../components/ThemeColorPicker";
import Footer from "../components/Footer";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { checkExcelDownloadPermission } from "../utils/downloadPermissions";
import { checkVipDocumentAccess } from "../firebase/documentService";

const noCopyStyles = {
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
  WebkitTouchCallout: "none",
};

function DocumentView() {
  const params = useParams();
  const { categorySlug, documentSlug } = params;
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, themeColor } = useTheme();
  const [user] = useAuthState(auth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isAdmin, isPuser } = useUserRole();
  const mountedRef = useRef(true);

  // State
  const [viewState, setViewState] = useState({
    limitedView: false,
    viewLimitExceeded: false,
    viewsRemaining: 5,
  });
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [vipAccessResult, setVipAccessResult] = useState(null);
  const [userDataCache, setUserDataCache] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [documents, setDocuments] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMain, setOpenMain] = useState(-1);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [excelPermission, setExcelPermission] = useState(null);
  const [permissionLoading, setPermissionLoading] = useState(true);
  // Helper Functions
  const preventCopy = (e) => {
    e.preventDefault();
    return false;
  };

  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

  // Reload user data function - not memoized to avoid dependency issues
  const reloadUserData = async () => {
    if (!user?.uid) return null;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        const fullUserData = {
          ...user,
          ...userData,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || userData.displayName,
          isLoggedIn: true,
        };

        setUserDataCache(fullUserData);
        return fullUserData;
      } else {
        console.warn("⚠️ User document not found in Firestore");
        setUserDataCache(user);
        return user;
      }
    } catch (error) {
      console.error("❌ Error reloading user data:", error);
      return user;
    }
  };

  const checkIsPremiumUser = useCallback((user) => {
    if (!user) return false;
    return user.role === "premium" || user.role === "puser" || user.isPremium === true;
  }, []);

  const fetchUserSubscriptionType = useCallback(async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      return userDoc.exists() ? userDoc.data().subscriptionType || "free" : "free";
    } catch (error) {
      console.error("❌ Error fetching subscription type:", error);
      return "free";
    }
  }, []);

  const getThemeBackgroundColor = () => {
    if (isDarkMode) return "bg-gray-900";
    switch (themeColor) {
      case THEME_COLORS.BLUE:
        return "bg-blue-50";
      case THEME_COLORS.RED:
        return "bg-red-50";
      case THEME_COLORS.PURPLE:
        return "bg-purple-50";
      case THEME_COLORS.GREEN:
        return "bg-green-50";
      case THEME_COLORS.YELLOW:
        return "bg-yellow-50";
      case THEME_COLORS.BROWN:
        return "bg-amber-50";
      case THEME_COLORS.BLACK:
        return "bg-gray-100";
      case THEME_COLORS.WHITE:
        return "bg-gray-50";
      default:
        return "bg-green-50";
    }
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Memoized Computations
  const filteredQuestions = useMemo(() => {
    return questions.filter(
      (q) =>
        (q.question && q.question.toLowerCase().includes(search.toLowerCase())) ||
        (q.answer && q.answer.toLowerCase().includes(search.toLowerCase()))
    );
  }, [questions, search]);

  const excelButtonState = useMemo(() => {
    if (permissionLoading || excelPermission === null) {
      return { show: false, enabled: false, reason: "Đang kiểm tra quyền truy cập..." };
    }
    if (!userDataCache) {
      return { show: false, enabled: false, reason: "Vui lòng đăng nhập" };
    }
    if (userDataCache?.isExcelEnabled === false) {
      return { show: false, enabled: false, reason: "Quyền tải Excel đã bị tắt" };
    }
    const hasSubscriptionOrAdmin =
      userDataCache?.role === "admin" ||
      userDataCache?.subscriptionType === "full" ||
      userDataCache?.subscriptionType === "partial" ||
      userDataCache?.role === "puser";

    if (!hasSubscriptionOrAdmin) {
      return { show: false, enabled: false, reason: "Tính năng dành cho tài khoản Premium" };
    }

    const downloadPercentage = excelPermission?.percentage || 100;
    const reasonWithPercentage = excelPermission.allowed
      ? `${excelPermission.reason} (Tải ${downloadPercentage}% câu hỏi)`
      : excelPermission.reason;

    return {
      show: true,
      enabled: excelPermission.allowed,
      reason: reasonWithPercentage,
      percentage: downloadPercentage,
    };
  }, [userDataCache, permissionLoading, excelPermission]);
  // Load User Data - Only depend on user.uid to avoid infinite loops
  useEffect(() => {
    let isCancelled = false;
    
    const loadUserData = async () => {
      if (!user?.uid) {
        if (!isCancelled) setUserDataCache(null);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          const fullUserData = {
            ...user,
            ...userData,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userData.displayName,
            isLoggedIn: true,
          };

          if (!isCancelled) setUserDataCache(fullUserData);
        } else {
          console.warn("⚠️ User document not found in Firestore");
          if (!isCancelled) setUserDataCache(user);
        }
      } catch (error) {
        console.error("❌ Error loading user data:", error);
        if (!isCancelled) setUserDataCache(user);
      }
    };

    loadUserData();
    
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]); // Only depend on user.uid
  // Check Excel Permission - Only when userDataCache or categories change
  useEffect(() => {
    let isCancelled = false;
    
    const checkPermission = async () => {
      if (!userDataCache || !categories?.length) {
        if (!isCancelled) setPermissionLoading(true);
        return;
      }
      
      if (!isCancelled) setPermissionLoading(true);
      
      try {
        if (userDataCache?.isExcelEnabled === false) {
          if (!isCancelled) {
            setExcelPermission({
              allowed: false,
              reason: "Quyền tải Excel đã bị tắt cho tài khoản này",
            });
            setPermissionLoading(false);
          }
          return;
        }
        
        if (userDataCache?.role === "admin" || userDataCache?.subscriptionType === "full") {
          if (!isCancelled) {
            setExcelPermission({
              allowed: true,
              reason: userDataCache?.role === "admin" ? "Admin có quyền tải Excel" : "User full subscription có quyền tải Excel",
              percentage: userDataCache?.excelPercentage || 100,
            });
            setPermissionLoading(false);
          }
          return;
        }
        
        const result = await checkExcelDownloadPermission(userDataCache, categories);
        if (result.allowed && userDataCache?.excelPercentage !== undefined) {
          result.percentage = userDataCache.excelPercentage;
        }
        
        if (!isCancelled) {
          setExcelPermission(result);
          setPermissionLoading(false);
        }
      } catch (error) {
        console.error("❌ Error checking Excel permission:", error);
        if (!isCancelled) {
          setExcelPermission({ allowed: false, reason: "Lỗi kiểm tra quyền truy cập" });
          setPermissionLoading(false);
        }
      }
    };
    
    checkPermission();
    
    return () => {
      isCancelled = true;
    };
  }, [userDataCache?.uid, categories]);// Main Data Loading - Simplified dependencies to prevent excessive re-renders
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const documentViewOptimizer = await import("../utils/documentViewOptimizer");
        const startTime = performance.now();

        const [categoriesDataRaw] = await Promise.all([
          documentViewOptimizer.getCachedCategories(),
          idleCallback(() => {
            import("../components/ThemeColorPicker");
            import("../utils/excelUploader");
          }),
        ]);

        // Filter out adminOnly categories for non-admin users
        const categoriesData = isAdmin
          ? categoriesDataRaw
          : (categoriesDataRaw || []).filter((cat) => !cat.adminOnly);

        if (isCancelled) return;

        if (!categoriesData?.length) throw new Error("Không thể tải danh mục");
        setCategories(categoriesData);

        const category = categoriesData.find((cat) => {
          if (!cat?.title) return false;
          const slug = cat.title
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^\w-]+/g, "")
            .replace(/--+/g, "_");
          return slug === categorySlug;
        });

        if (!category) throw new Error("Không tìm thấy danh mục này");
        if (isCancelled) return;

        setSelectedCategory(category);
        setOpenMain(categoriesData.indexOf(category));

        const docsData = await documentViewOptimizer.getCachedDocumentsByCategory(category.id);
        if (!docsData?.length) throw new Error("Danh mục này không có tài liệu");

        if (isCancelled) return;
        setDocuments({ [category.id]: docsData });

        const doc = docsData.find((d) => d?.slug === documentSlug);
        if (!doc) throw new Error("Không tìm thấy tài liệu");

        const docWithCategory = { ...doc, categoryId: category.id };
        if (isCancelled) return;
        setSelectedDocument(docWithCategory);        // ✅ Sử dụng userDataCache hoặc user, ưu tiên userDataCache
        const currentUser = userDataCache || user;
        const accessResult = checkVipDocumentAccess(currentUser, docWithCategory);
        if (isCancelled) return;
        setVipAccessResult(accessResult);


        if (doc.isVip && !accessResult.hasAccess) {
          if (!isCancelled) {
            setQuestions([]);
            setViewState({ limitedView: false, viewLimitExceeded: false, viewsRemaining: 0 });
          }
        } else {
          const result = await documentViewOptimizer.loadDocumentWithParallelQueries(
            category.id,
            doc.id,
            isAdmin,
            isPuser,
            currentUser,
            doc
          );

          if (!isCancelled) {
            if (result.vipAccessDenied) {
              setQuestions([]);
              setViewState({ limitedView: false, viewLimitExceeded: false, viewsRemaining: 0 });
              // ✅ Cập nhật vipAccessResult để hiển thị đúng thông báo VIP
              setVipAccessResult({ 
                hasAccess: false, 
                reason: result.vipAccessReason || "Tài liệu VIP này không có trong gói trả phí của bạn." 
              });
            } else {
              setQuestions(result.questions || []);
              setViewState({
                limitedView: result.limitedView || false,
                viewLimitExceeded: result.viewLimitExceeded || false,
                viewsRemaining: result.viewsRemaining || 0,
              });
            }
          }
        }

        console.log(`⏱ fetchData completed in ${performance.now() - startTime}ms`);
      } catch (err) {
        console.error("❌ fetchData error:", err);
        if (!isCancelled) setError(err.message || "Không thể tải dữ liệu.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    // Only fetch if we have the required URL params
    if (categorySlug && documentSlug) {
      fetchData();
    }

    return () => {
      isCancelled = true;
    };
  }, [categorySlug, documentSlug, userDataCache?.uid, isAdmin]);

  // Other Effects
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isAdmin && !isPuser) {
      const handleContextMenu = (e) => e.preventDefault();
      const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.keyCode === 67)) {
          e.preventDefault();
        }
      };
      const handleCopy = (e) => e.preventDefault();

      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("copy", handleCopy);

      return () => {
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("copy", handleCopy);
      };
    }
  }, [isAdmin, isPuser]);

  useEffect(() => {
    if (!isAdmin && !isPuser) {
      const unregister = registerScreenshotDetection(() => {
        setShowScreenshotWarning(true);
        setTimeout(() => setShowScreenshotWarning(false), 3000);
      }, true);
      return unregister;
    }
  }, [isAdmin, isPuser]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      root.style.setProperty("--theme-bg-color", "#1a202c");
      root.style.setProperty("--theme-sidebar-bg", "#1f2937");
      root.style.setProperty("--theme-header-bg", "#1f2937");
    } else {
      root.classList.remove("dark");
      switch (themeColor) {
        case THEME_COLORS.BLUE:
          root.style.setProperty("--theme-bg-color", "#EFF6FF");
          root.style.setProperty("--theme-sidebar-bg", "#2563EB");
          root.style.setProperty("--theme-header-bg", "#2563EB");
          break;
        case THEME_COLORS.RED:
          root.style.setProperty("--theme-bg-color", "#FEF2F2");
          root.style.setProperty("--theme-sidebar-bg", "#DC2626");
          root.style.setProperty("--theme-header-bg", "#DC2626");
          break;
        case THEME_COLORS.GREEN:
        default:
          root.style.setProperty("--theme-bg-color", "#ECFDF5");
          root.style.setProperty("--theme-sidebar-bg", "#0c4a2e");
          root.style.setProperty("--theme-header-bg", "#0c4a2e");
          break;
      }
    }
  }, [isDarkMode, themeColor]);  // Event Handlers
  const reloadQuestions = async () => {
    if (!selectedDocument || !selectedCategory) return;

    try {
      setLoading(true);
      setError(null);

      const documentViewOptimizer = await import("../utils/documentViewOptimizer");
      documentViewOptimizer.clearQuestionsCache(selectedDocument.id);

      const currentUser = userDataCache || user;
      const accessResult = checkVipDocumentAccess(currentUser, selectedDocument);
      setVipAccessResult(accessResult);

      if (selectedDocument.isVip && !accessResult.hasAccess) {
        setQuestions([]);
        setViewState({ limitedView: false, viewLimitExceeded: false, viewsRemaining: 0 });
      } else {
        const result = await documentViewOptimizer.loadDocumentWithParallelQueries(
          selectedCategory.id,
          selectedDocument.id,
          isAdmin,
          isPuser,
          currentUser,
          selectedDocument
        );

        if (result.vipAccessDenied) {
          console.log("🚫 VIP access denied in reload result");
          setQuestions([]);
          setViewState({ limitedView: false, viewLimitExceeded: false, viewsRemaining: 0 });
          // ✅ Cập nhật vipAccessResult để hiển thị đúng thông báo VIP
          setVipAccessResult({ 
            hasAccess: false, 
            reason: result.vipAccessReason || "Tài liệu VIP này không có trong gói trả phí của bạn." 
          });
        } else {
          setQuestions(result.questions || []);
          setViewState({
            limitedView: result.limitedView || false,
            viewLimitExceeded: result.viewLimitExceeded || false,
            viewsRemaining: result.viewsRemaining || 0,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error reloading questions:", error);
      setError("Không thể tải lại câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      if (!userDataCache || !categories?.length) {
        alert("Vui lòng đăng nhập và đảm bảo dữ liệu đã được tải.");
        return;
      }
      if (!excelPermission?.allowed) {
        alert(excelPermission.reason);
        return;
      }

      let dataToExport = filteredQuestions;
      const downloadPercentage = excelPermission.percentage || 100;

      if (downloadPercentage < 100) {
        const limitedCount = Math.floor(filteredQuestions.length * (downloadPercentage / 100));
        dataToExport = filteredQuestions.slice(0, limitedCount);
        if (limitedCount < filteredQuestions.length) {
          alert(`Tài khoản được tải ${downloadPercentage}% câu hỏi (${limitedCount}/${filteredQuestions.length} câu).`);
        }
      }

      const excelData = dataToExport.map((q, index) => ({
        STT: index + 1,
        "Câu hỏi": q.question,
        "Trả lời": q.answer,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const documentTitle = selectedDocument?.title || "Document";
      XLSX.utils.book_append_sheet(workbook, worksheet, documentTitle.substring(0, 30));

      const percentageSuffix = downloadPercentage < 100 ? `_${downloadPercentage}percent` : "";
      const fileName = `${selectedCategory?.title || "Category"} - ${documentTitle}${percentageSuffix}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("❌ Excel export error:", error);
      alert("Có lỗi xảy ra khi tạo file Excel.");
    }
  };

  // Early Return for Error
  if (error) {
    return (
      <div
        className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"} flex items-center justify-center`}
      >
        <div className="text-center">
          <div
            className={`${
              isDarkMode ? "bg-red-900/30 border-red-700" : "bg-red-100 border-red-400"
            } border text-red-500 px-4 py-3 rounded relative`}
            role="alert"
          >
            <strong className="font-bold">Lỗi!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
          <div className="mt-4 flex flex-col md:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Tải lại trang
            </button>
            <Link to="/" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-center">
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div
      className="theme-consistent-wrapper"
      style={!isAdmin && !isPuser ? noCopyStyles : {}}
      onCopy={!isAdmin && !isPuser ? preventCopy : undefined}
      onCut={!isAdmin && !isPuser ? preventCopy : undefined}
      onDragStart={!isAdmin && !isPuser ? preventCopy : undefined}
    >
      {showScreenshotWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 pointer-events-none">
          <div
            className={`p-6 rounded-lg shadow-xl max-w-md mx-4 text-center ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="mb-4 flex justify-center">
              <svg
                className="w-16 h-16 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
              Cảnh báo bảo mật!
            </h3>
            <p className={`${isDarkMode ? "text-gray-300" : "text-gray-700"} mb-2`}>
              Chụp ảnh màn hình đã bị phát hiện và bị cấm!
            </p>
          </div>
        </div>
      )}

      {windowWidth < 770 && (
        <DocumentMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
          selectedCategory={selectedCategory}
          selectedDocument={selectedDocument}
        />
      )}

      <div className="flex min-h-screen w-full">
        <div
          className={`theme-sidebar ${
            windowWidth < 770
              ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : "sticky top-0 h-screen z-10"
          }`}
        >
          <Sidebar
            sidebarData={loading ? [] : categories}
            documents={documents}
            openMain={openMain}
            setOpenMain={setOpenMain}
            selectedCategory={selectedCategory}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            setSearch={setSearch}
            setDocuments={setDocuments}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            hideDocumentTree={categorySlug === "admin" && documentSlug === "users"}
          />
        </div>

        {isSidebarOpen && windowWidth < 770 && (
          <div className="fixed inset-0 z-10 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
        )}

        <div className="theme-content-container flex-1 shadow-sm flex flex-col">
          {windowWidth >= 770 && (
            <div className="w-full">
              <UserHeader
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                title={
                  selectedCategory?.title
                    ? `${selectedCategory.title} - ${selectedDocument?.title}`
                    : "Tài liệu NEU"
                }
              />
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
                {loading
                  ? ""
                  : `Hiển thị từ 1 đến ${filteredQuestions.length} trong tổng số ${filteredQuestions.length} câu hỏi`}
              </p>
              <div className="flex gap-2">
                {excelButtonState.show && (
                  <button
                    onClick={exportToExcel}
                    disabled={loading || !excelButtonState.enabled || permissionLoading}
                    className={`flex items-center gap-1 px-3 py-2 rounded-md text-white transition-colors ${
                      !excelButtonState.enabled || permissionLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    title={
                      loading
                        ? "Đang tải dữ liệu..."
                        : permissionLoading
                        ? "Đang kiểm tra quyền truy cập..."
                        : excelButtonState.reason
                    }
                  >
                    {permissionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    )}
                    <span>
                      Excel
                      {excelButtonState.enabled && excelButtonState.percentage < 100 && (
                        <span className="ml-1 text-xs">({excelButtonState.percentage}%)</span>
                      )}
                    </span>
                  </button>
                )}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm câu hỏi"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={loading}
                    className={`pl-3 pr-10 py-2 border rounded-md w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-800"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 absolute right-3 top-2.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {search && filteredQuestions.length === 0 && viewState.limitedView && (
              <div
                className={`mt-4 p-4 rounded-lg ${isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} text-center shadow-sm`}
              >
                <p className="mb-2">Không tìm thấy kết quả phù hợp với tìm kiếm của bạn.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Lưu ý: Bạn đang xem phiên bản giới hạn. Kết quả tìm kiếm có thể nằm trong phần nội dung chỉ dành cho tài khoản premium.
                </p>
              </div>
            )}            {!loading && viewState.limitedView && (
              <div
                className={`mx-auto max-w-4xl px-4 mb-6 ${
                  isDarkMode ? "bg-yellow-900/30 border border-yellow-700" : "bg-yellow-50 border border-yellow-200"
                } rounded-lg py-3`}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 mr-2 ${isDarkMode ? "text-yellow-500" : "text-yellow-400"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className={`text-sm ${isDarkMode ? "text-yellow-200" : "text-yellow-700"}`}>
                    {viewState.viewLimitExceeded ? (
                      user ? (
                        <>
                          Bạn đã sử dụng hết 5 lượt xem tài liệu này hôm nay.
                          <a
                            href="/pricing"
                            className={`font-medium underline ml-1 ${
                              isDarkMode ? "text-yellow-300 hover:text-yellow-400" : "text-yellow-800 hover:text-yellow-900"
                            }`}
                          >
                            Nâng cấp tài khoản Premium
                          </a>{" "}
                          để có quyền truy cập không giới hạn.
                        </>
                      ) : (
                        <>
                          Bạn đã sử dụng hết 5 lượt xem tài liệu này hôm nay.
                          <Link
                            to="/login"
                            className={`font-medium underline ml-1 ${
                              isDarkMode ? "text-yellow-300 hover:text-yellow-400" : "text-yellow-800 hover:text-yellow-900"
                            }`}
                          >
                            Đăng nhập
                          </Link>{" "}
                          hoặc
                          <Link
                            to="/register"
                            className={`font-medium underline mx-1 ${
                              isDarkMode ? "text-yellow-300 hover:text-yellow-400" : "text-yellow-800 hover:text-yellow-900"
                            }`}
                          >
                            đăng ký
                          </Link>
                          để có quyền truy cập không giới hạn.
                        </>
                      )
                    ) : user ? (
                      <>
                        Bạn đang xem bản giới hạn (50% câu hỏi). Bạn còn {viewState.viewsRemaining} lượt xem tài liệu này hôm nay.
                        <a
                          href="/pricing"
                          className={`font-medium underline ml-1 ${
                            isDarkMode ? "text-yellow-300 hover:text-yellow-400" : "text-yellow-800 hover:text-yellow-900"
                          }`}
                        >
                          Nâng cấp tài khoản
                        </a>{" "}
                        để truy cập đầy đủ.
                      </>
                    ) : (
                      <>
                        Bạn đang xem bản giới hạn (50% câu hỏi). Bạn còn {viewState.viewsRemaining} lượt xem tài liệu này hôm nay.
                        <Link
                          to="/login"
                          className={`font-medium underline ml-1 ${
                            isDarkMode ? "text-yellow-300 hover:text-yellow-400" : "text-yellow-800 hover:text-yellow-900"
                          }`}
                        >
                          Đăng nhập
                        </Link>{" "}
                        hoặc
                        <Link
                          to="/register"
                          className={`font-medium underline mx-1 ${
                            isDarkMode ? "text-yellow-300 hover:text-yellow-400" : "text-yellow-800 hover:text-yellow-900"
                          }`}
                        >
                          đăng ký
                        </Link>
                        để truy cập đầy đủ.
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="mx-auto max-w-4xl px-4 py-8 rounded-lg">
                <div
                  className={`border rounded-lg overflow-hidden shadow-sm p-6 ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mb-4" />
                    <p className={`${isDarkMode ? "text-gray-300" : "text-gray-700"} text-center`}>
                      Đang tải dữ liệu tài liệu...
                    </p>
                    <p className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm text-center mt-2`}>
                      Chúng tôi đang chuẩn bị nội dung theo yêu cầu của bạn.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {selectedDocument?.isVip && vipAccessResult && !vipAccessResult.hasAccess ? (
                  <div className="mx-auto max-w-4xl px-4 py-12 text-center rounded-lg">
                    <div className={`p-8 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                      <div className="mb-4 flex justify-center">
                        <svg className="w-16 h-16 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      </div>
                      <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                        🌟 Nội dung VIP
                      </h2>
                      <p className={`mb-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {vipAccessResult.reason}
                      </p>
                      <div className="flex flex-col md:flex-row gap-3 justify-center">
                        {user ? (
                          <a
                            href="/pricing"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-md text-center transition-colors font-medium"
                          >
                            Nâng cấp tài khoản Premium
                          </a>
                        ) : (
                          <>
                            <Link
                              to="/login"
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-center transition-colors font-medium"
                            >
                              Đăng nhập
                            </Link>
                            <Link
                              to="/register"
                              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md text-center transition-colors font-medium"
                            >
                              Đăng ký
                            </Link>
                          </>
                        )}
                        <Link
                          to="/"
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md text-center transition-colors font-medium"
                        >
                          Quay về trang chủ
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {!loading && filteredQuestions.length === 0 && !viewState.viewLimitExceeded && (
                      <div className="mx-auto max-w-4xl px-4 py-8 rounded-lg">
                        <div
                          className={`border rounded-lg overflow-hidden shadow-sm p-8 text-center ${
                            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <h3 className={`text-lg font-medium ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                            Không có nội dung
                          </h3>
                          <p className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Tài liệu này hiện chưa có câu hỏi hoặc đáp án nào.
                          </p>
                          <div className="mt-6 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3 justify-center">
                            <button
                              onClick={reloadQuestions}
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Tải lại
                            </button>
                            <Link
                              to="/"
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Quay về trang chủ
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                    {viewState.viewLimitExceeded && !isPuser && !isAdmin ? (
                      <div className="mx-auto max-w-4xl px-4 py-12 text-center rounded-lg">
                        <div className={`p-8 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                          <div className="mb-4 flex justify-center">
                            <svg
                              className={`w-16 h-16 ${isDarkMode ? "text-yellow-500" : "text-yellow-400"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                            Giới hạn lượt xem đã hết
                          </h2>
                          <p className={`mb-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                            Bạn đã sử dụng hết 5 lượt xem tài liệu này trong ngày hôm nay.
                          </p>
                          <div className="flex flex-col md:flex-row gap-3 justify-center">
                            {user ? (
                              <a
                                href="/pricing"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-center transition-colors"
                              >
                                Nâng cấp tài khoản Premium
                              </a>
                            ) : (
                              <>
                                <Link
                                  to="/login"
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-center transition-colors"
                                >
                                  Đăng nhập
                                </Link>
                                <Link
                                  to="/register"
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-center transition-colors"
                                >
                                  Đăng ký
                                </Link>
                              </>
                            )}
                            <Link
                              to="/"
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-center transition-colors"
                            >
                              Quay về trang chủ
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {categorySlug === "admin" && documentSlug === "users" ? (
                          <UserManagementContent />
                        ) : (
                          !viewState.viewLimitExceeded && (
                            <MemoizedMainContent filteredQuestions={filteredQuestions} />
                          )
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <Footer />
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    </div>
  );
}

export default DocumentView;