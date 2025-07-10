import React from "react";

const UserActionCell = ({
  userData,
  isDarkMode,
  handleRoleChange,
  handleSubscriptionTypeChange,
  handleManageCategories,
}) => (
  <div className="text-sm">
    <select
      value={userData.role || "fuser"}
      onChange={(e) => handleRoleChange(userData.id, e.target.value)}
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
      <option value="fuser">Người dùng miễn phí</option>
      <option value="puser">Người dùng trả phí</option>
      <option value="admin">Quản trị viên</option>
    </select>
    {userData.role === "puser" && (
      <select
        value={userData.subscriptionType || "full"}
        onChange={(e) =>
          handleSubscriptionTypeChange(userData.id, e.target.value)
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
        <option value="partial">Trả phí theo mục</option>
      </select>
    )}
    {userData.role === "puser" && userData.subscriptionType === "partial" && (
      <button
        onClick={() => handleManageCategories(userData)}
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
          />
        </svg>
        Tùy chỉnh danh mục
      </button>
    )}
  </div>
);

export default UserActionCell;
