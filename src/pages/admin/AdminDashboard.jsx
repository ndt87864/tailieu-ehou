import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc, collection, getDocs, query } from "firebase/firestore";
import { useTheme } from "../../context/ThemeContext";
import { useUserRole } from "../../context/UserRoleContext"; // Thêm import này
import Sidebar from "../../components/Sidebar"; // Changed from AdminSidebar to Sidebar
import { DocumentMobileHeader } from "../../components/MobileHeader";
import UserHeader from "../../components/UserHeader";
import ThemeColorPicker from "../../components/ThemeColorPicker";
import { getAnonymousVisitorCount } from "../../firebase/firestoreService";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const AdminDashboard = () => {
  const [user] = useAuthState(auth);
  const { isDarkMode } = useTheme();
  const { isAdmin } = useUserRole(); // Thêm dòng này để lấy isAdmin
  const navigate = useNavigate();

  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // For the Sidebar component
  const [sidebarData, setSidebarData] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(-1);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    premiumUsers: 0,
    partialPremiumUsers: 0,
    fullPremiumUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
    guestUsers: 0,
    anonymousVisitors: 0, // Thêm trường mới cho khách vãng lai
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check if user is admin before fetching stats
        if (!user || (user && !isAdmin)) {
          navigate("/login");
          return;
        }

        // Get all users from Firestore
        const usersQuery = query(collection(db, "users"));
        const querySnapshot = await getDocs(usersQuery);

        let newStats = {
          totalUsers: 0,
          freeUsers: 0,
          premiumUsers: 0,
          partialPremiumUsers: 0,
          fullPremiumUsers: 0,
          adminUsers: 0,
          activeUsers: 0, // Sẽ đếm dựa trên isOnline
          guestUsers: 0,
          anonymousVisitors: 0,
        };

        let activeUsersCount = 0;

        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          newStats.totalUsers++;

          // Đếm người dùng đang hoạt động dựa trên trạng thái isOnline
          if (userData.isOnline === true) {
            activeUsersCount++;
          }

          if (userData.role === "admin") {
            newStats.adminUsers++;
          } else if (userData.role === "puser") {
            newStats.premiumUsers++;

            // Count by subscription type
            if (userData.subscriptionType === "partial") {
              newStats.partialPremiumUsers++;
            } else {
              // Default is 'full' if not specified for premium users
              newStats.fullPremiumUsers++;
            }
          } else {
            newStats.freeUsers++;
          }
        });

        // Sử dụng số lượng đếm được thay vì tính toán tỷ lệ
        newStats.activeUsers = activeUsersCount;

        // Simulate guest users (approximately 15% of total)
        newStats.guestUsers = Math.round(newStats.totalUsers * 0.15);

        // Lấy số người dùng ẩn danh đang truy cập
        const anonymousCount = await getAnonymousVisitorCount();
        newStats.anonymousVisitors = anonymousCount;

        setStats(newStats);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStats();
      // Thiết lập interval để cập nhật số liệu định kỳ
      const intervalId = setInterval(() => {
        fetchStats();
      }, 30000); // Cập nhật mỗi 30 giây

      return () => clearInterval(intervalId);
    }
  }, [user, isAdmin, navigate]);

  // Card data for statistical display with filter parameters for navigation
  const statCards = [
    {
      title: "Tổng số người dùng",
      value: stats.totalUsers,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: "blue",
      filter: "all",
    },
    {
      title: "Người dùng miễn phí",
      value: stats.freeUsers,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      color: "green",
      filter: "free",
    },
    {
      title: "Trả phí toàn bộ",
      value: stats.fullPremiumUsers,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      color: "purple",
      filter: "premium-full",
    },
    {
      title: "Trả phí theo mục",
      value: stats.partialPremiumUsers,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
      color: "teal",
      filter: "premium-partial",
    },
    {
      title: "Đang hoạt động",
      value: stats.activeUsers,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
          />
        </svg>
      ),
      color: "yellow",
      filter: "online",
    },
    {
      title: "Khách truy cập",
      value: stats.anonymousVisitors,
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      color: "orange",
      filter: "anonymous",
    },
  ];

  // Handle navigation to users page with filter
  const navigateToUsers = (filter) => {
    navigate(`/admin/users?filter=${filter}`);
  };

  // Configuration for chart themes
  const getChartColors = (isDark) => {
    return {
      backgroundColor: isDark
        ? [
            "rgba(74, 222, 128, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(249, 115, 22, 0.8)",
          ]
        : [
            "rgba(74, 222, 128, 0.6)",
            "rgba(59, 130, 246, 0.6)",
            "rgba(139, 92, 246, 0.6)",
            "rgba(249, 115, 22, 0.6)",
          ],
      borderColor: isDark
        ? [
            "rgba(74, 222, 128, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(139, 92, 246, 1)",
            "rgba(249, 115, 22, 1)",
          ]
        : [
            "rgba(74, 222, 128, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(139, 92, 246, 1)",
            "rgba(249, 115, 22, 1)",
          ],
      borderWidth: 1,
    };
  };

  // Chart options with responsive design and theme-aware colors
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDarkMode ? "#e5e7eb" : "#374151",
          font: {
            size: 12,
          },
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: isDarkMode
          ? "rgba(55, 65, 81, 0.9)"
          : "rgba(255, 255, 255, 0.9)",
        titleColor: isDarkMode ? "#e5e7eb" : "#374151",
        bodyColor: isDarkMode ? "#e5e7eb" : "#374151",
        borderColor: isDarkMode
          ? "rgba(75, 85, 99, 1)"
          : "rgba(229, 231, 235, 1)",
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
      },
    },
  };

  // Prepare chart data
  const userTypeData = {
    labels: ["Miễn phí", "Trả phí", "Admin", "Khách vãng lai"],
    datasets: [
      {
        data: [
          stats.freeUsers,
          stats.premiumUsers,
          stats.adminUsers,
          stats.anonymousVisitors,
        ],
        ...getChartColors(isDarkMode),
      },
    ],
  };

  const premiumTypeData = {
    labels: ["Trả phí toàn bộ", "Trả phí theo mục"],
    datasets: [
      {
        data: [stats.fullPremiumUsers, stats.partialPremiumUsers],
        backgroundColor: isDarkMode
          ? ["rgba(139, 92, 246, 0.8)", "rgba(20, 184, 166, 0.8)"]
          : ["rgba(139, 92, 246, 0.6)", "rgba(20, 184, 166, 0.6)"],
        borderColor: isDarkMode
          ? ["rgba(139, 92, 246, 1)", "rgba(20, 184, 166, 1)"]
          : ["rgba(139, 92, 246, 1)", "rgba(20, 184, 166, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const conversionRateData = {
    labels: ["Đã trả phí", "Chưa trả phí"],
    datasets: [
      {
        data: [stats.premiumUsers, stats.freeUsers],
        backgroundColor: isDarkMode
          ? ["rgba(52, 211, 153, 0.8)", "rgba(239, 68, 68, 0.8)"]
          : ["rgba(52, 211, 153, 0.6)", "rgba(239, 68, 68, 0.6)"],
        borderColor: isDarkMode
          ? ["rgba(52, 211, 153, 1)", "rgba(239, 68, 68, 1)"]
          : ["rgba(52, 211, 153, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const registrationRateData = {
    labels: ["Đã đăng ký", "Chưa đăng ký"],
    datasets: [
      {
        data: [
          stats.freeUsers + stats.premiumUsers + stats.adminUsers,
          stats.anonymousVisitors,
        ],
        backgroundColor: isDarkMode
          ? ["rgba(59, 130, 246, 0.8)", "rgba(107, 114, 128, 0.8)"]
          : ["rgba(59, 130, 246, 0.6)", "rgba(107, 114, 128, 0.6)"],
        borderColor: isDarkMode
          ? ["rgba(59, 130, 246, 1)", "rgba(107, 114, 128, 1)"]
          : ["rgba(59, 130, 246, 1)", "rgba(107, 114, 128, 1)"],
        borderWidth: 1,
      },
    ],
  };

  // Calculate percentages for chart titles
  const premiumPercentage =
    stats.totalUsers > 0
      ? Math.round((stats.premiumUsers / stats.totalUsers) * 100)
      : 0;

  const conversionRate =
    stats.freeUsers + stats.premiumUsers > 0
      ? Math.round(
          (stats.premiumUsers / (stats.freeUsers + stats.premiumUsers)) * 100
        )
      : 0;

  const registrationRate =
    stats.freeUsers +
      stats.premiumUsers +
      stats.adminUsers +
      stats.anonymousVisitors >
    0
      ? Math.round(
          ((stats.freeUsers + stats.premiumUsers + stats.adminUsers) /
            (stats.freeUsers +
              stats.premiumUsers +
              stats.adminUsers +
              stats.anonymousVisitors)) *
            100
        )
      : 0;

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <DocumentMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar - Fixed on desktop, slidable on mobile */}
        <div
          className={`${
            windowWidth < 770
              ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : "sticky top-0 h-screen z-10"
          }`}
        >
          <Sidebar
            sidebarData={sidebarData}
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
            hideDocumentTree={true}
          />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop Header - Fixed at top */}
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}

          {/* Main content with padding */}
          <main
            className={`p-4 md:p-6 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Thống kê người dùng</h2>
                <button
                  onClick={() => window.location.reload()}
                  className={`text-sm px-3 py-1 rounded ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-white hover:bg-gray-50"
                  } transition-colors`}
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Làm mới
                  </div>
                </button>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg
                    className="animate-spin h-12 w-12 mb-4 text-gray-500"
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
                  <p
                    className={`text-lg ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Đang tải thống kê...
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {statCards.map((card, index) => (
                      <div
                        key={index}
                        className={`${
                          isDarkMode ? "bg-gray-800" : "bg-white"
                        } rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${
                          isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                        }`}
                        onClick={() => navigateToUsers(card.filter)}
                      >
                        <div className="flex items-center">
                          <div
                            className={`p-3 rounded-full bg-${card.color}-500 bg-opacity-20 text-${card.color}-500 mr-4`}
                          >
                            {card.icon}
                          </div>
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {card.title}
                            </p>
                            <h3 className="text-2xl font-bold">
                              {card.value.toLocaleString()}
                            </h3>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* New Section: Pie Charts */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Biểu đồ phân tích người dùng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Chart 1: User Type Distribution */}
                      <div
                        className={`p-4 rounded-lg shadow-md ${
                          isDarkMode ? "bg-gray-800" : "bg-white"
                        }`}
                      >
                        <h4
                          className={`text-center text-sm font-medium mb-2 ${
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          Phân bố loại người dùng
                        </h4>
                        <div className="h-60">
                          <Pie data={userTypeData} options={chartOptions} />
                        </div>
                      </div>

                      {/* Chart 2: Premium User Type Distribution */}
                      <div
                        className={`p-4 rounded-lg shadow-md ${
                          isDarkMode ? "bg-gray-800" : "bg-white"
                        }`}
                      >
                        <h4
                          className={`text-center text-sm font-medium mb-2 ${
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          Phân bố người dùng trả phí
                        </h4>
                        <div className="h-60">
                          <Pie data={premiumTypeData} options={chartOptions} />
                        </div>
                      </div>

                      {/* Chart 3: Conversion Rate */}
                      <div
                        className={`p-4 rounded-lg shadow-md ${
                          isDarkMode ? "bg-gray-800" : "bg-white"
                        }`}
                      >
                        <h4
                          className={`text-center text-sm font-medium mb-2 ${
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          Tỷ lệ tài khoản trả phí ({conversionRate}%)
                        </h4>
                        <div className="h-60">
                          <Pie
                            data={conversionRateData}
                            options={chartOptions}
                          />
                        </div>
                      </div>

                      {/* Chart 4: Registration Rate */}
                      <div
                        className={`p-4 rounded-lg shadow-md ${
                          isDarkMode ? "bg-gray-800" : "bg-white"
                        }`}
                      >
                        <h4
                          className={`text-center text-sm font-medium mb-2 ${
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          Tỷ lệ đăng ký tài khoản ({registrationRate}%)
                        </h4>
                        <div className="h-60">
                          <Pie
                            data={registrationRateData}
                            options={chartOptions}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Premium User Stats */}
                  <div
                    className={`mb-6 p-4 rounded-lg shadow-md ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <h3 className="text-lg font-semibold mb-4">
                      Tổng người dùng trả phí
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        } cursor-pointer hover:shadow-md transition-all duration-200 ${
                          isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-100"
                        }`}
                        onClick={() => navigateToUsers("all")}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Tổng người dùng trả phí
                            </p>
                            <h4 className="text-xl font-bold">
                              {stats.premiumUsers.toLocaleString()}
                            </h4>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isDarkMode
                                ? "bg-indigo-900 bg-opacity-30"
                                : "bg-indigo-100"
                            } text-indigo-500`}
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {stats.totalUsers > 0
                              ? Math.round(
                                  (stats.premiumUsers / stats.totalUsers) * 100
                                )
                              : 0}
                            % tổng người dùng
                          </p>
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-purple-900/20" : "bg-purple-50"
                        } cursor-pointer hover:shadow-md transition-all duration-200 ${
                          isDarkMode
                            ? "hover:bg-purple-900/30"
                            : "hover:bg-purple-100"
                        }`}
                        onClick={() => navigateToUsers("premium-full")}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Trả phí toàn bộ
                            </p>
                            <h4 className="text-xl font-bold">
                              {stats.fullPremiumUsers.toLocaleString()}
                            </h4>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isDarkMode
                                ? "bg-purple-800 bg-opacity-30"
                                : "bg-purple-100"
                            } text-purple-500`}
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {stats.premiumUsers > 0
                              ? Math.round(
                                  (stats.fullPremiumUsers /
                                    stats.premiumUsers) *
                                    100
                                )
                              : 0}
                            % người dùng trả phí
                          </p>
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-teal-900/20" : "bg-teal-50"
                        } cursor-pointer hover:shadow-md transition-all duration-200 ${
                          isDarkMode
                            ? "hover:bg-teal-900/30"
                            : "hover:bg-teal-100"
                        }`}
                        onClick={() => navigateToUsers("premium-partial")}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Trả phí theo mục
                            </p>
                            <h4 className="text-xl font-bold">
                              {stats.partialPremiumUsers.toLocaleString()}
                            </h4>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isDarkMode
                                ? "bg-teal-800 bg-opacity-30"
                                : "bg-teal-100"
                            } text-teal-500`}
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {stats.premiumUsers > 0
                              ? Math.round(
                                  (stats.partialPremiumUsers /
                                    stats.premiumUsers) *
                                    100
                                )
                              : 0}
                            % người dùng trả phí
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Activity Stats */}
                  <div
                    className={`mb-6 p-4 rounded-lg shadow-md ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <h3 className="text-lg font-semibold mb-4">
                      Hoạt động người dùng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        } cursor-pointer hover:shadow-md transition-all duration-200 ${
                          isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-100"
                        }`}
                        onClick={() => navigateToUsers("online")}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Đang hoạt động
                            </p>
                            <h4 className="text-xl font-bold">
                              {stats.activeUsers.toLocaleString()}
                            </h4>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isDarkMode
                                ? "bg-green-900 bg-opacity-30"
                                : "bg-green-100"
                            } text-green-500`}
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {stats.totalUsers > 0
                              ? Math.round(
                                  (stats.activeUsers / stats.totalUsers) * 100
                                )
                              : 0}
                            % người dùng
                          </p>
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Không hoạt động
                            </p>
                            <h4 className="text-xl font-bold">
                              {(
                                stats.totalUsers -
                                stats.activeUsers -
                                stats.guestUsers
                              ).toLocaleString()}
                            </h4>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isDarkMode
                                ? "bg-red-900 bg-opacity-30"
                                : "bg-red-100"
                            } text-red-500`}
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
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
                        <div className="mt-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {Math.round(
                              ((stats.totalUsers -
                                stats.activeUsers -
                                stats.guestUsers) /
                                stats.totalUsers) *
                                100
                            )}
                            % người dùng
                          </p>
                        </div>
                      </div>

                      {/* Khách vãng lai hiện tại */}
                      <div
                        className={`p-4 rounded-lg ${
                          isDarkMode ? "bg-amber-900/20" : "bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Khách đang truy cập
                            </p>
                            <h4 className="text-xl font-bold">
                              {stats.anonymousVisitors.toLocaleString()}
                            </h4>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isDarkMode
                                ? "bg-amber-800 bg-opacity-30"
                                : "bg-amber-100"
                            } text-amber-500`}
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Đang xem trang không đăng nhập
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div
                    className={`p-4 rounded-lg shadow-md ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    } mb-6`}
                  >
                    <h3 className="text-lg font-semibold mb-2">
                      Thông tin bổ sung
                    </h3>
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      } mb-4`}
                    >
                      Thống kê được cập nhật từ cơ sở dữ liệu. Dữ liệu về người
                      dùng vãng lai được ước tính dựa trên phiên truy cập.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Tỷ lệ chuyển đổi
                        </p>
                        <p className="text-lg font-bold">
                          {stats.freeUsers + stats.premiumUsers > 0
                            ? Math.round(
                                (stats.premiumUsers /
                                  (stats.freeUsers + stats.premiumUsers)) *
                                  100
                              )
                            : 0}
                          %
                        </p>
                        <p
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Người dùng trả phí trên tổng tài khoản thường
                        </p>
                      </div>

                      <div
                        className={`p-3 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Tỷ lệ hoạt động
                        </p>
                        <p className="text-lg font-bold">
                          {stats.totalUsers > 0
                            ? Math.round(
                                (stats.activeUsers / stats.totalUsers) * 100
                              )
                            : 0}
                          %
                        </p>
                        <p
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Người dùng đang hoạt động
                        </p>
                      </div>

                      <div
                        className={`p-3 rounded-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-50"
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Quản trị viên
                        </p>
                        <p className="text-lg font-bold">{stats.adminUsers}</p>
                        <p
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Số lượng quản trị viên hệ thống
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
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

export default AdminDashboard;
