import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../firebase/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
  signOut,
} from "firebase/auth";
import { useUserRole } from "../../../context/UserRoleContext";
import { useTheme } from "../../../context/ThemeContext";
import {
  getAllCategoriesWithDocuments,
  updateUserOnlineStatus,
} from "../../../firebase/firestoreService";
import {
  getAllUsers,
  updateUserRole,
  updateUserSubscriptionType,
  deleteUserFromFirestore,
  saveUserToFirestore,
  updateUserPaidCategories,
  updateUserExcelPermission,
  updateUserExcelPercentage,
} from "../../../firebase/userService";
import UserAddForm from "../../../components/admin/user_management/UserAddForm";
import Sidebar from "../../../components/Sidebar";
import { DocumentMobileHeader } from "../../../components/MobileHeader";
import UserHeader from "../../../components/UserHeader";
import ThemeColorPicker from "../../../components/ThemeColorPicker";
import UserTable from "./UserTable";
import DeleteUserModal from "./DeleteUserModal";
import CategoryManagementModal from "./CategoryManagementModal";

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // Add active filter state
  const [activeFilter, setActiveFilter] = useState("all");

  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [userToManageCategories, setUserToManageCategories] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    role: "fuser",
  });
  const [newUserFormErrors, setNewUserFormErrors] = useState({});
  const [addingUser, setAddingUser] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [userOnlineStatus, setUserOnlineStatus] = useState({});

  const handleCategoryClick = (categoryId) => {
    setActiveCategoryId(categoryId);
  };

  useEffect(() => {
    if (categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) {
        return;
      }

      try {
        setLoading(true);
        const usersData = await getAllUsers();
        setUsers(usersData);

        // Initialize online status from user data - use isOnline property
        const initialStatus = {};
        usersData.forEach((user) => {
          initialStatus[user.id] = user.isOnline || false;
        });
        setUserOnlineStatus(initialStatus);
      } catch (err) {
        console.error("Error loading users:", err);
        setError("Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isAdmin]);
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);
  const getAdminUsersUrl = () => {
    const isDevelopment = window.location.hostname === "localhost";

    if (isDevelopment) {
      return "/admin/users";
    } else {
      return "/admin/users";
    }
  };

  const handleExcelPermissionToggle = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateUserExcelPermission(userId, newStatus);

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, isExcelEnabled: newStatus } : u
        )
      );

      setUpdateSuccess(
        `Quyền tải Excel đã được ${newStatus ? "bật" : "tắt"} thành công!`
      );
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating Excel permission:", error);
      setError("Lỗi khi cập nhật quyền tải Excel");
      setTimeout(() => setError(""), 3000);
    }
  };
  const handleExcelPercentageChange = async (userId, percentage) => {
    try {
      const numericPercentage = parseInt(percentage);
      if (
        isNaN(numericPercentage) ||
        numericPercentage < 0 ||
        numericPercentage > 100
      ) {
        setError("Tỷ lệ phải là số từ 0 đến 100");
        setTimeout(() => setError(""), 3000);
        return;
      }

      await updateUserExcelPercentage(userId, numericPercentage);

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, excelPercentage: numericPercentage } : u
        )
      );

      setUpdateSuccess(
        `Tỷ lệ tải Excel đã được cập nhật thành ${numericPercentage}%!`
      );
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating Excel percentage:", error);
      setError("Lỗi khi cập nhật tỷ lệ tải Excel");
      setTimeout(() => setError(""), 3000);
    }
  };
  const getDefaultExcelPercentage = (userData) => {
    if (userData.role === "admin") return 100;
    if (userData.subscriptionType === "full") return 100;
    if (userData.subscriptionType === "partial") return 50;
    if (userData.role === "puser") return 100;
    return 0;
  };

  const shouldShowExcelControls = (userData) => {
    return (
      userData.role === "admin" ||
      userData.subscriptionType === "full" ||
      userData.subscriptionType === "partial" ||
      userData.role === "puser"
    );
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);

      // Update the users array with the new role
      setUsers(
        users.map((u) => {
          if (u.id === userId) {
            // If changing to premium user, set default subscription type to full
            if (newRole === "puser" && u.role !== "puser") {
              return { ...u, role: newRole, subscriptionType: "full" };
            }
            // If changing away from premium, remove subscription type
            else if (u.role === "puser" && newRole !== "puser") {
              const updated = { ...u, role: newRole };
              delete updated.subscriptionType;
              return updated;
            }
            // Otherwise just update the role
            return { ...u, role: newRole };
          }
          return u;
        })
      );

      setUpdateSuccess("Vai trò người dùng đã được cập nhật thành công!");
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating user role:", error);
      setError("Lỗi khi cập nhật vai trò người dùng");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSubscriptionTypeChange = async (userId, newSubscriptionType) => {
    try {
      await updateUserSubscriptionType(userId, newSubscriptionType);
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, subscriptionType: newSubscriptionType } : u
        )
      );
      setUpdateSuccess("Loại tài khoản trả phí đã được cập nhật thành công!");
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating subscription type:", error);
      setError("Lỗi khi cập nhật loại tài khoản trả phí");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case "admin":
        return "Quản trị viên";
      case "puser":
        return "Người dùng trả phí";
      case "fuser":
        return "Người dùng miễn phí";
      default:
        return "Không xác định";
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const handleNewUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData({
      ...newUserData,
      [name]: value,
    });

    if (newUserFormErrors[name]) {
      setNewUserFormErrors({
        ...newUserFormErrors,
        [name]: "",
      });
    }
  };
  const handleCreateUser = async (e) => {
    e.preventDefault();

    setNewUserFormErrors({});
    setError(null);

    const errors = {};

    if (!newUserData.fullName.trim()) {
      errors.fullName = "Vui lòng nhập họ và tên";
    }

    if (!newUserData.phone.trim()) {
      errors.phone = "Vui lòng nhập số điện thoại";
    } else if (!isValidPhone(newUserData.phone)) {
      errors.phone = "Số điện thoại phải có đúng 10 chữ số";
    }

    if (!newUserData.email.trim()) {
      errors.email = "Vui lòng nhập email";
    } else if (!isValidEmail(newUserData.email)) {
      errors.email = "Định dạng email không hợp lệ";
    }

    if (!newUserData.password) {
      errors.password = "Vui lòng nhập mật khẩu";
    } else if (newUserData.password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (newUserData.password !== newUserData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (Object.keys(errors).length > 0) {
      setNewUserFormErrors(errors);
      return;
    }

    setAddingUser(true);

    try {
      const currentAdmin = auth.currentUser;
      const tempAuth = getAuth();
      try {
        const userCredential = await createUserWithEmailAndPassword(
          tempAuth,
          newUserData.email,
          newUserData.password
        );
        const newUserId = userCredential.user.uid;
        await updateProfile(userCredential.user, {
          displayName: newUserData.fullName,
        });
        // Tạo document Firestore cho user mới (nếu chưa có)
        await saveUserToFirestore(newUserId, {
          email: newUserData.email,
          displayName: newUserData.fullName,
          phoneNumber: newUserData.phone,
          role: newUserData.role,
          photoURL: null,
        });
        // Đánh dấu user mới là online ngay sau khi tạo
        try {
          await setUserOnline(newUserId);
        } catch (err) {
          console.error(
            "Lỗi khi cập nhật trạng thái online cho user mới:",
            err
          );
        }
        await signOut(tempAuth);
        if (currentAdmin) {
          await auth.updateCurrentUser(currentAdmin);
        }
        setUsers((prevUsers) => [
          ...prevUsers,
          {
            id: newUserId,
            email: newUserData.email,
            displayName: newUserData.fullName,
            phoneNumber: newUserData.phone,
            role: newUserData.role,
            photoURL: null,
          },
        ]);
        setNewUserData({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
          phone: "",
          role: "fuser",
        });
        setShowAddUserForm(false);
        setUpdateSuccess("Thêm người dùng thành công!");
      } catch (authError) {
        console.error("Lỗi khi tạo tài khoản:", authError);
        if (authError.code === "auth/email-already-in-use") {
          setError("Email đã được sử dụng. Vui lòng dùng email khác.");
        } else {
          setError(`Không thể tạo tài khoản: ${authError.message}`);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tạo tài khoản:", error);
      setError("Không thể tạo tài khoản. Vui lòng thử lại sau.");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteClick = (userData) => {
    setUserToDelete(userData);
    setShowDeleteModal(true);
  };
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeletingUser(true);

      await deleteUserFromFirestore(userToDelete.id);
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userToDelete.id)
      );

      setUpdateSuccess("Đã xóa người dùng khỏi Firestore thành công!");
      setError(
        "Lưu ý: Người dùng chỉ bị xóa khỏi Firestore. Để xóa tài khoản khỏi Authentication, bạn cần đăng nhập vào Firebase Console và xóa tài khoản thủ công hoặc triển khai Firebase Cloud Functions."
      );

      setTimeout(() => setUpdateSuccess(""), 5000);
      setTimeout(() => setError(""), 15000);

      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      setError(`Không thể xóa người dùng: ${error.message}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Thay thế hàm CategoryManagementModal nội bộ bằng component import
  useEffect(() => {
    const loadCategories = async () => {
      if (!isAdmin) {
        return;
      }

      try {
        setIsLoadingCategories(true);
        const categoriesWithDocs = await getAllCategoriesWithDocuments();
        setCategories(categoriesWithDocs);
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("Không thể tải danh mục");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [isAdmin]);

  const handleManageCategories = (userData) => {
    setUserToManageCategories(userData);
    // Initialize selected categories from user's data (if present)
    if (userData.paidCategories) {
      setSelectedCategories(userData.paidCategories.categories || []);
      setSelectedDocuments(userData.paidCategories.documents || []);
    } else {
      setSelectedCategories([]);
      setSelectedDocuments([]);
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategories = async () => {
    if (!userToManageCategories) return;

    try {
      setIsSavingCategories(true);

      const paidCategoriesData = {
        categories: selectedCategories,
        documents: selectedDocuments,
      };

      await updateUserPaidCategories(
        userToManageCategories.id,
        paidCategoriesData
      );

      // Update the users array with the new paid categories
      setUsers(
        users.map((u) =>
          u.id === userToManageCategories.id
            ? { ...u, paidCategories: paidCategoriesData }
            : u
        )
      );

      setUpdateSuccess("Danh mục trả phí đã được cập nhật thành công!");
      setTimeout(() => setUpdateSuccess(""), 3000);
      setShowCategoryModal(false);
    } catch (error) {
      console.error("Error updating user paid categories:", error);
      setError("Lỗi khi cập nhật danh mục trả phí");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      // If category is already selected, remove it
      setSelectedCategories(
        selectedCategories.filter((id) => id !== categoryId)
      );

      // Also remove all documents from this category
      const categoryDocs =
        categories
          .find((cat) => cat.id === categoryId)
          ?.documents.map((doc) => doc.id) || [];

      setSelectedDocuments(
        selectedDocuments.filter((id) => !categoryDocs.includes(id))
      );
    } else {
      // If category is not selected, add it
      setSelectedCategories([...selectedCategories, categoryId]);

      // Also add all documents from this category
      const categoryDocs =
        categories
          .find((cat) => cat.id === categoryId)
          ?.documents.map((doc) => doc.id) || [];

      // Only add documents that aren't already selected
      const newDocs = categoryDocs.filter(
        (id) => !selectedDocuments.includes(id)
      );
      setSelectedDocuments([...selectedDocuments, ...newDocs]);
    }
  };

  const handleDocumentChange = (docId, categoryId) => {
    if (selectedDocuments.includes(docId)) {
      // If document is already selected, remove it
      setSelectedDocuments(selectedDocuments.filter((id) => id !== docId));

      // Check if we need to deselect the category
      const categoryDocs =
        categories
          .find((cat) => cat.id === categoryId)
          ?.documents.map((doc) => doc.id) || [];

      const hasSelectedDocsFromCategory = categoryDocs.some((id) =>
        selectedDocuments
          .filter((selectedId) => selectedId !== docId)
          .includes(id)
      );

      if (!hasSelectedDocsFromCategory) {
        setSelectedCategories(
          selectedCategories.filter((id) => id !== categoryId)
        );
      }
    } else {
      // If document is not selected, add it
      setSelectedDocuments([...selectedDocuments, docId]);

      // Make sure the category is selected
      if (!selectedCategories.includes(categoryId)) {
        setSelectedCategories([...selectedCategories, categoryId]);
      }
    }
  };

  // Add search bars for categories and documents with a 20-character input limit
  const [categorySearch, setCategorySearch] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");

  const handleCategorySearch = (e) => {
    const value = e.target.value.slice(0, 20); // Limit input to 20 characters
    setCategorySearch(value);
  };

  const handleDocumentSearch = (e) => {
    const value = e.target.value.slice(0, 20); // Limit input to 20 characters
    setDocumentSearch(value);
  };

  const filteredCategories = categories.filter((category) =>
    category.title.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredDocuments =
    categories
      .find((category) => category.id === activeCategoryId)
      ?.documents.filter((document) =>
        document.title.toLowerCase().includes(documentSearch.toLowerCase())
      ) || [];

  // Đếm số lượng từng loại người dùng cho các badge bộ lọc
  const getUserCounts = () => {
    const counts = {
      all: users.length,
      admin: 0,
      "premium-full": 0,
      "premium-partial": 0,
      free: 0,
      online: 0,
    };
    users.forEach((u) => {
      if (u.role === "admin") counts.admin++;
      if (u.role === "puser" && u.subscriptionType === "full")
        counts["premium-full"]++;
      if (u.role === "puser" && u.subscriptionType === "partial")
        counts["premium-partial"]++;
      if (u.role === "fuser" || (!u.role && !u.subscriptionType)) counts.free++;
      if (userOnlineStatus && userOnlineStatus[u.id]) counts.online++;
    });
    return counts;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [gotoPageInput, setGotoPageInput] = useState(1);
  const USERS_PER_PAGE = 10;

  // Tính toán filteredUsers dựa trên search và filter
  const filteredUsers = (() => {
    let filtered = users;
    if (search.trim()) {
      const keyword = search.trim();
      filtered = filtered.filter(
        (u) =>
          (u.email && u.email.includes(keyword)) ||
          (u.displayName && u.displayName.includes(keyword)) ||
          (u.phoneNumber && u.phoneNumber.includes(keyword))
      );
    }
    if (activeFilter === "admin") {
      filtered = filtered.filter((u) => u.role === "admin");
    } else if (activeFilter === "premium-full") {
      filtered = filtered.filter(
        (u) => u.role === "puser" && u.subscriptionType === "full"
      );
    } else if (activeFilter === "premium-partial") {
      filtered = filtered.filter(
        (u) => u.role === "puser" && u.subscriptionType === "partial"
      );
    } else if (activeFilter === "free") {
      filtered = filtered.filter(
        (u) => u.role === "fuser" || (!u.role && !u.subscriptionType)
      );
    } else if (activeFilter === "online") {
      filtered = filtered.filter(
        (u) => userOnlineStatus && userOnlineStatus[u.id]
      );
    }
    return filtered;
  })();

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  );

  // Lấy user cho trang hiện tại
  const getFilteredUsers = () => {
    const startIdx = (currentPage - 1) * USERS_PER_PAGE;
    const endIdx = startIdx + USERS_PER_PAGE;
    return filteredUsers.slice(startIdx, endIdx);
  };

  // Khi search/filter đổi, về trang 1
  useEffect(() => {
    setCurrentPage(1);
    setGotoPageInput(1);
  }, [search, activeFilter]);

  // Toggle the online status of a user by userId
  const toggleUserOnlineStatus = (userId) => {
    setUserOnlineStatus((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // --- Render ---
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
            sidebarData={categories}
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
            className={`p-4 md:p-6 pb-10 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
                {/* Button to add user if needed */}
                <button
                  onClick={() => setShowAddUserForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Thêm người dùng
                </button>
              </div>

              {/* Thông báo */}
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

              {updateSuccess && (
                <div
                  className={`px-4 py-3 rounded-md border ${
                    isDarkMode
                      ? "bg-green-900/30 border-green-800 text-green-300"
                      : "bg-green-100 border-green-400 text-green-700"
                  } mb-4`}
                >
                  <span>{updateSuccess}</span>
                </div>
              )}

              {/* Thanh tìm kiếm user nằm trên dãy nút lọc */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm theo email, tên hoặc số điện thoại..."
                  style={{
                    maxWidth: 400,
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                />
                {/* Dãy nút lọc người dùng */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {/* All Users Filter */}
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === "all"
                        ? isDarkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    Tất cả
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === "all"
                          ? isDarkMode
                            ? "bg-blue-500 text-white"
                            : "bg-blue-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {getUserCounts().all}
                    </span>
                  </button>

                  {/* Admin Filter */}
                  <button
                    onClick={() => setActiveFilter("admin")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === "admin"
                        ? isDarkMode
                          ? "bg-purple-600 text-white"
                          : "bg-purple-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Quản trị viên
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === "admin"
                          ? isDarkMode
                            ? "bg-purple-500 text-white"
                            : "bg-purple-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {getUserCounts().admin}
                    </span>
                  </button>

                  {/* Premium Full Filter */}
                  <button
                    onClick={() => setActiveFilter("premium-full")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === "premium-full"
                        ? isDarkMode
                          ? "bg-green-600 text-white"
                          : "bg-green-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    Trả phí toàn bộ
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === "premium-full"
                          ? isDarkMode
                            ? "bg-green-500 text-white"
                            : "bg-green-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {getUserCounts()["premium-full"]}
                    </span>
                  </button>

                  {/* Premium Partial Filter */}
                  <button
                    onClick={() => setActiveFilter("premium-partial")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === "premium-partial"
                        ? isDarkMode
                          ? "bg-teal-600 text-white"
                          : "bg-teal-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                    Trả phí theo mục
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === "premium-partial"
                          ? isDarkMode
                            ? "bg-teal-500 text-white"
                            : "bg-teal-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {getUserCounts()["premium-partial"]}
                    </span>
                  </button>

                  {/* Free Users Filter */}
                  <button
                    onClick={() => setActiveFilter("free")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === "free"
                        ? isDarkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Người dùng miễn phí
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === "free"
                          ? isDarkMode
                            ? "bg-blue-500 text-white"
                            : "bg-blue-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {getUserCounts().free}
                    </span>
                  </button>

                  {/* Online Users Filter */}
                  <button
                    onClick={() => setActiveFilter("online")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === "online"
                        ? isDarkMode
                          ? "bg-green-600 text-white"
                          : "bg-green-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span
                        className={`animate-ping absolute h-3 w-3 rounded-full ${
                          isDarkMode
                            ? "bg-green-400 opacity-50"
                            : "bg-green-500 opacity-50"
                        }`}
                      ></span>
                      <span
                        className={`relative rounded-full h-2.5 w-2.5 ${
                          isDarkMode ? "bg-green-500" : "bg-green-600"
                        }`}
                      ></span>
                    </span>
                    Đang hoạt động
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        activeFilter === "online"
                          ? isDarkMode
                            ? "bg-green-500 text-white"
                            : "bg-green-500 text-white"
                          : isDarkMode
                          ? "bg-gray-600 text-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {getUserCounts().online}
                    </span>
                  </button>
                </div>
              </div>

              {/* Form popup thêm tài khoản */}
              <UserAddForm
                isOpen={showAddUserForm}
                onClose={() => setShowAddUserForm(false)}
                onSubmit={handleCreateUser}
                formData={newUserData}
                formErrors={newUserFormErrors}
                loading={addingUser}
                onChange={handleNewUserInputChange}
              />

              {/* Bảng người dùng */}
              <div
                className={`rounded-lg shadow-md overflow-hidden ${
                  isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
                }`}
              >
                <div
                  className={`px-6 py-4 ${
                    isDarkMode
                      ? "bg-gray-700/50 border-b border-gray-700"
                      : "bg-gray-50 border-b border-gray-200"
                  }`}
                >
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {activeFilter === "all"
                      ? `Hiển thị tất cả ${users.length} người dùng trong hệ thống`
                      : `Hiển thị ${getFilteredUsers().length} trong tổng số ${
                          users.length
                        } người dùng`}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <svg
                        className="animate-spin h-10 w-10 mb-4 text-gray-500"
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
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Đang tải danh sách người dùng...
                      </p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <svg
                          className="h-8 w-8 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          ></path>
                        </svg>
                      </div>
                      <p
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Chưa có người dùng nào
                      </p>
                      <p
                        className={`mt-2 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Bạn có thể tạo người dùng mới bằng cách nhấn vào nút
                        "Thêm người dùng"
                      </p>
                    </div>
                  ) : getFilteredUsers().length === 0 ? (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <svg
                          className="h-8 w-8 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          ></path>
                        </svg>
                      </div>
                      <p
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Không tìm thấy người dùng phù hợp
                      </p>
                      <p
                        className={`mt-2 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Thử chọn bộ lọc khác để tìm kiếm
                      </p>
                    </div>
                  ) : (
                    <UserTable
                      users={users}
                      filteredUsers={getFilteredUsers()}
                      loading={loading}
                      isDarkMode={isDarkMode}
                      userOnlineStatus={userOnlineStatus}
                      toggleUserOnlineStatus={toggleUserOnlineStatus}
                      handleRoleChange={handleRoleChange}
                      handleSubscriptionTypeChange={
                        handleSubscriptionTypeChange
                      }
                      handleManageCategories={handleManageCategories}
                      shouldShowExcelControls={shouldShowExcelControls}
                      handleExcelPermissionToggle={handleExcelPermissionToggle}
                      handleExcelPercentageChange={handleExcelPercentageChange}
                      getDefaultExcelPercentage={getDefaultExcelPercentage}
                      handleDeleteClick={handleDeleteClick}
                      user={user}
                      getRoleName={getRoleName}
                    />
                  )}
                </div>
                {getFilteredUsers().length > 0 && (
                  <div className="flex justify-center items-center gap-2 mt-6 mb-4">
                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        setGotoPageInput((p) => Math.max(1, p - 1));
                      }}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${
                        currentPage === 1
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      Trước
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={gotoPageInput}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val === "") setGotoPageInput("");
                        else
                          setGotoPageInput(
                            Math.max(1, Math.min(totalPages, Number(val)))
                          );
                      }}
                      onBlur={() => {
                        let page = Number(gotoPageInput);
                        if (!page || page < 1) page = 1;
                        if (page > totalPages) page = totalPages;
                        setCurrentPage(page);
                        setGotoPageInput(page);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          let page = Number(gotoPageInput);
                          if (!page || page < 1) page = 1;
                          if (page > totalPages) page = totalPages;
                          setCurrentPage(page);
                          setGotoPageInput(page);
                        }
                      }}
                      className="w-14 px-2 py-1 border rounded text-center mx-1"
                      style={{ width: 48 }}
                    />
                    <span>/ {totalPages}</span>
                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        setGotoPageInput((p) => Math.min(totalPages, p + 1));
                      }}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded ${
                        currentPage === totalPages
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />
      {/* Add the delete confirmation modal */}
      <DeleteUserModal
        showDeleteModal={showDeleteModal}
        userToDelete={userToDelete}
        isDarkMode={isDarkMode}
        isDeletingUser={isDeletingUser}
        confirmDeleteUser={confirmDeleteUser}
        setShowDeleteModal={setShowDeleteModal}
      />
      {/* Add the category management modal */}
      <CategoryManagementModal
        showCategoryModal={showCategoryModal}
        userToManageCategories={userToManageCategories}
        isDarkMode={isDarkMode}
        isLoadingCategories={isLoadingCategories}
        filteredCategories={filteredCategories}
        filteredDocuments={filteredDocuments}
        activeCategoryId={activeCategoryId}
        selectedCategories={selectedCategories}
        selectedDocuments={selectedDocuments}
        handleCategoryClick={handleCategoryClick}
        handleCategoryChange={handleCategoryChange}
        handleDocumentChange={handleDocumentChange}
        handleCategorySearch={handleCategorySearch}
        handleDocumentSearch={handleDocumentSearch}
        categorySearch={categorySearch}
        documentSearch={documentSearch}
        handleSaveCategories={handleSaveCategories}
        isSavingCategories={isSavingCategories}
        setShowCategoryModal={setShowCategoryModal}
      />
    </div>
  );
};

export default AdminUserManagement;
