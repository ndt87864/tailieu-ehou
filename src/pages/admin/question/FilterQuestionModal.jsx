import React from "react";

const FilterQuestionModal = ({
  showFilterModal,
  isDarkMode,
  filterCategory,
  setFilterCategory,
  filterDocument,
  setFilterDocument,
  allCategories,
  categoryDocuments,
  handleApplyFilter,
  setShowFilterModal,
}) => {
  if (!showFilterModal) return null;
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
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <div
            className={`px-6 pt-6 pb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <h3 className="text-xl font-medium leading-6 mb-5">Lọc câu hỏi</h3>
            <div className="mb-5">
              <label
                htmlFor="filterCategory"
                className="block text-sm font-medium mb-2"
              >
                Danh mục
              </label>
              <select
                id="filterCategory"
                className={`w-full rounded-xl py-3 px-4 ${
                  isDarkMode
                    ? "bg-gray-700 text-white border-gray-600"
                    : "bg-gray-50 text-gray-900 border-gray-200"
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={filterCategory || ""}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setFilterDocument(null);
                }}
              >
                <option value="">Chọn danh mục</option>
                {allCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label
                htmlFor="filterDocument"
                className="block text-sm font-medium mb-2"
              >
                Tài liệu
              </label>
              <select
                id="filterDocument"
                className={`w-full rounded-xl py-3 px-4 ${
                  isDarkMode
                    ? "bg-gray-700 text-white border-gray-600"
                    : "bg-gray-50 text-gray-900 border-gray-200"
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={filterDocument || ""}
                onChange={(e) => setFilterDocument(e.target.value)}
                disabled={!filterCategory}
              >
                <option value="">Chọn tài liệu</option>
                {filterCategory &&
                  categoryDocuments[filterCategory]?.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className={`px-4 py-2 rounded-md font-medium ${
                  isDarkMode
                    ? "bg-gray-600 hover:bg-gray-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } transition-colors`}
                onClick={() => setShowFilterModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md font-medium ${
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                } transition-colors ${
                  !filterCategory || !filterDocument
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={handleApplyFilter}
                disabled={!filterCategory || !filterDocument}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterQuestionModal;
