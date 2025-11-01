import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import { useUserRole } from "../../../context/UserRoleContext";
import {
  getAllUsers,
  updateUserRole,
  deleteUserFromFirestore,
  saveUserToFirestore,
} from "../../../firebase/firestoreService";
import { auth } from "../../../firebase/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import UserAddForm from "./UserAddForm";
import Sidebar from "../../Sidebar";
import { DocumentMobileHeader } from "../../../components/MobileHeader";
import UserHeader from "../../UserHeader";
import ThemeColorPicker from "../../../components/ThemeColorPicker";

const UserManagementContent = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const { isDarkMode } = useTheme();
  const { isAdmin } = useUserRole();
  const [user] = useAuthState(auth);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");
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

  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
    const fetchUsers = async () => {
      if (!isAdmin) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);

        // Fetch users with limit to improve performance
        const allUsers = await getAllUsers();

        // Process users in a batch if needed
        const processedUsers = allUsers.map((user) => ({
          ...user,
          // Default values for any missing properties
          displayName: user.displayName || "No Name",
          email: user.email || "No Email",
          role: user.role || "fuser",
        }));

        setUsers(processedUsers);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng:", error);
        setError("Không thể tải danh sách người dùng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, navigate]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdateSuccess("");
      setError("");
      await updateUserRole(userId, newRole);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      setUpdateSuccess("Cập nhật vai trò người dùng thành công!");
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Lỗi khi cập nhật vai trò người dùng:", error);
      setError("Không thể cập nhật vai trò người dùng. Vui lòng thử lại sau.");
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
    setError("");
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserData.email,
        newUserData.password
      );

      await updateProfile(userCredential.user, {
        displayName: newUserData.fullName,
      });

      await saveUserToFirestore(userCredential.user.uid, {
        email: newUserData.email,
        displayName: newUserData.fullName,
        phoneNumber: newUserData.phone,
        role: newUserData.role,
        photoURL: null,
      });

      setUsers([
        ...users,
        {
          id: userCredential.user.uid,
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
      setTimeout(() => setUpdateSuccess(""), 3000);
    } catch (error) {
      console.error("Lỗi khi tạo tài khoản:", error);
      if (error.code === "auth/email-already-in-use") {
        setError("Email đã được sử dụng. Vui lòng dùng email khác.");
      } else {
        setError("Không thể tạo tài khoản. Vui lòng thử lại sau.");
      }
      setTimeout(() => setError(""), 3000);
    } finally {
      setAddingUser(false);
    }
  };
  const handleDeleteUser = async (userId) => {
    try {
      setIsDeleting(true);
      await deleteUserFromFirestore(userId);
      setUsers(users.filter((u) => u.id !== userId));
      setDeleteSuccess("Xóa người dùng thành công!");
      setTimeout(() => {
        setUserToDelete(null);
        setShowDeleteModal(false);
        setDeleteSuccess("");
      }, 1500);
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      setDeleteError("Không thể xóa người dùng. Vui lòng thử lại sau.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (userData) => {
    setUserToDelete(userData);
    setShowDeleteModal(true);
    setDeleteSuccess("");
    setDeleteError("");
  };

  const inputClasses = `block w-full px-3 py-2 border ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white"
      : "bg-white border-gray-300 text-gray-900"
  } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
    isDarkMode
      ? "focus:ring-green-500 focus:border-green-500"
      : "focus:ring-green-500 focus:border-green-500"
  }`;

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

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {/* Header di động chỉ hiển thị khi màn hình < 770px */}
      {windowWidth < 770 && (
        <DocumentMobileHeader
          selectedCategory={{ title: "Quản trị" }}
          selectedDocument={{ title: "Quản lý người dùng" }}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen relative">
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
        />

        <div
          className={`flex flex-col flex-1 ${
            isDarkMode ? "bg-gray-900" : "bg-slate-50"
          }`}
        >
          {/* Header desktop chỉ hiển thị khi màn hình >= 770px */}
          {windowWidth >= 770 && <UserHeader title="Quản lý người dùng" />}

          <div className="flex flex-col flex-1 p-6">
            {/* Breadcrumb and document title */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <nav className="text-sm mb-2">
                    <ol className="list-none p-0 inline-flex">
                      <li className="flex items-center">
                        <span
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }
                        >
                          Quản trị
                        </span>
                        <svg
                          className="h-4 w-4 mx-2 fill-current"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </li>
                      <li>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-800"
                          }`}
                        >
                          Quản lý người dùng
                        </span>
                      </li>
                    </ol>
                  </nav>
                  <h1
                    className={`text-2xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Quản lý người dùng
                  </h1>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Quản lý vai trò và thông tin của người dùng trong hệ thống
                  </p>
                </div>

                {/* Nút thêm tài khoản */}
                <div>
                  <button
                    onClick={() => setShowAddUserForm(true)}
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
                    Thêm tài khoản mới
                  </button>
                </div>
              </div>
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

            {/* Form thêm tài khoản */}
            <UserAddForm
              isOpen={showAddUserForm}
              onClose={() => setShowAddUserForm(false)}
              onSubmit={handleCreateUser}
              formData={newUserData}
              formErrors={newUserFormErrors}
              loading={addingUser}
              onChange={handleNewUserInputChange}
            />

            {/* Table view of users */}
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
                <h3
                  className={`text-lg font-medium ${
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  Danh sách người dùng
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Hiển thị {users.length} người dùng trong hệ thống
                </p>
              </div>

              <div className="overflow-x-auto">
                <table
                  className={`min-w-full divide-y ${
                    isDarkMode ? "divide-gray-700" : "divide-gray-200"
                  }`}
                >
                  <thead>
                    <tr
                      className={isDarkMode ? "bg-gray-700/30" : "bg-gray-50"}
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
                    {users.length > 0 ? (
                      users.map((userData) => (
                        <tr
                          key={userData.id}
                          className={
                            isDarkMode
                              ? "hover:bg-gray-700/30"
                              : "hover:bg-gray-50"
                          }
                        >
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
                                    isDarkMode ? "text-white" : "text-gray-900"
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
                                  {userData.phoneNumber || "Chưa cập nhật SĐT"}
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
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                            >
                              {getRoleName(userData.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <select
                              value={userData.role || "fuser"}
                              onChange={(e) =>
                                handleRoleChange(userData.id, e.target.value)
                              }
                              className={`${inputClasses} text-sm py-1`}
                            >
                              <option value="fuser">Người dùng miễn phí</option>
                              <option value="puser">Người dùng trả phí</option>
                              <option value="admin">Quản trị viên</option>
                            </select>
                          </td>{" "}
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
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className={`px-6 py-10 text-center ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          <svg
                            className="mx-auto h-12 w-12 mb-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            ></path>
                          </svg>
                          <span className="block font-medium text-sm mb-1">
                            Không có dữ liệu người dùng
                          </span>
                          <span className="text-xs">
                            Chưa có người dùng nào trong hệ thống
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />

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
                {deleteSuccess ? (
                  <div
                    className={`p-3 mb-4 text-sm rounded-md ${
                      isDarkMode
                        ? "bg-green-900/30 text-green-300 border border-green-800"
                        : "bg-green-50 text-green-700 border border-green-200"
                    }`}
                  >
                    <div className="flex">
                      <svg
                        className="h-5 w-5 mr-2 text-green-400 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{deleteSuccess}</span>
                    </div>
                  </div>
                ) : (
                  <form>
                    {/* User info - readonly */}
                    <div className="mb-5">
                      <label
                        htmlFor="delete-name"
                        className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Tên người dùng
                      </label>
                      <input
                        type="text"
                        id="delete-name"
                        value={userToDelete?.displayName || "Không có tên"}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${
                          isDarkMode
                            ? "bg-gray-600 border-gray-500 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      />
                    </div>

                    {/* Email field - readonly */}
                    <div className="mb-5">
                      <label
                        htmlFor="delete-email"
                        className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Email
                      </label>
                      <input
                        type="text"
                        id="delete-email"
                        value={userToDelete?.email || ""}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${
                          isDarkMode
                            ? "bg-gray-600 border-gray-500 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      />
                    </div>

                    {/* Warning message */}
                    <div
                      className={`p-3 mb-5 text-sm rounded-md border ${
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
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="font-medium">Cảnh báo: </span>
                        <span className="ml-1">
                          Thao tác này sẽ xóa vĩnh viễn tài khoản người dùng
                          khỏi hệ thống!
                        </span>
                      </div>
                    </div>

                    {/* Error message */}
                    {deleteError && (
                      <div
                        className={`p-3 mb-4 text-sm rounded-md ${
                          isDarkMode
                            ? "bg-red-900/30 text-red-300 border border-red-800"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <div className="flex">
                          <svg
                            className="h-5 w-5 mr-2 text-red-400 flex-shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{deleteError}</span>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 sm:flex ${
                  deleteSuccess ? "justify-center" : "sm:flex-row-reverse"
                } ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                {deleteSuccess ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className={`w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:w-auto sm:text-sm ${
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                  >
                    Đóng
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(userToDelete.id)}
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementContent;
