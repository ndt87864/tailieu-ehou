import React from "react";

const BulkDeleteModal = ({
  showBulkDeleteModal,
  isDarkMode,
  deleteError,
  selectedRows,
  isDeleteConfirmed,
  setIsDeleteConfirmed,
  setShowBulkDeleteModal,
  isDeleting,
  confirmBulkDelete,
}) => {
  if (!showBulkDeleteModal) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div
        className={`rounded-lg p-6 shadow-lg w-full max-w-md ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">
          Xác nhận xóa nhiều câu hỏi đề thi
        </h2>
        <p>
          Bạn có chắc chắn muốn xóa <b>{selectedRows.length}</b> câu hỏi?
        </p>
        {deleteError && <div className="text-red-500 mt-2">{deleteError}</div>}
        <div className="flex justify-end mt-6 gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-400"
            onClick={() => setShowBulkDeleteModal(false)}
            disabled={isDeleting}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white"
            onClick={confirmBulkDelete}
            disabled={isDeleting || isDeleteConfirmed}
          >
            {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteModal;
