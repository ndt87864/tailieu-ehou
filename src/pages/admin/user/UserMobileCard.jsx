import React from "react";
import UserRoleCell from "./UserRoleCell";
import UserExcelCell from "./UserExcelCell";
import UserDeleteCell from "./UserDeleteCell";

const UserMobileCard = ({
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
}) => {
  return (
    <div
      className={`p-4 mb-4 rounded-lg shadow-sm border ${
        isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header: Avatar & Name & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          {userData.photoURL ? (
            <img
              className="h-12 w-12 rounded-full mr-3 object-cover"
              src={userData.photoURL}
              alt=""
            />
          ) : (
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center mr-3 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <span
                className={`text-xl font-medium ${
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
              className={`font-medium text-base ${
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
              {userData.email}
            </div>
            <div
              className={`text-xs mt-1 ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {userData.phoneNumber || "Chưa cập nhật SĐT"}
            </div>
          </div>
        </div>
        
        {/* Delete Button (Top Right) */}
        <div className="ml-2">
           <UserDeleteCell
            userData={userData}
            user={user}
            isDarkMode={isDarkMode}
            handleDeleteClick={handleDeleteClick}
          />
        </div>
      </div>

      {/* Online Status */}
      <div className="mb-3">
         <button
            onClick={() => toggleUserOnlineStatus(userData.id)}
            className={`flex items-center text-xs px-2 py-1 rounded-full ${
              userOnlineStatus[userData.id]
                ? isDarkMode
                  ? "bg-green-900/50 text-green-200"
                  : "bg-green-100 text-green-800"
                : isDarkMode
                ? "bg-red-900/50 text-red-200"
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

      <div className={`border-t pt-3 space-y-3 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
        {/* Role & Subscription */}
        <div>
          <label className={`text-xs font-medium uppercase mb-1 block ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Vai trò
          </label>
          <UserRoleCell
            userData={userData}
            isDarkMode={isDarkMode}
            getRoleName={getRoleName}
            handleRoleChange={handleRoleChange}
            handleSubscriptionTypeChange={handleSubscriptionTypeChange}
            handleManageCategories={handleManageCategories}
          />
        </div>

        {/* Excel Controls */}
        {shouldShowExcelControls(userData) && (
          <div>
            <label className={`text-xs font-medium uppercase mb-1 block ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Excel Controls
            </label>
            <UserExcelCell
              userData={userData}
              isDarkMode={isDarkMode}
              shouldShowExcelControls={shouldShowExcelControls}
              handleExcelPermissionToggle={handleExcelPermissionToggle}
              handleExcelPercentageChange={handleExcelPercentageChange}
              getDefaultExcelPercentage={getDefaultExcelPercentage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMobileCard;
