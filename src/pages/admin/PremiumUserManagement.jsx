import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "../../context/UserRoleContext";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import UserHeader from "../../components/UserHeader";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import Sidebar from "../../components/Sidebar";
import ThemeColorPicker from "../../components/ThemeColorPicker";

const PremiumUserManagement = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // State for premium tiers
  const [premiumTiers, setPremiumTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for add/edit modal
  const [showTierModal, setShowTierModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tierToEdit, setTierToEdit] = useState(null);
  const [tierForm, setTierForm] = useState({
    name: "",
    price: 0,
    permissions: [],
    isActive: true,
    icon: "default", // Default icon
  });

  // State for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tierToDelete, setTierToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for permission input
  const [permissionInput, setPermissionInput] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // State for sidebar elements
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Available icons for premium tiers
  const availableIcons = [
    {
      name: "default",
      label: "Mặc định ",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      name: "crown",
      label: "Vương miện ",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 7l4 1 4-5 4 5 4-1 1 8-18 0 1-8z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 15v2h14v-2"
          />
        </svg>
      ),
    },
    {
      name: "star",
      label: "Ngôi sao",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ),
    },
    {
      name: "diamond",
      label: "Kim cương",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M18 2H6L2 8l10 14L22 8l-4-6z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2 8h20"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M12 2v20"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M6 2l6 6l6-6"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M7 8l5 10"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M17 8l-5 10"
          />
        </svg>
      ),
    },
    {
      name: "shield",
      label: "Khiên bảo vệ",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      name: "trophy",
      label: "Cúp vàng",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 5h14M5 5a2 2 0 002 2h10a2 2 0 002-2M12 12V7"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 5v4a7 7 0 007 7v0a7 7 0 007-7V5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 21h8M12 16v5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 21a2 2 0 01-6 0"
          />
        </svg>
      ),
    },
    {
      name: "lightning",
      label: "Tia chớp",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: "fire",
      label: "vip",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <text
            x="12"
            y="15"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="currentColor"
            stroke="none"
          >
            VIP
          </text>
        </svg>
      ),
    },
    {
      name: "heart",
      label: "Trái tim",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
    },
    {
      name: "rocket",
      label: "Đồng vàng $",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 7v10M8"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M14.5 11c0-1.5-1.5-2-2.5-2s-2.5.5-2.5 2c0 1.5 5 1 5 3 0 1.5-1.5 2-2.5 2s-2.5-.5-2.5-2"
          />
        </svg>
      ),
    },
    {
      name: "gift",
      label: "Quà tặng",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      ),
    },
    {
      name: "magic",
      label: "Phép thuật",
      component: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
    },
  ];

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const icon = availableIcons.find((i) => i.name === iconName);
    return icon ? icon.component : availableIcons[0].component;
  };

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!user && !loading) {
      navigate("/login");
    } else if (!isAdmin && !loading) {
      navigate("/");
    }

    // Fetch premium tiers
    fetchPremiumTiers();

    // Add window resize handler
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [user, isAdmin, navigate]);

  const fetchPremiumTiers = async () => {
    try {
      setLoading(true);
      const tiersQuery = query(
        collection(db, "premium_tiers"),
        orderBy("price", "asc")
      );
      const snapshot = await getDocs(tiersQuery);

      const tiers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPremiumTiers(tiers);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching premium tiers:", error);
      setError("Không thể tải thông tin gói người dùng. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTierForm({
      ...tierForm,
      [name]:
        type === "checkbox"
          ? checked
          : name === "price"
          ? Number(value)
          : value,
    });
  };

  const handleIconSelect = (iconName) => {
    setTierForm({
      ...tierForm,
      icon: iconName,
    });
    setShowIconPicker(false);
  };

  const handleAddPermission = () => {
    if (permissionInput.trim()) {
      setTierForm({
        ...tierForm,
        permissions: [...tierForm.permissions, permissionInput.trim()],
      });
      setPermissionInput("");
    }
  };

  const handleRemovePermission = (index) => {
    const updatedPermissions = [...tierForm.permissions];
    updatedPermissions.splice(index, 1);
    setTierForm({
      ...tierForm,
      permissions: updatedPermissions,
    });
  };

  const handleAddTier = async (e) => {
    e.preventDefault();

    try {
      const newTier = {
        ...tierForm,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "premium_tiers"), newTier);
      setShowTierModal(false);
      setSuccess("Thêm gói người dùng thành công!");
      fetchPremiumTiers();

      // Reset form
      setTierForm({
        name: "",
        price: 0,
        permissions: [],
        isActive: true,
        icon: "default",
      });

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error adding premium tier:", error);
      setError("Không thể thêm gói người dùng. Vui lòng thử lại sau.");

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleEditTier = async (e) => {
    e.preventDefault();

    try {
      const tierRef = doc(db, "premium_tiers", tierToEdit.id);
      await updateDoc(tierRef, {
        ...tierForm,
        updatedAt: new Date(),
      });

      setShowTierModal(false);
      setSuccess("Cập nhật gói người dùng thành công!");
      fetchPremiumTiers();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error updating premium tier:", error);
      setError("Không thể cập nhật gói người dùng. Vui lòng thử lại sau.");

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleDeleteTier = async () => {
    try {
      setIsDeleting(true);
      const tierRef = doc(db, "premium_tiers", tierToDelete.id);
      await deleteDoc(tierRef);

      setShowDeleteModal(false);
      setSuccess("Xóa gói người dùng thành công!");
      fetchPremiumTiers();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting premium tier:", error);
      setError("Không thể xóa gói người dùng. Vui lòng thử lại sau.");

      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (tier) => {
    try {
      const tierRef = doc(db, "premium_tiers", tier.id);
      await updateDoc(tierRef, {
        isActive: !tier.isActive,
        updatedAt: new Date(),
      });

      setSuccess(
        `${tier.isActive ? "Tạm dừng" : "Kích hoạt"} gói "${
          tier.name
        }" thành công!`
      );
      fetchPremiumTiers();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error toggling tier status:", error);
      setError(
        "Không thể thay đổi trạng thái gói người dùng. Vui lòng thử lại sau."
      );

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const openAddTierModal = () => {
    setIsEditing(false);
    setTierForm({
      name: "",
      price: 0,
      permissions: [],
      isActive: true,
      icon: "default",
    });
    setShowTierModal(true);
  };

  const openEditTierModal = (tier) => {
    setIsEditing(true);
    setTierToEdit(tier);
    setTierForm({
      name: tier.name,
      price: tier.price,
      permissions: tier.permissions || [],
      isActive: tier.isActive !== undefined ? tier.isActive : true,
      icon: tier.icon || "default",
    });
    setShowTierModal(true);
  };

  const openDeleteModal = (tier) => {
    setTierToDelete(tier);
    setShowDeleteModal(true);
  };

  // Filter tiers based on search query
  const filteredTiers = premiumTiers.filter((tier) =>
    tier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {windowWidth < 770 && (
        <DocumentMobileHeader
          selectedCategory={{ title: "Quản trị" }}
          selectedDocument={{ title: "Quản lý người dùng cao cấp" }}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
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
            sidebarData={categories}
            documents={documents}
            openMain={openMain}
            setOpenMain={setOpenMain}
            selectedCategory={selectedCategory}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            setSearch={() => {}}
            setDocuments={setDocuments}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
        </div>

        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        <div className="flex-1 overflow-hidden">
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                title="Quản lý người dùng cao cấp"
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}

          <main
            className={`p-4 md:p-6 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    Quản lý gói người dùng cao cấp
                  </h1>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Thêm, sửa và xóa các gói người dùng cao cấp
                  </p>
                </div>

                <div className="mt-4 md:mt-0">
                  <button
                    onClick={openAddTierModal}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                      isDarkMode
                        ? "bg-green-700 hover:bg-green-600 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    } transition-colors shadow-sm`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    Thêm gói người dùng
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className={`px-4 py-3 rounded-md border ${
                    isDarkMode
                      ? "bg-red-900/30 border-red-800 text-red-300"
                      : "bg-red-100 border-red-400 text-red-700"
                  } mb-4`}
                >
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  className={`px-4 py-3 rounded-md border ${
                    isDarkMode
                      ? "bg-green-900/30 border-green-800 text-green-300"
                      : "bg-green-100 border-green-400 text-green-700"
                  } mb-4`}
                >
                  <span>{success}</span>
                </div>
              )}

              {/* Search */}
              <div className="mb-6">
                <div
                  className={`relative rounded-lg overflow-hidden ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } shadow-sm`}
                >
                  <input
                    type="text"
                    placeholder="Tìm kiếm gói người dùng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-4 py-3 pl-10 ${
                      isDarkMode
                        ? "bg-gray-800 text-white placeholder-gray-400 border-gray-700"
                        : "bg-white text-gray-900 placeholder-gray-500 border-gray-200"
                    } border-0 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className={`w-5 h-5 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Premium Tiers List */}
              <div className="w-full overflow-hidden rounded-lg shadow-md">
                <div
                  className={`${
                    isDarkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white"
                  }`}
                >
                  <div
                    className={`px-6 py-4 ${
                      isDarkMode
                        ? "bg-gray-700/50 border-b border-gray-700"
                        : "bg-gray-50 border-b border-gray-200"
                    }`}
                  >
                    <h3
                      className={`text-lg font-medium ${
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      Danh sách gói người dùng cao cấp
                    </h3>
                    <p
                      className={`mt-1 text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {loading
                        ? "Đang tải..."
                        : `Hiển thị ${filteredTiers.length} gói người dùng`}
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  ) : filteredTiers.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        ></path>
                      </svg>
                      <p
                        className={`mt-2 text-sm font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {searchQuery
                          ? "Không tìm thấy gói người dùng nào phù hợp"
                          : "Chưa có gói người dùng cao cấp nào"}
                      </p>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {searchQuery
                          ? "Thử tìm kiếm với từ khóa khác"
                          : 'Nhấn nút "Thêm gói người dùng" để tạo gói mới'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table
                        className={`min-w-full divide-y ${
                          isDarkMode ? "divide-gray-700" : "divide-gray-200"
                        }`}
                      >
                        <thead>
                          <tr
                            className={
                              isDarkMode ? "bg-gray-700/30" : "bg-gray-50"
                            }
                          >
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Tên gói
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Quyền hạn
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Giá
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Trạng thái
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            isDarkMode ? "divide-gray-700" : "divide-gray-200"
                          }`}
                        >
                          {filteredTiers.map((tier) => (
                            <tr
                              key={tier.id}
                              className={
                                isDarkMode
                                  ? "hover:bg-gray-700/30"
                                  : "hover:bg-gray-50"
                              }
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`flex items-center`}>
                                  <div
                                    className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md ${
                                      isDarkMode
                                        ? "bg-blue-900/40 text-blue-300"
                                        : "bg-blue-100 text-blue-600"
                                    }`}
                                  >
                                    {getIconComponent(tier.icon || "default")}
                                  </div>
                                  <div className="ml-4">
                                    <div
                                      className={`text-sm font-medium ${
                                        isDarkMode
                                          ? "text-white"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {tier.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  {tier.permissions &&
                                  tier.permissions.length > 0 ? (
                                    tier.permissions.map(
                                      (permission, index) => (
                                        <span
                                          key={index}
                                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium w-fit ${
                                            isDarkMode
                                              ? "bg-blue-900/30 text-blue-300"
                                              : "bg-blue-100 text-blue-800"
                                          }`}
                                        >
                                          {permission}
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span
                                      className={`text-xs ${
                                        isDarkMode
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      Chưa có quyền hạn
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div
                                  className={`text-sm font-medium ${
                                    isDarkMode
                                      ? "text-green-400"
                                      : "text-green-600"
                                  }`}
                                >
                                  {formatPrice(tier.price)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      tier.isActive
                                        ? isDarkMode
                                          ? "bg-green-900/30 text-green-300"
                                          : "bg-green-100 text-green-800"
                                        : isDarkMode
                                        ? "bg-gray-700 text-gray-300"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {tier.isActive ? "Hoạt động" : "Tạm dừng"}
                                  </span>
                                  <button
                                    onClick={() => handleToggleStatus(tier)}
                                    className={`inline-flex items-center p-1 rounded-md transition-colors ${
                                      tier.isActive
                                        ? isDarkMode
                                          ? "text-orange-400 hover:bg-gray-700 hover:text-orange-300"
                                          : "text-orange-600 hover:bg-gray-100 hover:text-orange-700"
                                        : isDarkMode
                                        ? "text-green-400 hover:bg-gray-700 hover:text-green-300"
                                        : "text-green-600 hover:bg-gray-100 hover:text-green-700"
                                    }`}
                                    title={
                                      tier.isActive
                                        ? "Tạm dừng gói"
                                        : "Kích hoạt gói"
                                    }
                                  >
                                    {tier.isActive ? (
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                        ></path>
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        ></path>
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => openEditTierModal(tier)}
                                    className={`inline-flex items-center p-1.5 rounded-md ${
                                      isDarkMode
                                        ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                                        : "text-blue-600 hover:bg-gray-100 hover:text-blue-700"
                                    }`}
                                    title="Chỉnh sửa gói"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      ></path>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(tier)}
                                    className={`inline-flex items-center p-1.5 rounded-md ${
                                      isDarkMode
                                        ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                                        : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                                    }`}
                                    title="Xóa gói"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />

      {/* Add/Edit Premium Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {isEditing
                      ? "Chỉnh sửa gói người dùng"
                      : "Thêm gói người dùng mới"}
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowTierModal(false)}
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                } max-h-[70vh] overflow-y-auto`}
              >
                <form onSubmit={isEditing ? handleEditTier : handleAddTier}>
                  <div className="mb-5">
                    <label
                      htmlFor="name"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tên gói <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={tierForm.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập tên gói người dùng"
                      required
                    />
                  </div>

                  {/* Icon Selection */}
                  <div className="mb-5">
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Biểu tượng
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className={`w-full flex items-center justify-between px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`mr-2 ${
                              isDarkMode ? "text-blue-300" : "text-blue-600"
                            }`}
                          >
                            {getIconComponent(tierForm.icon)}
                          </div>
                          <span>
                            {availableIcons.find(
                              (i) => i.name === tierForm.icon
                            )?.label || "Chọn biểu tượng"}
                          </span>
                        </div>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {showIconPicker && (
                        <div
                          className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border border-gray-600"
                              : "bg-white border border-gray-200"
                          } max-h-60 overflow-y-auto`}
                        >
                          <div className="p-2 grid grid-cols-3 gap-2">
                            {availableIcons.map((icon) => (
                              <button
                                key={icon.name}
                                type="button"
                                onClick={() => handleIconSelect(icon.name)}
                                className={`flex flex-col items-center p-3 rounded-md hover:bg-opacity-80 transition-colors ${
                                  tierForm.icon === icon.name
                                    ? isDarkMode
                                      ? "bg-blue-900/50 text-blue-300"
                                      : "bg-blue-100 text-blue-600"
                                    : isDarkMode
                                    ? "hover:bg-gray-700 text-gray-300"
                                    : "hover:bg-gray-100 text-gray-600"
                                }`}
                              >
                                <div className="mb-1">{icon.component}</div>
                                <span className="text-xs text-center">
                                  {icon.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label
                      htmlFor="price"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Giá (VND) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      value={tierForm.price}
                      onChange={handleInputChange}
                      min="0"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>

                  <div className="mb-5">
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Quyền hạn
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={permissionInput}
                        onChange={(e) => setPermissionInput(e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        }`}
                        placeholder="Thêm quyền hạn"
                      />
                      <button
                        type="button"
                        onClick={handleAddPermission}
                        className={`px-4 py-2 rounded-r-md ${
                          isDarkMode
                            ? "bg-blue-700 hover:bg-blue-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        Thêm
                      </button>
                    </div>

                    <div className="mt-2">
                      {tierForm.permissions.length === 0 ? (
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Chưa có quyền hạn nào cho gói này
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {tierForm.permissions.map((permission, index) => (
                            <div
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-md text-sm ${
                                isDarkMode
                                  ? "bg-gray-600 text-gray-200"
                                  : "bg-gray-200 text-gray-800"
                              }`}
                            >
                              {permission}
                              <button
                                type="button"
                                onClick={() => handleRemovePermission(index)}
                                className="ml-1.5 text-red-500 hover:text-red-700"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        checked={tierForm.isActive}
                        onChange={handleInputChange}
                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                          isDarkMode ? "bg-gray-700 border-gray-600" : ""
                        }`}
                      />
                      <label
                        htmlFor="isActive"
                        className={`ml-2 block text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Gói đang hoạt động
                      </label>
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Chỉ những gói đang hoạt động mới hiển thị cho người dùng
                    </p>
                  </div>
                </form>
              </div>

              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={isEditing ? handleEditTier : handleAddTier}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isDarkMode
                      ? "bg-blue-700 hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  }`}
                >
                  {isEditing ? "Cập nhật" : "Thêm gói"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTierModal(false)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Xác nhận xóa gói người dùng
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                <div className="flex items-center justify-center mb-4 text-red-500">
                  <svg
                    className="w-12 h-12"
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
                    ></path>
                  </svg>
                </div>

                <p
                  className={`text-center text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-4`}
                >
                  Bạn có chắc chắn muốn xóa gói người dùng này không? Hành động
                  này không thể hoàn tác.
                </p>

                {tierToDelete && (
                  <div
                    className={`p-4 rounded-md ${
                      isDarkMode ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    <h4
                      className={`font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {tierToDelete.name}
                    </h4>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {formatPrice(tierToDelete.price)}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tierToDelete.isActive
                            ? isDarkMode
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-800"
                            : isDarkMode
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tierToDelete.isActive ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={handleDeleteTier}
                  disabled={isDeleting}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isDeleting
                      ? "bg-red-500 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-red-700 hover:bg-red-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
                      : "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận xóa"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumUserManagement;
