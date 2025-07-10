import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
  signOut,
} from "firebase/auth";
import { useUserRole } from "../../context/UserRoleContext";
import { useTheme } from "../../context/ThemeContext";
import {
  getAllCategoriesWithDocuments,
  updateUserOnlineStatus,
} from "../../firebase/firestoreService";
import {
  getAllUsers,
  updateUserRole,
  updateUserSubscriptionType,
  deleteUserFromFirestore,
  saveUserToFirestore,
  updateUserPaidCategories,
  updateUserExcelPermission,
  updateUserExcelPercentage,
} from "../../firebase/userService";
import UserAddForm from "../../components/admin/UserAddForm";
import Sidebar from "../../components/Sidebar";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import UserHeader from "../../components/UserHeader";
import ThemeColorPicker from "../../components/ThemeColorPicker";

const AdminUserManagement = () => {
  // ...existing code remains the same...
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

        await saveUserToFirestore(newUserId, {
          email: newUserData.email,
          displayName: newUserData.fullName,
          phoneNumber: newUserData.phone,
          role: newUserData.role,
          photoURL: null,
        });

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
  const DeleteUserModal = () => {
    if (!showDeleteModal || !userToDelete) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
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
            {/* Modal Header */}
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
                  Xác nhận xóa người dùng
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

            {/* Modal Body */}
            <div
              className={`px-6 py-5 ${
                isDarkMode
                  ? "bg-gray-700 text-gray-200"
                  : "bg-gray-50 text-gray-800"
              }`}
            >
              <div className="mb-5">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-4`}
                >
                  Bạn có chắc chắn muốn xóa người dùng sau đây?
                </p>

                <div
                  className="flex items-center p-4 rounded-md mb-4 border border-dashed bg-opacity-50
                  ${isDarkMode ? 'bg-gray-600/50 border-gray-500' : 'bg-gray-100 border-gray-300'}"
                >
                  {/* User info */}
                  <div className="flex items-center">
                    {userToDelete?.photoURL ? (
                      <img
                        className="h-10 w-10 rounded-full mr-3"
                        src={userToDelete.photoURL}
                        alt=""
                      />
                    ) : (
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-gray-200" : "text-gray-600"
                          }`}
                        >
                          {userToDelete?.displayName
                            ? userToDelete.displayName.charAt(0).toUpperCase()
                            : "?"}
                        </span>
                      </div>
                    )}
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {userToDelete?.displayName || "Không có tên"}
                      </div>
                      <div
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {userToDelete?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning message */}
                <div
                  className={`p-3 rounded-md border ${
                    isDarkMode
                      ? "bg-red-900/30 text-red-300 border-red-800"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 mr-2 text-red-400 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm">
                      <span className="font-medium">Cảnh báo: </span>
                      <span>
                        Thao tác này chỉ xóa người dùng khỏi cơ sở dữ liệu,
                        không xóa tài khoản xác thực.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={`px-6 py-4 flex sm:flex-row-reverse ${
                isDarkMode
                  ? "bg-gray-700 border-t border-gray-600"
                  : "bg-gray-50 border-t border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
                className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                  isDeletingUser
                    ? "bg-red-500 cursor-not-allowed"
                    : isDarkMode
                    ? "bg-red-700 hover:bg-red-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
                    : "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                }`}
              >
                {isDeletingUser ? (
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
                  <>
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    Xác nhận xóa
                  </>
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
    );
  };

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

  const CategoryManagementModal = () => {
    if (!showCategoryModal || !userToManageCategories) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-black bg-opacity-70"></div>
          </div>

          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>

          <div
            className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ${
              isDarkMode
                ? "bg-gray-700 border border-gray-600"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            {/* Modal Header */}
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
                  Quản lý danh mục trả phí cho người dùng
                </h3>
                <button
                  type="button"
                  className={`rounded-md p-1 focus:outline-none ${
                    isDarkMode
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setShowCategoryModal(false)}
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

            {/* Modal Body */}
            <div
              className={`px-6 py-5 ${
                isDarkMode
                  ? "bg-gray-700 text-gray-200"
                  : "bg-gray-50 text-gray-800"
              } max-h-[70vh] overflow-y-auto`}
            >
              <div className="mb-5">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-4`}
                >
                  Chọn danh mục và tài liệu có thể truy cập cho người dùng:
                </p>

                <div
                  className="flex items-center p-4 rounded-md mb-4 border border-dashed bg-opacity-50
                  ${isDarkMode ? 'bg-gray-600/50 border-gray-500' : 'bg-gray-100 border-gray-300'}"
                >
                  {/* User info */}
                  <div className="flex items-center">
                    {userToManageCategories?.photoURL ? (
                      <img
                        className="h-10 w-10 rounded-full mr-3"
                        src={userToManageCategories.photoURL}
                        alt=""
                      />
                    ) : (
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`text-lg font-medium ${
                            isDarkMode ? "text-gray-200" : "text-gray-600"
                          }`}
                        >
                          {userToManageCategories?.displayName
                            ? userToManageCategories.displayName
                                .charAt(0)
                                .toUpperCase()
                            : "?"}
                        </span>
                      </div>
                    )}
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {userToManageCategories?.displayName || "Không có tên"}
                      </div>
                      <div
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {userToManageCategories?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {isLoadingCategories ? (
                  <div className="flex justify-center items-center py-8">
                    <svg
                      className="animate-spin h-8 w-8 text-gray-500"
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
                  </div>
                ) : (
                  <div className="flex">
                    <div className="w-1/2 overflow-y-auto max-h-[70vh] border-r ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}">
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={handleCategorySearch}
                        className={`w-full px-3 py-2 mb-4 border ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "focus:ring-green-500 focus:border-green-500"
                            : "focus:ring-green-500 focus:border-green-500"
                        }`}
                      />
                      {filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className={`p-4 cursor-pointer ${
                            activeCategoryId === category.id
                              ? isDarkMode
                                ? "bg-gray-800 text-white"
                                : "bg-gray-200 text-gray-900"
                              : isDarkMode
                              ? "bg-gray-700 text-gray-300"
                              : "bg-white text-gray-700"
                          }`}
                          onClick={() => handleCategoryClick(category.id)}
                        >
                          <input
                            type="checkbox"
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleCategoryChange(category.id)}
                            className="mr-2"
                          />
                          <label htmlFor={`category-${category.id}`}>
                            {category.title || "Danh mục không có tên"}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="w-1/2 overflow-y-auto max-h-[70vh] p-4">
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={documentSearch}
                        onChange={handleDocumentSearch}
                        className={`w-full px-3 py-2 mb-4 border ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "focus:ring-green-500 focus:border-green-500"
                            : "focus:ring-green-500 focus:border-green-500"
                        }`}
                      />
                      {filteredDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`document-${doc.id}`}
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() =>
                              handleDocumentChange(doc.id, activeCategoryId)
                            }
                            className="mr-2"
                          />
                          <label htmlFor={`document-${doc.id}`}>
                            {doc.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={`px-6 py-4 flex sm:flex-row-reverse ${
                isDarkMode
                  ? "bg-gray-700 border-t border-gray-600"
                  : "bg-gray-50 border-t border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={handleSaveCategories}
                disabled={isSavingCategories}
                className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                  isSavingCategories
                    ? "bg-green-500 cursor-not-allowed"
                    : isDarkMode
                    ? "bg-green-700 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                    : "bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                }`}
              >
                {isSavingCategories ? (
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
                    Đang lưu...
                  </>
                ) : (
                  <>
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
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Lưu thay đổi
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
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
    );
  };

  // Add new state for user online status
  const [userOnlineStatus, setUserOnlineStatus] = useState({});

  // Fix the toggle function to update isOnline instead of isLoggedIn
  const toggleUserOnlineStatus = async (userId) => {
    try {
      const newStatus = !userOnlineStatus[userId];

      // Update in Firestore with the correct property name
      await updateUserOnlineStatus(userId, newStatus);

      // Update local state
      setUserOnlineStatus((prev) => ({
        ...prev,
        [userId]: newStatus,
      }));

      // Update users array with the correct property name
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, isOnline: newStatus } : u))
      );

      setUpdateSuccess(
        `Trạng thái hoạt động của người dùng đã được ${
          newStatus ? "bật" : "tắt"
        } thành công!`
      );
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating user online status:", error);
      setError("Lỗi khi cập nhật trạng thái hoạt động của người dùng");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Function to filter users based on activeFilter
  const getFilteredUsers = () => {
    return users.filter((userData) => {
      switch (activeFilter) {
        case "admin":
          return userData.role === "admin";
        case "premium-full":
          return (
            userData.role === "puser" && userData.subscriptionType === "full"
          );
        case "premium-partial":
          return (
            userData.role === "puser" && userData.subscriptionType === "partial"
          );
        case "free":
          return userData.role === "fuser";
        case "online":
          return userOnlineStatus[userData.id] === true;
        case "all":
        default:
          return true;
      }
    });
  };

  // Get count of each user type for filter badges
  const getUserCounts = () => {
    const counts = {
      all: users.length,
      admin: users.filter((u) => u.role === "admin").length,
      "premium-full": users.filter(
        (u) => u.role === "puser" && u.subscriptionType === "full"
      ).length,
      "premium-partial": users.filter(
        (u) => u.role === "puser" && u.subscriptionType === "partial"
      ).length,
      free: users.filter((u) => u.role === "fuser").length,
      online: Object.values(userOnlineStatus).filter(
        (status) => status === true
      ).length,
    };
    return counts;
  };

  // Parse filter from URL query parameters when component mounts
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filterParam = searchParams.get("filter");
    if (
      filterParam &&
      [
        "all",
        "admin",
        "premium-full",
        "premium-partial",
        "free",
        "online",
      ].includes(filterParam)
    ) {
      setActiveFilter(filterParam);
    }
  }, [location.search]);

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
            className={`p-4 md:p-6 ${
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

              {/* Add filter buttons */}
              <div className="mb-6 overflow-x-auto">
                <div className="flex flex-wrap gap-2">
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
                            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            Người dùng
                          </th>
                          <th
                            scope="col"
                            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            Email
                          </th>
                          <th
                            scope="col"
                            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            Vai trò
                          </th>
                          <th
                            scope="col"
                            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            Thao tác
                          </th>
                          <th
                            scope="col"
                            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            Excel Controls
                          </th>
                          <th
                            scope="col"
                            className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            Xóa
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isDarkMode ? "divide-gray-700" : "divide-gray-200"
                        }`}
                      >
                        {/* Update to use filtered users */}
                        {getFilteredUsers().map((userData) => (
                          <tr
                            key={userData.id}
                            className={
                              isDarkMode
                                ? "hover:bg-gray-700/30"
                                : "hover:bg-gray-50"
                            }
                          >
                            {/* Rest of the user row code remains the same */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {userData.photoURL ? (
                                  <img
                                    className="h-10 w-10 rounded-full mr-3"
                                    src={userData.photoURL}
                                    alt=""
                                  />
                                ) : (
                                  <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                                      isDarkMode ? "bg-gray-700" : "bg-gray-200"
                                    }`}
                                  >
                                    <span
                                      className={`text-lg font-medium ${
                                        isDarkMode
                                          ? "text-gray-200"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {userData.displayName
                                        ? userData.displayName
                                            .charAt(0)
                                            .toUpperCase()
                                        : "?"}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {userData.displayName || "Không có tên"}
                                  </div>
                                  <div
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {userData.phoneNumber ||
                                      "Chưa cập nhật SĐT"}
                                  </div>
                                  {/* Update the display logic to show the correct status */}
                                  <div className="flex items-center mt-1">
                                    <button
                                      onClick={() =>
                                        toggleUserOnlineStatus(userData.id)
                                      }
                                      className={`flex items-center text-xs px-2 py-0.5 rounded-full ${
                                        userOnlineStatus[userData.id]
                                          ? `${
                                              isDarkMode
                                                ? "bg-green-900 text-green-200"
                                                : "bg-green-100 text-green-800"
                                            }`
                                          : `${
                                              isDarkMode
                                                ? "bg-red-900 text-red-200"
                                                : "bg-red-100 text-red-800"
                                            }`
                                      }`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full mr-1.5 ${
                                          userOnlineStatus[userData.id]
                                            ? "bg-green-400"
                                            : "bg-red-400"
                                        }`}
                                      ></span>
                                      {userOnlineStatus[userData.id]
                                        ? "Đang hoạt động"
                                        : "Không hoạt động"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-200" : "text-gray-900"
                                }`}
                              >
                                {userData.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                {/* Khối 1: Vai trò */}
                                <span
                                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${
                                    userData.role === "admin"
                                      ? `${
                                          isDarkMode
                                            ? "bg-purple-900 text-purple-200"
                                            : "bg-purple-100 text-purple-800"
                                        }`
                                      : userData.role === "puser"
                                      ? `${
                                          isDarkMode
                                            ? "bg-green-900 text-green-200"
                                            : "bg-green-100 text-green-800"
                                        }`
                                      : `${
                                          isDarkMode
                                            ? "bg-blue-900 text-blue-200"
                                            : "bg-blue-100 text-blue-800"
                                        }`
                                  }`}
                                  style={{
                                    whiteSpace: "pre-line",
                                    wordBreak: "break-word",
                                    maxWidth: "220px",
                                  }}
                                >
                                  {getRoleName(userData.role)}
                                </span>

                                {/* Khối 2: Loại đăng ký */}
                                {userData.role === "puser" &&
                                  userData.subscriptionType && (
                                    <span
                                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded
                                      ${
                                        userData.subscriptionType === "full"
                                          ? isDarkMode
                                            ? "bg-yellow-700 text-yellow-200"
                                            : "bg-yellow-100 text-yellow-800"
                                          : userData.subscriptionType ===
                                            "partial"
                                          ? isDarkMode
                                            ? "bg-teal-700 text-teal-200"
                                            : "bg-teal-100 text-teal-800"
                                          : ""
                                      }
                                    `}
                                      style={{
                                        whiteSpace: "pre-line",
                                        wordBreak: "break-word",
                                        maxWidth: "220px",
                                      }}
                                    >
                                      {userData.subscriptionType === "full"
                                        ? "Trả phí toàn bộ"
                                        : "Trả phí theo mục"}
                                    </span>
                                  )}
                                {userData.role === "puser" &&
                                  userData.subscriptionType === "partial" &&
                                  userData.paidCategories && (
                                    <span
                                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${
                                        isDarkMode
                                          ? "bg-blue-700 text-blue-200"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                      style={{
                                        whiteSpace: "pre-line",
                                        wordBreak: "break-word",
                                        maxWidth: "220px",
                                      }}
                                    >
                                      Đã cấu hình
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <select
                                value={userData.role || "fuser"}
                                onChange={(e) =>
                                  handleRoleChange(userData.id, e.target.value)
                                }
                                className={`block w-full px-3 py-2 border ${
                                  isDarkMode
                                    ? "bg-gray-700 border-gray-600 text-white"
                                    : "bg-white border-gray-300 text-gray-900"
                                } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                                  isDarkMode
                                    ? "focus:ring-green-500 focus:border-green-500"
                                    : "focus:ring-green-500 focus:border-green-500"
                                } text-sm py-1`}
                              >
                                <option value="fuser">
                                  Người dùng miễn phí
                                </option>
                                <option value="puser">
                                  Người dùng trả phí
                                </option>
                                <option value="admin">Quản trị viên</option>
                              </select>
                              {/* Subscription type selection for premium users */}
                              {userData.role === "puser" && (
                                <select
                                  value={userData.subscriptionType || "full"}
                                  onChange={(e) =>
                                    handleSubscriptionTypeChange(
                                      userData.id,
                                      e.target.value
                                    )
                                  }
                                  className={`block w-full mt-2 px-3 py-2 border ${
                                    isDarkMode
                                      ? "bg-gray-700 border-gray-600 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                                    isDarkMode
                                      ? "focus:ring-green-500 focus:border-green-500"
                                      : "focus:ring-green-500 focus:border-green-500"
                                  } text-sm py-1`}
                                >
                                  <option value="full">Trả phí toàn bộ</option>
                                  <option value="partial">
                                    Trả phí theo mục
                                  </option>
                                </select>
                              )}

                              {/* Category management button for partial payment users */}
                              {userData.role === "puser" &&
                                userData.subscriptionType === "partial" && (
                                  <button
                                    onClick={() =>
                                      handleManageCategories(userData)
                                    }
                                    className={`w-full mt-2 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                                      isDarkMode
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                                    }`}
                                  >
                                    <svg
                                      className="w-4 h-4 mr-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                      ></path>
                                    </svg>
                                    Tùy chỉnh danh mục
                                  </button>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {shouldShowExcelControls(userData) ? (
                                <div className="space-y-2">
                                  {/* Excel Permission Toggle */}
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() =>
                                        handleExcelPermissionToggle(
                                          userData.id,
                                          userData.isExcelEnabled !== false
                                        )
                                      }
                                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        userData.isExcelEnabled !== false
                                          ? "bg-green-600 focus:ring-green-500"
                                          : "bg-gray-200 focus:ring-gray-500"
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          userData.isExcelEnabled !== false
                                            ? "translate-x-5"
                                            : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                    <span
                                      className={`text-sm ${
                                        isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      Excel{" "}
                                      {userData.isExcelEnabled !== false
                                        ? "Bật"
                                        : "Tắt"}
                                    </span>
                                  </div>

                                  {/* Excel Percentage Input */}
                                  {userData.isExcelEnabled !== false && (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={
                                          userData.excelPercentage ||
                                          getDefaultExcelPercentage(userData)
                                        }
                                        onChange={(e) =>
                                          handleExcelPercentageChange(
                                            userData.id,
                                            e.target.value
                                          )
                                        }
                                        className={`w-16 px-2 py-1 text-sm border rounded ${
                                          isDarkMode
                                            ? "bg-gray-700 border-gray-600 text-white"
                                            : "bg-white border-gray-300 text-gray-900"
                                        } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                      />
                                      <span
                                        className={`text-sm ${
                                          isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        %
                                      </span>
                                    </div>
                                  )}

                                  {/* Default percentage info */}
                                  <div
                                    className={`text-xs ${
                                      isDarkMode
                                        ? "text-gray-500"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    Mặc định:{" "}
                                    {getDefaultExcelPercentage(userData)}%
                                  </div>
                                </div>
                              ) : (
                                <span
                                  className={`text-sm ${
                                    isDarkMode
                                      ? "text-gray-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  Không khả dụng
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              <button
                                onClick={() => handleDeleteClick(userData)}
                                disabled={userData.id === user?.uid}
                                className={`inline-flex items-center p-1.5 rounded-md ${
                                  userData.id === user?.uid
                                    ? `${
                                        isDarkMode
                                          ? "text-gray-600 cursor-not-allowed"
                                          : "text-gray-400 cursor-not-allowed"
                                      }`
                                    : `${
                                        isDarkMode
                                          ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                                          : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                                      }`
                                }`}
                                title={
                                  userData.id === user?.uid
                                    ? "Không thể xóa tài khoản đang đăng nhập"
                                    : "Xóa người dùng"
                                }
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
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
      {/* Add the delete confirmation modal */} <DeleteUserModal />
      {/* Add the category management modal */}
      <CategoryManagementModal />
    </div>
  );
};

export default AdminUserManagement;
