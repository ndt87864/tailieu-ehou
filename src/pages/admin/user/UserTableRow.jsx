import React from "react";
import UserRoleCell from "./UserRoleCell";
import UserExcelCell from "./UserExcelCell";
import UserDeleteCell from "./UserDeleteCell";

const UserTableRow = ({
  userData,
  isDarkMode,
  userOnlineStatus,
  toggleUserOnlineStatus,
  handleRoleChange,
  handleSubscriptionTypeChange,
  handleManageCategories,
  shouldShowExcelControls,
  handleExcelPermissionToggle,
  handleExcelPercentageChange,
  getDefaultExcelPercentage,
  handleDeleteClick,
  user,
  getRoleName,
}) => (
  <tr className={isDarkMode ? "hover:bg-gray-700/30" : "hover:bg-gray-50"}>
    {/* User info */}
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
                isDarkMode ? "text-gray-200" : "text-gray-600"
              }`}
            >
              {userData.displayName
                ? userData.displayName.charAt(0).toUpperCase()
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
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {userData.phoneNumber || "Chưa cập nhật SĐT"}
          </div>
          <div className="flex items-center mt-1">
            <button
              onClick={() => toggleUserOnlineStatus(userData.id)}
              className={`flex items-center text-xs px-2 py-0.5 rounded-full ${
                userOnlineStatus[userData.id]
                  ? isDarkMode
                    ? "bg-green-900 text-green-200"
                    : "bg-green-100 text-green-800"
                  : isDarkMode
                  ? "bg-red-900 text-red-200"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  userOnlineStatus[userData.id] ? "bg-green-400" : "bg-red-400"
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
    {/* Email */}
    <td className="px-6 py-4 whitespace-nowrap">
      <div
        className={`text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
      >
        {userData.email}
      </div>
    </td>
    {/* Vai trò và loại đăng ký */}
    <td className="px-6 py-4 whitespace-nowrap">
      <UserRoleCell
        userData={userData}
        isDarkMode={isDarkMode}
        getRoleName={getRoleName}
        handleRoleChange={handleRoleChange}
        handleSubscriptionTypeChange={handleSubscriptionTypeChange}
        handleManageCategories={handleManageCategories}
      />
    </td>
    {/* Excel Controls */}
    <td className="px-6 py-4 whitespace-nowrap">
      <UserExcelCell
        userData={userData}
        isDarkMode={isDarkMode}
        shouldShowExcelControls={shouldShowExcelControls}
        handleExcelPermissionToggle={handleExcelPermissionToggle}
        handleExcelPercentageChange={handleExcelPercentageChange}
        getDefaultExcelPercentage={getDefaultExcelPercentage}
      />
    </td>
    {/* Xóa */}
    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
      <UserDeleteCell
        userData={userData}
        user={user}
        isDarkMode={isDarkMode}
        handleDeleteClick={handleDeleteClick}
      />
    </td>
  </tr>
);

export default UserTableRow;
