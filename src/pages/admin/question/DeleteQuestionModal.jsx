import React from "react";

const DeleteQuestionModal = ({
  showDeleteModal,
  isDarkMode,
  deleteError,
  questionToDelete,
  isDeleteConfirmed,
  setIsDeleteConfirmed,
  setShowDeleteModal,
  isDeleting,
  handleDeleteQuestion,
}) => {
  if (!showDeleteModal) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span
          className="hidden sm:inline-block sm-align-middle sm:h-screen"
          aria-hidden="true"
        >
          &zwnj;
        </span>
        <div
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden sm:my-8 sm:align-middle sm:max-w-lg sm:w-full transition-colors ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600 hover:border-blue-500"
              : "bg-gray-50 border border-gray-200 hover:border-blue-500"
          }`}
        >
          <div
            className={`px-6 pt-6 pb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <h3 className="text-xl font-medium leading-6 mb-5">
              Xác nhận xóa câu hỏi
            </h3>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                {deleteError}
              </div>
            )}
            <p className="mb-5">
              Bạn có chắc chắn muốn xóa câu hỏi "
              <span className="font-semibold">
                {questionToDelete?.question?.substring(0, 50)}
                {questionToDelete?.question?.length > 50 ? "..." : ""}
              </span>
              "? Hành động này không thể hoàn tác.
            </p>
            <div className="mb-5">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isDeleteConfirmed}
                  onChange={(e) => setIsDeleteConfirmed(e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">
                  Tôi xác nhận muốn xóa câu hỏi này
                </span>
              </label>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className={`px-4 py-2 rounded-md font-medium ${
                  isDarkMode
                    ? "bg-gray-600 hover:bg-gray-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } transition-colors`}
                onClick={() => {
                  setShowDeleteModal(false);
                  setIsDeleteConfirmed(false);
                }}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md font-medium ${
                  isDarkMode
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                } transition-colors ${
                  !isDeleteConfirmed || isDeleting
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={handleDeleteQuestion}
                disabled={!isDeleteConfirmed || isDeleting}
              >
                {isDeleting ? "Đang xóa..." : "Xóa câu hỏi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteQuestionModal;
