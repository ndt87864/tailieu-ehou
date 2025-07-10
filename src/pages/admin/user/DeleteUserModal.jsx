import React from "react";

const DeleteUserModal = ({
  showDeleteModal,
  userToDelete,
  isDarkMode,
  isDeletingUser,
  confirmDeleteUser,
  setShowDeleteModal,
}) => {
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
              : "bg-gray-50 border-gray-200"
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
                className="flex items-center p-4 rounded-md mb-4 border border-dashed bg-opacity-50"
                style={{
                  backgroundColor: isDarkMode ? "#37415180" : "#f3f4f680",
                  borderColor: isDarkMode ? "#6b7280" : "#d1d5db",
                }}
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
                      Thao tác này chỉ xóa người dùng khỏi cơ sở dữ liệu, không
                      xóa tài khoản xác thực.
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

export default DeleteUserModal;
