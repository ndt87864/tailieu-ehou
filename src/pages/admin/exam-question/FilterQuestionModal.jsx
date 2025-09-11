import React from "react";

const FilterQuestionModal = ({
  showFilterModal,
  isDarkMode,
  filterDocument,
  setFilterDocument,
  allDocuments,
  handleApplyFilter,
  setShowFilterModal,
}) => {
  if (!showFilterModal) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div
        className={`rounded-lg p-6 shadow-lg w-full max-w-md ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">Lọc câu hỏi đề thi</h2>
        <div className="mb-4">
          <label className="block mb-1">Tài liệu</label>
          <select
            value={filterDocument}
            onChange={(e) => setFilterDocument(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Tất cả</option>
            {allDocuments.map((doc) => (
              <option key={doc.id} value={doc.title}>
                {doc.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-400"
            onClick={() => setShowFilterModal(false)}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={handleApplyFilter}
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterQuestionModal;
