import React from "react";

const UserDeleteCell = ({ userData, user, isDarkMode, handleDeleteClick }) => (
  <button
    onClick={() => handleDeleteClick(userData)}
    disabled={userData.id === user?.uid}
    className={`inline-flex items-center p-1.5 rounded-md ${
      userData.id === user?.uid
        ? isDarkMode
          ? "text-gray-600 cursor-not-allowed"
          : "text-gray-400 cursor-not-allowed"
        : isDarkMode
        ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
        : "text-red-600 hover:bg-gray-100 hover:text-red-700"
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
      />
    </svg>
  </button>
);

export default UserDeleteCell;
