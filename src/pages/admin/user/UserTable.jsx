import React from "react";
import UserTableRow from "./UserTableRow";

const UserTable = ({
  users,
  filteredUsers,
  loading,
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
  if (loading) {
    return (
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
    );
  }
  if (users.length === 0) {
    return (
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
            />
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
          Bạn có thể tạo người dùng mới bằng cách nhấn vào nút "Thêm người dùng"
        </p>
      </div>
    );
  }
  if (filteredUsers.length === 0) {
    return (
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
            />
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
    );
  }
  return (
    <table
      className={`min-w-full divide-y ${
        isDarkMode ? "divide-gray-700" : "divide-gray-200"
      }`}
    >
      <thead>
        <tr className={isDarkMode ? "bg-gray-700/30" : "bg-gray-50"}>
          <th
            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
              isDarkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Người dùng
          </th>
          <th
            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
              isDarkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Email
          </th>
          <th
            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
              isDarkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Vai trò
          </th>
          <th
            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
              isDarkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Excel Controls
          </th>
          <th
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
        {filteredUsers.map((userData) => (
          <UserTableRow
            key={userData.id}
            userData={userData}
            isDarkMode={isDarkMode}
            userOnlineStatus={userOnlineStatus}
            toggleUserOnlineStatus={toggleUserOnlineStatus}
            handleRoleChange={handleRoleChange}
            handleSubscriptionTypeChange={handleSubscriptionTypeChange}
            handleManageCategories={handleManageCategories}
            shouldShowExcelControls={shouldShowExcelControls}
            handleExcelPermissionToggle={handleExcelPermissionToggle}
            handleExcelPercentageChange={handleExcelPercentageChange}
            getDefaultExcelPercentage={getDefaultExcelPercentage}
            handleDeleteClick={handleDeleteClick}
            user={user}
            getRoleName={getRoleName}
          />
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;
