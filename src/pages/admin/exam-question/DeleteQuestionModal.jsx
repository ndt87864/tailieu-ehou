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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div
        className={`rounded-lg p-6 shadow-lg w-full max-w-md ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">Xác nhận xóa câu hỏi đề thi</h2>
        <p>
          Bạn có chắc chắn muốn xóa câu hỏi: <b>{questionToDelete?.question}</b>
          ?
        </p>
        <div className="my-4">
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
        {deleteError && <div className="text-red-500 mt-2">{deleteError}</div>}
        <div className="flex justify-end mt-6 gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-400"
            onClick={() => {
              setShowDeleteModal(false);
              setIsDeleteConfirmed(false);
            }}
            disabled={isDeleting}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white"
            onClick={handleDeleteQuestion}
            disabled={isDeleting || !isDeleteConfirmed}
          >
            {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteQuestionModal;
