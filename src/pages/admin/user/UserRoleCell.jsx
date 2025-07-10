import React, { useState, useRef, useEffect } from "react";

const roleOptions = [
  {
    value: "fuser",
    label: "Người dùng miễn phí",
    getClass: (isDarkMode) =>
      isDarkMode
        ? "bg-blue-900 text-blue-200"
        : "bg-blue-100 text-blue-800",
  },
  {
    value: "puser",
    label: "Người dùng trả phí",
    getClass: (isDarkMode) =>
      isDarkMode
        ? "bg-green-900 text-green-200"
        : "bg-green-100 text-green-800",
  },
  {
    value: "admin",
    label: "Quản trị viên",
    getClass: (isDarkMode) =>
      isDarkMode
        ? "bg-purple-900 text-purple-200"
        : "bg-purple-100 text-purple-800",
  },
];

const subscriptionOptions = [
  {
    value: "full",
    label: "Trả phí toàn bộ",
    getClass: (isDarkMode) =>
      isDarkMode
        ? "bg-yellow-700 text-yellow-200"
        : "bg-yellow-100 text-yellow-800",
  },
  {
    value: "partial",
    label: "Trả phí theo mục",
    getClass: (isDarkMode) =>
      isDarkMode
        ? "bg-teal-700 text-teal-200"
        : "bg-teal-100 text-teal-800",
  },
];

const UserRoleCell = ({
  userData,
  isDarkMode,
  getRoleName,
  handleRoleChange,
  handleSubscriptionTypeChange,
  handleManageCategories,
}) => {
  const [editing, setEditing] = useState(false);
  const popupRef = useRef(null);

  // Đóng popup khi click ra ngoài
  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editing]);

  const handleRoleClick = (role) => {
    if (userData.role !== role) {
      handleRoleChange(userData.id, role);
    }
    // Nếu chọn admin hoặc fuser thì đóng form luôn
    if (role !== "puser") setEditing(false);
  };
  const handleSubscriptionClick = (type) => {
    if (userData.subscriptionType !== type) {
      handleSubscriptionTypeChange(userData.id, type);
    }
    // Nếu chọn full thì đóng form luôn
    if (type === "full") setEditing(false);
  };

  return (
    <div className="flex flex-col gap-0.5 relative">
      <span
        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded cursor-pointer select-none transition hover:opacity-80 ${
          userData.role === "admin"
            ? isDarkMode
              ? "bg-purple-900 text-purple-200"
              : "bg-purple-100 text-purple-800"
            : userData.role === "puser"
            ? isDarkMode
              ? "bg-green-900 text-green-200"
              : "bg-green-100 text-green-800"
            : isDarkMode
            ? "bg-blue-900 text-blue-200"
            : "bg-blue-100 text-blue-800"
        }`}
        title="Nhấn để thay đổi vai trò"
        onClick={() => setEditing(true)}
      >
        {getRoleName(userData.role)}
      </span>
      {editing && (
        <div
          ref={popupRef}
          className={`absolute z-50 left-0 mt-1 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg p-3 flex flex-col gap-2 animate-fade-in`}
          style={{ top: "100%" }}
        >
          <div>
            <div className="text-xs font-medium mb-1">Vai trò</div>
            <div className="flex gap-2 mb-2">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  className={`px-2 py-1 text-xs font-semibold rounded focus:outline-none border transition-all ${
                    userData.role === role.value
                      ? role.getClass(isDarkMode) + " border-green-500 ring-2 ring-green-300"
                      : role.getClass(isDarkMode) + " opacity-70 border-transparent hover:opacity-100"
                  }`}
                  onClick={() => handleRoleClick(role.value)}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          {userData.role === "puser" && (
            <div>
              <div className="text-xs font-medium mb-1">Loại đăng ký</div>
              <div className="flex gap-2 mb-2">
                {subscriptionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-2 py-1 text-xs font-semibold rounded focus:outline-none border transition-all ${
                      userData.subscriptionType === opt.value
                        ? opt.getClass(isDarkMode) + " border-green-500 ring-2 ring-green-300"
                        : opt.getClass(isDarkMode) + " opacity-70 border-transparent hover:opacity-100"
                    }`}
                    onClick={() => handleSubscriptionClick(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {userData.role === "puser" && userData.subscriptionType === "partial" && (
            <button
              type="button"
              onClick={() => {
                handleManageCategories(userData);
                setEditing(false);
              }}
              className={`w-full inline-flex items-center justify-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm mt-1 ${
                isDarkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-100 hover:bg-blue-200 text-blue-800"
              }`}
            >
              Tùy chỉnh danh mục
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white underline self-end"
          >
            Đóng
          </button>
        </div>
      )}
      {/* Loại đăng ký */}
      {!editing && userData.role === "puser" && userData.subscriptionType && (
        <span
          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${
            userData.subscriptionType === "full"
              ? isDarkMode
                ? "bg-yellow-700 text-yellow-200"
                : "bg-yellow-100 text-yellow-800"
              : userData.subscriptionType === "partial"
              ? isDarkMode
                ? "bg-teal-700 text-teal-200"
                : "bg-teal-100 text-teal-800"
              : ""
          }`}
        >
          {userData.subscriptionType === "full"
            ? "Trả phí toàn bộ"
            : "Trả phí theo mục"}
        </span>
      )}
      {!editing &&
        userData.role === "puser" &&
        userData.subscriptionType === "partial" &&
        userData.paidCategories && (
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${
              isDarkMode
                ? "bg-blue-700 text-blue-200"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            Đã cấu hình
          </span>
        )}
    </div>
  );
};

export default UserRoleCell;
