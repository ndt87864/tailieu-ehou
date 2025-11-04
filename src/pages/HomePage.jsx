import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllCategories } from "../firebase/firestoreService";
import { getDocumentsByCategory } from "../firebase/firestoreService";
import { getAllStudentInfor } from "../firebase/studentInforService";
import { formatDate } from "./admin/student_infor/studentInforHelpers";
import { useTheme } from "../context/ThemeContext";
import { HomeMobileHeader } from "../components/MobileHeader";
import UserHeader from "../components/UserHeader";
import ThemeColorPicker from "../components/ThemeColorPicker";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

const toSlug = (str) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "_");
};

const HomePage = () => {
  // Add search state
  // `searchInput` is the immediate controlled input value.
  // `searchQuery` is the actual query used for searching and will only
  // be updated when the user presses Enter or clicks the magnifier.
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // search type: 'doc' = tài liệu, 'exam' = lịch thi (default)
  const [searchType, setSearchType] = useState("exam");

  // student schedule data used when searching lịch thi
  const [studentInfors, setStudentInfors] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  // Thêm state memoization để tối ưu hiệu suất
  const [isAnyExpanded, setIsAnyExpanded] = useState(false);
  const [cachedData, setCachedData] = useState(null);

  // Sử dụng useMemo để tránh tính toán lại khi render
  const filteredData = useMemo(() => {
    if (!cachedData) return [];
    return cachedData.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cachedData, searchQuery]);

  // Sử dụng useCallback cho các hàm xử lý sự kiện
  const handleExpand = useCallback((categoryId) => {
    setIsAnyExpanded(true);
    // Xử lý mở rộng danh mục
  }, []);

  // Sử dụng useEffect để tải dữ liệu với một chiến lược cache
  // Tối ưu: chỉ load categories khi vào trang, không load documents
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Dùng cache IndexedDB nếu có
        const cached = sessionStorage.getItem("homepageCategories");
        const cachedTime = sessionStorage.getItem("homepageCategoriesTime");
        const now = Date.now();
        if (
          cached &&
          cachedTime &&
          now - parseInt(cachedTime) < 15 * 60 * 1000
        ) {
          const cats = JSON.parse(cached);
          if (isMounted) setCategories(cats);
          setLoading(false);
          return;
        }
        const cats = await getAllCategories();
        if (isMounted) setCategories(cats);
        sessionStorage.setItem("homepageCategories", JSON.stringify(cats));
        sessionStorage.setItem("homepageCategoriesTime", now.toString());
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Lỗi tải danh mục");
          setLoading(false);
        }
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Add state to track if any category has been expanded
  const [hasExpandedCategory, setHasExpandedCategory] = useState(false);

  const [sidebarData, setSidebarData] = useState([]);
  const [documents, setDocuments] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesWithDocs, setCategoriesWithDocs] = useState([]); // [{...cat, documents: []}]

  // Add state to track which categories have been expanded
  const [expandedCategories, setExpandedCategories] = useState({});
  // Add state to track loading state for each category
  const [loadingCategories, setLoadingCategories] = useState({});
  // Add state to track loading state for each category during "Load More"
  const [loadingMoreDocs, setLoadingMoreDocs] = useState({});

  const [popularDocuments, setPopularDocuments] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  // Add state to track network connection status
  const [isOffline, setIsOffline] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log("Application is online");
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.log("Application is offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial network status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Khi categories thay đổi, reset categoriesWithDocs (chỉ chứa documents khi expand)
  useEffect(() => {
    if (!categories || categories.length === 0) {
      setCategoriesWithDocs([]);
      return;
    }
    // Khi load trang: chỉ lấy 5 tài liệu đầu tiên cho mỗi danh mục, không load allDocuments
    const fetchInitialDocs = async () => {
      const results = await Promise.all(
        categories.map(async (cat) => {
          try {
            const docs = await getDocumentsByCategory(cat.id);
            const sortedDocs = (docs || []).sort(
              (a, b) => (a.stt || 0) - (b.stt || 0)
            );
            return {
              ...cat,
              documents: sortedDocs.slice(0, 5),
              allDocuments: undefined, // Chỉ load khi ấn Xem thêm
              hasMoreDocuments: sortedDocs.length > 5,
            };
          } catch (e) {
            return {
              ...cat,
              documents: [],
              allDocuments: undefined,
              hasMoreDocuments: false,
            };
          }
        })
      );
      setCategoriesWithDocs(results);
    };
    fetchInitialDocs();
  }, [categories]);

  // Function to load more documents for a specific category

  // Lazy load documents for a category when user expands or clicks "Load More"
  const handleLoadMore = async (categoryId) => {
    setLoadingCategories((prev) => ({ ...prev, [categoryId]: true }));
    try {
      // Luôn fetch lại toàn bộ tài liệu khi ấn Xem thêm
      const docs = await getDocumentsByCategory(categoryId);
      const sortedDocs = (docs || []).sort(
        (a, b) => (a.stt || 0) - (b.stt || 0)
      );
      const updated = categoriesWithDocs.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              documents: sortedDocs,
              allDocuments: sortedDocs,
              hasMoreDocuments: false,
            }
          : c
      );
      setCategoriesWithDocs(updated);
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
      setHasExpandedCategory(true);
    } catch (err) {
      console.error("Lỗi tải tài liệu cho danh mục", categoryId, err);
    } finally {
      setLoadingCategories((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  // Function to collapse all expanded document lists
  const handleCollapseAll = () => {
    // Create a new array with all categories collapsed to their initial state
    const collapsedCategories = categoriesWithDocs.map((cat) => {
      if (cat.allDocuments && cat.allDocuments.length > 5) {
        return {
          ...cat,
          documents: cat.allDocuments.slice(0, 5),
          hasMoreDocuments: true,
        };
      }
      return cat;
    });

    setCategoriesWithDocs(collapsedCategories);
    setExpandedCategories({});
    // Reset expanded flag
    setHasExpandedCategory(false);
  };

  const handleDocumentClick = (category, document) => {
    const categorySlug = toSlug(category.title);
    navigate(`/${categorySlug}/${document.slug}`);
  };

  // Add a function to handle search input changes (updates input only)
  // If the input becomes empty, reset the active search immediately.
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    // If user cleared the input, clear the active search results
    if (value.trim() === "") {
      setSearchQuery("");
    }
  };

  // Trigger the actual search: copy searchInput -> searchQuery
  const triggerSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
  }, [searchInput]);

  // Handle Enter key on the input to trigger search
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      triggerSearch();
    }
  };

  // load student infors when switching to exam search (do it once)
  useEffect(() => {
    let mounted = true;
    const loadStudents = async () => {
      if (studentInfors !== null) return;
      try {
        setLoadingStudents(true);
        const data = await getAllStudentInfor();
        if (mounted) setStudentInfors(data || []);
      } catch (err) {
        console.error("Failed to load student info for exam search", err);
        if (mounted) setStudentInfors([]);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };

    if (searchType === "exam") loadStudents();
    return () => {
      mounted = false;
    };
  }, [searchType]);

  // Improved function to filter documents based on search query
  const getFilteredDocuments = (category) => {
    if (!searchQuery.trim()) {
      return category.documents;
    }

    const query = searchQuery.toLowerCase().trim();
    return category.documents.filter((doc) =>
      doc.title.toLowerCase().includes(query)
    );
  };

  // Improved function to get all matching documents across all categories
  const getAllMatchingDocuments = () => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const allMatchingDocs = [];

    // Only search in categoriesWithDocs if it exists and has data
    if (categoriesWithDocs && categoriesWithDocs.length > 0) {
      categoriesWithDocs.forEach((category) => {
        if (category.documents && Array.isArray(category.documents)) {
          const matchingDocsInCategory = category.documents.filter(
            (doc) => doc.title && doc.title.toLowerCase().includes(query)
          );

          matchingDocsInCategory.forEach((doc) => {
            allMatchingDocs.push({
              ...doc,
              categoryTitle: category.title || "Không có danh mục",
              categoryId: category.id,
            });
          });
        }
      });
    }

    // Log for debugging
    console.log(
      `Found ${allMatchingDocs.length} documents matching "${query}"`
    );

    return allMatchingDocs;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-slate-50 text-gray-800"
        }`}
      >
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-slate-50 text-gray-800"
        }`}
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lỗi khi tải dữ liệu</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Get all matching documents when search is active
  const allMatchingDocuments = searchQuery.trim()
    ? getAllMatchingDocuments()
    : [];

  // When searching exam schedule, match by studentId or fullName
  const getAllMatchingExamRecords = () => {
    const q = (searchQuery || "").toLowerCase().trim();
    if (!q || !studentInfors || studentInfors.length === 0) return [];
    return studentInfors.filter((r) => {
      const id = (r.studentId || "").toLowerCase();
      const name = (r.fullName || "").toLowerCase();
      const username = (r.username || "").toLowerCase();
      return id.includes(q) || name.includes(q) || username.includes(q);
    });
  };

  // Ensure returned exam records do not expose `examTime` in the UI
  const allMatchingExamRecords = (
    searchQuery.trim() ? getAllMatchingExamRecords() : []
  ).map(({ examTime, ...rest }) => rest);

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <HomeMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen relative">
        {/* Main Content */}
        <div
          className={`flex flex-col flex-1 ${
            isDarkMode ? "bg-gray-900 text-white" : "bg-slate-50 text-gray-800"
          }`}
        >
          {/* Desktop Header */}
          {windowWidth >= 770 && <UserHeader title="Trang chủ" />}

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="mb-8 flex justify-between items-center">
              {/* Collapse All Button - Only show when at least one category is expanded */}
              {hasExpandedCategory && (
                <button
                  onClick={handleCollapseAll}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-green-50 hover:bg-green-100 text-green-700"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 11l7-7 7 7M5 19l7-7 7 7"
                      />
                    </svg>
                    Thu gọn tất cả
                  </div>
                </button>
              )}
            </div>

            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <h1
                  className={`text-3xl md:text-4xl font-bold mb-6 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  Thư viện Tài liệu HOU
                </h1>
                <p
                  className={`text-lg mb-8 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Kho tài liệu học tập dành cho sinh viên Đại học Mở Hà Nội
                </p>
              </div>

              {/* Add search bar at the top */}
              <div className="max-w-3xl mx-auto mb-8">
                <div
                  className={`relative ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    <div
                      className={`flex-1 relative rounded-lg shadow-md overflow-hidden ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      }`}
                    >
                      <input
                        type="text"
                        value={searchInput}
                        onChange={handleSearchChange}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={
                          searchType === "exam"
                            ? "Tìm kiếm lịch thi theo Họ và tên, hoặc Tài khoản..."
                            : "Tìm kiếm tài liệu..."
                        }
                        className={`w-full px-4 py-3 pr-10 ${
                          isDarkMode
                            ? "bg-gray-800 text-white placeholder-gray-400 focus:bg-gray-700"
                            : "bg-white text-gray-900 placeholder-gray-500"
                        } focus:outline-none`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          onClick={triggerSearch}
                          aria-label="Tìm kiếm"
                          className={`h-8 w-8 flex items-center justify-center rounded focus:outline-none ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          <svg
                            className={`h-5 w-5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Search type segmented selector */}
                    <div
                      role="tablist"
                      aria-label="Chọn loại tìm kiếm"
                      className="inline-flex rounded-md shadow-sm"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-pressed={searchType === "exam"}
                        onClick={() => setSearchType("exam")}
                        className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors rounded-l-md ${
                          searchType === "exam"
                            ? isDarkMode
                              ? "bg-green-600 text-white border border-green-600"
                              : "bg-green-50 text-green-700 border border-green-200"
                            : isDarkMode
                            ? "bg-gray-800 text-gray-300 border border-gray-700"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        Lịch thi
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-pressed={searchType === "doc"}
                        onClick={() => setSearchType("doc")}
                        className={`px-4 py-2 text-sm font-medium focus:outline-none transition-colors rounded-r-md ${
                          searchType === "doc"
                            ? isDarkMode
                              ? "bg-green-600 text-white border border-green-600"
                              : "bg-green-50 text-green-700 border border-green-200"
                            : isDarkMode
                            ? "bg-gray-800 text-gray-300 border border-gray-700"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        Tài liệu
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show offline warning if applicable */}
              {isOffline && (
                <div className="mb-6 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>
                      Bạn đang ở chế độ ngoại tuyến. Một số tính năng có thể
                      không hoạt động đúng.
                    </span>
                  </div>
                </div>
              )}

              {/* Display search results section */}
              {searchQuery.trim() && (
                <div className="mb-10">
                  <div
                    className={`mb-6 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold mb-2">
                        Kết quả tìm kiếm: {searchQuery}
                      </h2>
                      <Link
                        to={`/students?query=${encodeURIComponent(
                          searchQuery
                        )}&type=${searchType}`}
                        className={`ml-3 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                          isDarkMode
                            ? "bg-gray-700 text-white"
                            : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                    <div
                      className={`h-1 w-24 ${
                        isDarkMode ? "bg-green-600" : "bg-green-500"
                      } mt-2`}
                    ></div>
                  </div>

                  {searchType === "doc" ? (
                    allMatchingDocuments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allMatchingDocuments.map((document) => (
                          <div
                            key={document.id}
                            className={`rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
                              isDarkMode
                                ? "bg-gray-800 border border-gray-700"
                                : "bg-white"
                            }`}
                            onClick={() =>
                              handleDocumentClick(
                                {
                                  title: document.categoryTitle,
                                  id: document.categoryId,
                                },
                                document
                              )
                            }
                          >
                            <div
                              className={`p-4 ${
                                isDarkMode
                                  ? "border-b border-gray-700"
                                  : "border-b border-gray-200"
                              }`}
                            >
                              <div className="flex items-center">
                                <div
                                  className={`flex-shrink-0 h-8 w-8 rounded-md flex items-center justify-center ${
                                    isDarkMode ? "bg-green-800" : "bg-green-600"
                                  }`}
                                >
                                  <svg
                                    className="h-5 w-5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <h3
                                    className={`text-base font-medium leading-tight ${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {document.title || "Không có tiêu đề"}
                                  </h3>
                                  <p
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {document.categoryTitle}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`text-center py-8 bg-${
                          isDarkMode ? "gray-800" : "white"
                        } rounded-lg shadow-md`}
                      >
                        <svg
                          className={`mx-auto h-12 w-12 ${
                            isDarkMode ? "text-gray-600" : "text-gray-400"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        <h3
                          className={`mt-2 text-lg font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          Không tìm thấy kết quả
                        </h3>
                        <p
                          className={`mt-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Không có tài liệu nào phù hợp với tìm kiếm của bạn.
                          Vui lòng thử từ khóa khác.
                        </p>
                      </div>
                    )
                  ) : (
                    // Exam search results
                    <div>
                      {loadingStudents ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                          <div className="mt-2 text-sm">
                            Đang tìm kiếm lịch thi...
                          </div>
                        </div>
                      ) : allMatchingExamRecords.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {allMatchingExamRecords.map((rec) => (
                            <div
                              key={rec.id}
                              className={`rounded-lg overflow-hidden shadow-md p-4 ${
                                isDarkMode
                                  ? "bg-gray-800 border border-gray-700"
                                  : "bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    Họ và tên
                                  </div>
                                  <div
                                    className={`font-medium ${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {rec.fullName || "—"}
                                  </div>
                                  <div
                                    className={`text-xs mt-1 ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    Tài khoản: {rec.username || "—"}
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <div
                                    className={`${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    Môn
                                  </div>
                                  <div
                                    className={`${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {rec.subject || "—"}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 text-sm text-gray-500">
                                <div>
                                  Ngày thi:{" "}
                                  {formatDate(rec.examDate) || "chưa cập nhật"}
                                </div>
                                <div>
                                  Ca: {rec.examSession || "—"} | Phòng:{" "}
                                  {rec.examRoom || "—"}
                                </div>
                                {rec.examLink ? (
                                  <div className="mt-2">
                                    <a
                                      href={rec.examLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-500 hover:underline"
                                    >
                                      Mở link phòng
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className={`text-center py-8 bg-${
                            isDarkMode ? "gray-800" : "white"
                          } rounded-lg shadow-md`}
                        >
                          <h3
                            className={`mt-2 text-lg font-medium ${
                              isDarkMode ? "text-gray-300" : "text-gray-900"
                            }`}
                          >
                            Không tìm thấy lịch thi
                          </h3>
                          <p
                            className={`mt-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Không có bản ghi lịch thi phù hợp. Thử lại với Mã
                            sinh viên, Họ và tên hoặc Tài khoản.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Main Categories Section */}
              <div>
                <h2
                  className={`text-2xl font-semibold mb-6 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  Danh mục tài liệu
                </h2>

                {loading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                ) : error ? (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                    <p>{error}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoriesWithDocs.map((category) => (
                      <div
                        key={category.id}
                        className={`rounded-lg overflow-hidden shadow-md ${
                          isDarkMode
                            ? "bg-gray-800 border border-gray-700"
                            : "bg-white"
                        }`}
                      >
                        <div
                          className={`px-6 py-4 ${
                            isDarkMode
                              ? "border-b border-gray-700"
                              : "border-b border-gray-200"
                          }`}
                        >
                          <h2
                            className={`text-lg font-semibold ${
                              isDarkMode ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {category.title || "Danh mục không có tên"}
                          </h2>
                        </div>
                        <div className="p-2">
                          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {category.documents &&
                            category.documents.length > 0 ? (
                              category.documents.map((doc) => (
                                <li key={doc.id}>
                                  <button
                                    onClick={() =>
                                      handleDocumentClick(category, doc)
                                    }
                                    className={`w-full text-left px-4 py-3 rounded-md ${
                                      isDarkMode
                                        ? "hover:bg-gray-700 text-gray-200"
                                        : "hover:bg-gray-100 text-gray-700"
                                    } transition-colors`}
                                  >
                                    <div className="flex items-center">
                                      <svg
                                        className="w-5 h-5 mr-2 text-green-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        ></path>
                                      </svg>
                                      <span>
                                        {doc.title || "Không có tiêu đề"}
                                      </span>
                                    </div>
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li
                                className={`px-4 py-3 ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                Không có tài liệu
                              </li>
                            )}
                          </ul>

                          {/* Load More Button */}
                          {category.hasMoreDocuments && (
                            <div className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleLoadMore(category.id)}
                                disabled={loadingCategories[category.id]}
                                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                  isDarkMode
                                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                                    : "bg-green-50 hover:bg-green-100 text-green-700"
                                }`}
                              >
                                {loadingCategories[category.id] ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
                                    Đang tải...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      ></path>
                                    </svg>
                                    Xem thêm tài liệu
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer positioned at bottom */}
          <Footer />
        </div>
      </div>

      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />
    </div>
  );
};

export default HomePage;
