import React from "react";

const UserRoleCell = ({ userData, isDarkMode, getRoleName }) => (
  <div className="flex flex-col gap-0.5">
    {/* Vai trò */}
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${
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
    >
      {getRoleName(userData.role)}
    </span>
    {/* Loại đăng ký */}
    {userData.role === "puser" && userData.subscriptionType && (
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
    {userData.role === "puser" &&
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

export default UserRoleCell;
