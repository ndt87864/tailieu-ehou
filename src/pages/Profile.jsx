import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, THEME_COLORS } from "../context/ThemeContext";
import { useUserRole } from "../context/UserRoleContext";
import { auth, db } from "../firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useAuthContext } from "../context/AuthContext";
import "../styles/auth.css";

const Profile = () => {
  const [user, loading] = useAuthState(auth);
  const { isDarkMode, themeColor, changeThemeColor, THEME_COLORS } = useTheme();
  const {
    userRole,
    isAdmin,
    isPuser,
    isFreeUser,
    subscriptionType: contextSubscriptionType,
  } = useUserRole();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState("");
  const [subscriptionType, setSubscriptionType] = useState("full"); // 'full' hoặc 'partial'
  const [showPaidContent, setShowPaidContent] = useState(false);
  const [paidCategories, setPaidCategories] = useState({});
  const [documentNames, setDocumentNames] = useState({});
  const [loadingPaidContent, setLoadingPaidContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Hàm định dạng để hiển thị loại tài khoản
  const displayAccountType = (role) => {
    switch (role) {
      case "puser":
        return "Người dùng trả phí";
      case "admin":
        return "Quản trị viên";
      case "fuser":
      default:
        return "Người dùng miễn phí";
    }
  };
  const isValidPhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^[0-9]+$/.test(value)) {
      setPhoneNumber(value);
    }
  };
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track desktop breakpoint so we can apply an inline width on large screens
  useEffect(() => {
    const check = () =>
      setIsDesktop(typeof window !== "undefined" && window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const authCardStyle =
    showPasswordFields && isDesktop
      ? { width: "66vw", maxWidth: "66vw" }
      : undefined;

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        setEmail(user.email || "");
        setDisplayName(user.displayName || "");

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (userData.displayName) setDisplayName(userData.displayName);
            if (userData.email) setEmail(userData.email);
            if (userData.phoneNumber) setPhoneNumber(userData.phoneNumber);
            if (userData.role) setRole(userData.role);
            if (userData.subscriptionType)
              setSubscriptionType(userData.subscriptionType);
            else if (userData.role === "puser" && !userData.subscriptionType)
              setSubscriptionType("full"); // Default for existing premium users

            // Lấy danh sách các danh mục và tài liệu đã trả phí
            if (userData.paidCategories) {
              setPaidCategories(userData.paidCategories || {});
            }
          } else {
            await setDoc(doc(db, "users", user.uid), {
              displayName: user.displayName || "",
              email: user.email || "",
              phoneNumber: "",
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error("Lỗi khi lấy thông tin người dùng:", err);
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (contextSubscriptionType && role === "puser") {
      setSubscriptionType(contextSubscriptionType);
    }
  }, [contextSubscriptionType, role]);
  // Hàm để lấy tên danh mục và tài liệu đã trả phí
  const fetchCategoryAndDocumentNames = async () => {
    if (!paidCategories || Object.keys(paidCategories).length === 0) return;

    setLoadingPaidContent(true);
    setSearchTerm(""); // Reset search term when opening modal

    try {
      const documentsData = {};

      // Lấy tất cả các documentIds từ tất cả các danh mục
      const allDocs = [...new Set(Object.values(paidCategories).flat())];

      for (const documentId of allDocs) {
        try {
          const documentRef = doc(db, "documents", documentId);
          const documentSnap = await getDoc(documentRef);
        } catch (error) {
          console.error(`Lỗi khi lấy thông tin tài liệu ${documentId}:`, error);

          // Thêm hướng dẫn nếu là lỗi liên quan đến index
          if (error.message && error.message.includes("index")) {
            console.error(
              "Lỗi index Firebase: Vui lòng tạo chỉ mục cần thiết bằng cách truy cập:",
              "\nhttps://console.firebase.google.com/project/_/firestore/indexes",
              "\nHoặc nhấp vào URL trong lỗi để tạo index tự động"
            );
          }
        }
      }
      setDocumentNames(documentsData);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu đã trả phí:", error);
    } finally {
      setLoadingPaidContent(false);
    }
  }; // Gọi hàm lấy dữ liệu khi người dùng mở form xem chi tiết
  useEffect(() => {
    if (showPaidContent) {
      fetchCategoryAndDocumentNames();
    }
  }, [showPaidContent, paidCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (phoneNumber.trim() && !isValidPhone(phoneNumber)) {
        throw new Error(
          "Số điện thoại phải đúng định dạng , có đúng 10 chữ số"
        );
      }

      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }

      // Update user document including subscription type for premium users
      const updateData = {
        displayName,
        email,
        phoneNumber,
        updatedAt: new Date().toISOString(),
      };

      // Only add subscriptionType if user is premium
      if (role === "puser") {
        updateData.subscriptionType = subscriptionType;
      }

      await setDoc(doc(db, "users", user.uid), updateData, { merge: true });

      if (showPasswordFields) {
        if (newPassword !== confirmPassword) {
          throw new Error("Mật khẩu xác nhận không khớp với mật khẩu mới");
        }
        if (newPassword.length < 6 || newPassword.length > 12) {
          throw new Error("Mật khẩu phải có từ 6 đến 12 ký tự");
        }
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordFields(false);

        setSuccess(
          "Thông tin tài khoản và mật khẩu đã được cập nhật thành công!"
        );
      } else {
        setSuccess("Thông tin tài khoản đã được cập nhật thành công!");
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật thông tin:", err);
      setError(
        err.code === "auth/wrong-password"
          ? "Mật khẩu hiện tại không đúng"
          : err.code === "auth/weak-password"
          ? "Mật khẩu mới quá yếu"
          : err.message || "Đã xảy ra lỗi khi cập nhật. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`auth-page-wrapper ${isDarkMode ? "dark" : "light"}`}>
        <div className="auth-card">
          <div className={`glass-card ${isDarkMode ? "dark" : "light"}`}>
            <div className="text-center">
              <div className="spinner"></div>
              <p
                className={`text-center text-muted mt-4 ${
                  isDarkMode ? "dark" : "light"
                }`}
              >
                Đang tải...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-page-wrapper ${isDarkMode ? "dark" : "light"}`}>
      <div
        className={`auth-card ${mounted ? "mounted" : ""} ${
          showPasswordFields ? "lg:w-2/3 lg:max-w-none" : ""
        }`}
        style={authCardStyle}
      >
        <div className={`glass-card relative ${isDarkMode ? "dark" : "light"}`}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="link-button hidden lg:inline-flex absolute left-4 top-4"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="link-button inline-flex lg:hidden absolute left-4 top-4"
          >
            Quay lại
          </button>
          {/* Logo */}
          <div className="logo-container text-center">
            <svg
              className="w-16 h-16 mx-auto"
              style={{ color: "var(--accent-color)" }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M4 11.5l8 4 8-4M4 15l8 4 8-4" />
            </svg>
          </div>

          {/* Title */}
          <h2 className={`auth-title ${isDarkMode ? "dark" : "light"}`}>
            <span className={`gradient-text ${isDarkMode ? "dark" : "light"}`}>
              Thông tin tài khoản
            </span>
          </h2>

          <p
            className={`text-center text-muted mb-6 ${
              isDarkMode ? "dark" : "light"
            }`}
          >
            Chỉnh sửa thông tin cá nhân của bạn
          </p>

          {/* Messages */}
          {success && (
            <div className={`message success ${isDarkMode ? "dark" : "light"}`}>
              {success}
            </div>
          )}

          {error && (
            <div className={`message error ${isDarkMode ? "dark" : "light"}`}>
              {error}
            </div>
          )}

          {/* Desktop Layout: 2 columns */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Left Column: Role Information */}
            <div className="min-h-[400px]">
              <h3
                className={`text-lg font-medium mb-4 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Thông tin vai trò
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    } mr-2`}
                  >
                    Loại tài khoản:
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isAdmin
                        ? isDarkMode
                          ? "bg-purple-900 text-purple-200"
                          : "bg-purple-100 text-purple-800"
                        : role === "puser"
                        ? isDarkMode
                          ? "bg-green-900 text-green-200"
                          : "bg-green-100 text-green-800"
                        : isDarkMode
                        ? "bg-blue-900 text-blue-200"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {displayAccountType(role)}
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {isAdmin
                    ? "Bạn có quyền quản trị trang web và quản lý tài khoản người dùng."
                    : role === "puser"
                    ? "Bạn đang sử dụng tài khoản trả phí với đầy đủ tính năng."
                    : "Bạn đang sử dụng tài khoản miễn phí với các tính năng cơ bản."}
                </p>

                {/* Hiển thị loại subscription cho tài khoản premium */}
                {role === "puser" && (
                  <div
                    className={`p-4 rounded-md ${
                      isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                      }`}
                    >
                      Loại tài khoản trả phí
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${
                            subscriptionType === "full"
                              ? isDarkMode
                                ? "bg-green-800 text-green-100"
                                : "bg-green-100 text-green-800"
                              : isDarkMode
                              ? "bg-blue-800 text-blue-100"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {subscriptionType === "full"
                            ? "Trả phí toàn bộ"
                            : "Trả phí theo mục"}
                        </span>
                        {subscriptionType === "partial" && (
                          <button
                            onClick={() => setShowPaidContent(true)}
                            className={`ml-2 text-xs font-medium ${
                              isDarkMode
                                ? "text-blue-400 hover:text-blue-300"
                                : "text-blue-600 hover:text-blue-500"
                            }`}
                          >
                            Xem thêm
                          </button>
                        )}
                      </div>
                      <p
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {subscriptionType === "full"
                          ? "Bạn có quyền truy cập toàn bộ nội dung trên hệ thống."
                          : "Bạn chỉ có quyền truy cập các mục nội dung đã mua."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Edit Profile Form */}
            <div
              className={`min-h-[40vh] ${
                showPasswordFields ? "lg:min-h-[50vh]" : ""
              }`}
            >
              <h3
                className={`text-lg font-medium mb-4 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Chỉnh sửa thông tin
              </h3>
              <form
                onSubmit={handleSubmit}
                className={showPasswordFields ? "min-h-[50vh]" : ""}
              >
                <div
                  className={`grid ${
                    showPasswordFields
                      ? "lg:grid-cols-2 lg:gap-8"
                      : "grid-cols-1"
                  } space-y-4 lg:space-y-0 ${
                    showPasswordFields ? "min-h-[40vh]" : ""
                  }`}
                >
                  <div
                    className={`space-y-4 ${
                      showPasswordFields ? "lg:min-w-[40%]" : ""
                    }`}
                  >
                    {/* Email field - readonly */}
                    <div>
                      <label
                        htmlFor="email"
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        E-mail
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        readOnly
                        className={`input-field ${
                          isDarkMode ? "dark" : "light"
                        }`}
                      />
                      <p
                        className={`mt-1 text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Email không thể thay đổi
                      </p>
                    </div>

                    {/* Họ tên */}
                    <div>
                      <label
                        htmlFor="displayName"
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={`input-field ${
                          isDarkMode ? "dark" : "light"
                        }`}
                      />
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <label
                        htmlFor="phoneNumber"
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Số điện thoại (10 chữ số)
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        maxLength={10}
                        placeholder="Nhập 10 chữ số"
                        className={`input-field ${
                          isDarkMode ? "dark" : "light"
                        }`}
                      />
                      <p
                        className={`mt-1 text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Vui lòng nhập đúng 10 chữ số
                      </p>
                    </div>

                    {/* Checkbox để hiện/ẩn phần đổi mật khẩu */}
                    <div className="flex items-center mt-4">
                      <input
                        type="checkbox"
                        id="changePassword"
                        checked={showPasswordFields}
                        onChange={() =>
                          setShowPasswordFields(!showPasswordFields)
                        }
                        className={`h-4 w-4 text-emerald-600 focus:ring-emerald-500 ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-100 border-gray-300"
                        } rounded`}
                      />
                      <label
                        htmlFor="changePassword"
                        className={`ml-2 block text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        } font-medium`}
                      >
                        Đổi mật khẩu
                      </label>
                    </div>
                  </div>

                  {/* Phần đổi mật khẩu - hiển thị ở cột phải khi bật */}
                  {showPasswordFields && (
                    <div className="space-y-4">
                      {/* Mật khẩu hiện tại */}
                      <div>
                        <label
                          htmlFor="currentPassword"
                          className={`block text-sm font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Mật khẩu hiện tại
                        </label>
                        <input
                          type="password"
                          id="currentPassword"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`input-field ${
                            isDarkMode ? "dark" : "light"
                          }`}
                          required={showPasswordFields}
                        />
                        <p
                          className={`mt-1 text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          * Không thể để trống
                        </p>
                      </div>

                      {/* Mật khẩu mới */}
                      <div>
                        <label
                          htmlFor="newPassword"
                          className={`block text-sm font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Mật khẩu mới (6-12 ký tự)
                        </label>
                        <input
                          type="password"
                          id="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`input-field ${
                            isDarkMode ? "dark" : "light"
                          }`}
                          required={showPasswordFields}
                        />
                      </div>

                      {/* Xác nhận mật khẩu mới */}
                      <div>
                        <label
                          htmlFor="confirmPassword"
                          className={`block text-sm font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Xác nhận mật khẩu mới
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`input-field ${
                            isDarkMode ? "dark" : "light"
                          }`}
                          required={showPasswordFields}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="primary-button"
                  >
                    {isSubmitting ? (
                      <span className="loading-container">
                        <span className="spinner"></span>
                        Đang xử lý...
                      </span>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Mobile Layout: Single Column */}
          <form onSubmit={handleSubmit} className="lg:hidden">
            {/* User Role Information */}
            <div className="mb-6 pb-6 border-b border-opacity-20 border-gray-500">
              <h3
                className={`text-base font-medium mb-3 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Thông tin vai trò
              </h3>
              <div className="flex items-center">
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  } mr-2`}
                >
                  Loại tài khoản:
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAdmin
                      ? isDarkMode
                        ? "bg-purple-900 text-purple-200"
                        : "bg-purple-100 text-purple-800"
                      : role === "puser"
                      ? isDarkMode
                        ? "bg-green-900 text-green-200"
                        : "bg-green-100 text-green-800"
                      : isDarkMode
                      ? "bg-blue-900 text-blue-200"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {displayAccountType(role)}
                </span>
              </div>
              <p
                className={`mt-2 text-xs ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {isAdmin
                  ? "Bạn có quyền quản trị trang web và quản lý tài khoản người dùng."
                  : role === "puser"
                  ? "Bạn đang sử dụng tài khoản trả phí với đầy đủ tính năng."
                  : "Bạn đang sử dụng tài khoản miễn phí với các tính năng cơ bản."}
              </p>

              {/* Hiển thị loại subscription cho tài khoản premium */}
              {role === "puser" && (
                <div
                  className={`mt-4 p-4 rounded-md ${
                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  <h4
                    className={`text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Loại tài khoản trả phí
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${
                          subscriptionType === "full"
                            ? isDarkMode
                              ? "bg-green-800 text-green-100"
                              : "bg-green-100 text-green-800"
                            : isDarkMode
                            ? "bg-blue-800 text-blue-100"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {subscriptionType === "full"
                          ? "Trả phí toàn bộ"
                          : "Trả phí theo mục"}
                      </span>
                      {subscriptionType === "partial" && (
                        <button
                          onClick={() => setShowPaidContent(true)}
                          className={`ml-2 text-xs font-medium ${
                            isDarkMode
                              ? "text-blue-400 hover:text-blue-300"
                              : "text-blue-600 hover:text-blue-500"
                          }`}
                        >
                          Xem thêm
                        </button>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {subscriptionType === "full"
                        ? "Bạn có quyền truy cập toàn bộ nội dung trên hệ thống."
                        : "Bạn chỉ có quyền truy cập các mục nội dung đã mua."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Email field - readonly */}
              <div>
                <label
                  htmlFor="email"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  readOnly
                  className={`input-field ${isDarkMode ? "dark" : "light"}`}
                />
                <p
                  className={`mt-1 text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Email không thể thay đổi
                </p>
              </div>

              {/* Họ tên */}
              <div>
                <label
                  htmlFor="displayName"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Họ và tên
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`input-field ${isDarkMode ? "dark" : "light"}`}
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label
                  htmlFor="phoneNumber"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Số điện thoại (10 chữ số)
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  placeholder="Nhập 10 chữ số"
                  className={`input-field ${isDarkMode ? "dark" : "light"}`}
                />
                <p
                  className={`mt-1 text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Vui lòng nhập đúng 10 chữ số
                </p>
              </div>

              {/* Checkbox để hiện/ẩn phần đổi mật khẩu */}
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={showPasswordFields}
                  onChange={() => setShowPasswordFields(!showPasswordFields)}
                  className={`h-4 w-4 text-emerald-600 focus:ring-emerald-500 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-100 border-gray-300"
                  } rounded`}
                />
                <label
                  htmlFor="changePassword"
                  className={`ml-2 block text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } font-medium`}
                >
                  Đổi mật khẩu
                </label>
              </div>

              {/* Phần đổi mật khẩu */}
              {showPasswordFields && (
                <div
                  className={`space-y-4 mt-4 p-4 rounded-md ${
                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  {/* Mật khẩu hiện tại */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`input-field ${isDarkMode ? "dark" : "light"}`}
                      required={showPasswordFields}
                    />
                  </div>

                  {/* Mật khẩu mới */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Mật khẩu mới (6-12 ký tự)
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`input-field ${isDarkMode ? "dark" : "light"}`}
                      required={showPasswordFields}
                    />
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`input-field ${isDarkMode ? "dark" : "light"}`}
                      required={showPasswordFields}
                    />
                  </div>
                </div>
              )}
            </div>

              <div className="mt-6 flex items-center justify-end lg:justify-between">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-button"
                >
                  {isSubmitting ? (
                    <span className="loading-container">
                      <span className="spinner"></span>
                      Đang xử lý...
                    </span>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
          </form>
        </div>
      </div>

      {/* Modal hiển thị danh sách danh mục và tài liệu đã trả phí */}
      {showPaidContent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div
            className={`relative max-w-3xl w-full m-3 p-6 ${
              isDarkMode ? "bg-gray-900" : "bg-gray-100"
            } rounded-lg shadow-md`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-lg font-medium ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Nội dung đã trả phí
              </h3>
              <button
                onClick={() => setShowPaidContent(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
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
            {loadingPaidContent ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mb-4"></div>
                <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                  Đang tải dữ liệu...
                </p>
              </div>
            ) : Object.keys(paidCategories).length === 0 ? (
              <div
                className={`p-4 rounded-md ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <p className="text-center">Bạn chưa mua bất kỳ nội dung nào.</p>
              </div>
            ) : (
              <>
                {/* Search bar */}
                <div className="mb-4">
                  <div
                    className={`relative rounded-md shadow-sm ${
                      isDarkMode ? "bg-gray-700" : "bg-white"
                    }`}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className={`h-5 w-5 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm kiếm tài liệu..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2 border ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "border-gray-300 text-gray-900 placeholder-gray-500"
                      } rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500`}
                    />
                    {searchTerm && (
                      <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setSearchTerm("")}
                      >
                        <svg
                          className={`h-5 w-5 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          } hover:text-gray-700`}
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
                    )}
                  </div>
                </div>

                {/* Flattened list of paid documents only */}
                <div className="overflow-y-auto max-h-96">
                  {(() => {
                    // get all unique paid document IDs
                    const allDocs = [
                      ...new Set(Object.values(paidCategories).flat()),
                    ];
                    // filter by searchTerm
                    const filteredDocs = allDocs.filter((docId) => {
                      const title = documentNames[docId] || "";
                      return title
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());
                    });
                    // no results message
                    if (filteredDocs.length === 0) {
                      return (
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {searchTerm
                            ? "Không tìm thấy tài liệu phù hợp với từ khóa tìm kiếm"
                            : "Không có tài liệu đã trả phí"}
                        </p>
                      );
                    }
                    // render list
                    return (
                      <ul className="space-y-2">
                        {filteredDocs.map((documentId) => (
                          <li
                            key={documentId}
                            className={`flex items-center p-1.5 rounded-md ${
                              isDarkMode
                                ? "hover:bg-gray-700"
                                : "hover:bg-gray-100"
                            } transition-colors duration-150`}
                          >
                            <svg
                              className={`h-4 w-4 mr-1 flex-shrink-0 ${
                                isDarkMode ? "text-green-400" : "text-green-600"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm">
                              {documentNames[documentId]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
