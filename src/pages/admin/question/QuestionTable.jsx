import React, { useState } from "react";

const QuestionTable = ({
  loading,
  filteredQuestions,
  isDarkMode,
  selectedRows,
  handleSelectAll,
  handleDeleteSelected,
  isDeleting,
  handleSelectRow,
  openEditModal,
  openDeleteModal,
  setSelectedRows,
}) => {
  // Thêm state cho modal ảnh
  const [imageModal, setImageModal] = useState({ open: false, url: "" });

  // Thêm modal popup ảnh
  const renderImageModal = () =>
    imageModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="bg-white rounded-lg p-4 max-w-2xl w-full relative">
          <button
            className="absolute -top-4 -right-4 bg-white shadow-lg rounded-full text-gray-600 hover:text-black text-2xl w-10 h-10 flex items-center justify-center border border-gray-300 hover:border-blue-500 transition-colors"
            onClick={() => setImageModal({ open: false, url: "" })}
            title="Đóng"
            style={{ zIndex: 60 }}
          >
            &times;
          </button>
          <img
            src={imageModal.url}
            alt="Preview"
            className="w-full h-auto max-h-[70vh] object-contain rounded"
          />
          <div className="mt-3 text-center">
            <a
              href={imageModal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Mở ảnh trong tab mới
            </a>
          </div>
        </div>
      </div>
    );

  return (
    <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {renderImageModal()}
      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Đang tải dữ liệu...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-6 text-center">
          <p>Không tìm thấy câu hỏi nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={isDarkMode ? "bg-gray-600" : "bg-gray-50"}>
              <tr>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedRows.length === filteredQuestions.length &&
                        filteredQuestions.length > 0
                      }
                      onChange={handleSelectAll}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <button
                      className={`ml-2 px-2 py-1 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors ${
                        selectedRows.length === 0
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      onClick={handleDeleteSelected}
                      disabled={selectedRows.length === 0 || isDeleting}
                      title="Xóa tất cả"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  STT
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  Câu hỏi
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  Câu trả lời
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  Tài liệu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  Danh mục
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDarkMode ? "divide-gray-700" : "divide-gray-200"
              }`}
            >
              {(() => {
                let lastGroupStt = null;
                return filteredQuestions.map((question, index, arr) => {
                  const groupStt = question._groupStt;
                  let isFirstInGroup = false;
                  if (groupStt && groupStt !== lastGroupStt) {
                    isFirstInGroup = true;
                    lastGroupStt = groupStt;
                  }
                  const groupQuestions = groupStt
                    ? arr.filter((q) => q._groupStt === groupStt)
                    : [];
                  const allGroupSelected =
                    groupQuestions.length > 0 &&
                    groupQuestions.every((q) => selectedRows.includes(q.id));
                  const someGroupSelected = groupQuestions.some((q) =>
                    selectedRows.includes(q.id)
                  );
                  const groupCheckbox = isFirstInGroup ? (
                    <tr
                      key={`group-checkbox-${groupStt}`}
                      className={isDarkMode ? "bg-gray-800" : "bg-blue-50"}
                    >
                      <td colSpan={7} className="px-6 py-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={allGroupSelected}
                            ref={(el) => {
                              if (el)
                                el.indeterminate =
                                  !allGroupSelected && someGroupSelected;
                            }}
                            onChange={(e) => {
                              const groupIds = groupQuestions.map((q) => q.id);
                              if (e.target.checked) {
                                setSelectedRows((prev) =>
                                  Array.from(new Set([...prev, ...groupIds]))
                                );
                              } else {
                                setSelectedRows((prev) =>
                                  prev.filter((id) => !groupIds.includes(id))
                                );
                              }
                            }}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          <span className="ml-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Chọn tất cả các câu hỏi STT #{groupStt}
                          </span>
                        </label>
                      </td>
                    </tr>
                  ) : null;

                  return (
                    <React.Fragment key={question.id}>
                      {groupCheckbox}
                      <tr
                        className={`${
                          isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                        } transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(question.id)}
                            onChange={() => handleSelectRow(question.id)}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {groupStt || index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="max-w-xs overflow-hidden">
                            {question.question}
                            {question.url_question && (
                              <div className="mt-2">
                                <img
                                  src={question.url_question}
                                  alt="Question"
                                  className="max-w-full h-auto rounded"
                                />
                                <button
                                  type="button"
                                  className="text-blue-600 underline text-xs ml-2"
                                  onClick={() =>
                                    setImageModal({
                                      open: true,
                                      url: question.url_question,
                                    })
                                  }
                                >
                                  Xem ảnh
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="max-w-xs overflow-hidden">
                            {question.answer}
                            {question.url_answer && (
                              <div className="mt-2">
                                <img
                                  src={question.url_answer}
                                  alt="Answer"
                                  className="max-w-full h-auto rounded"
                                />
                                <button
                                  type="button"
                                  className="text-blue-600 underline text-xs ml-2"
                                  onClick={() =>
                                    setImageModal({
                                      open: true,
                                      url: question.url_answer,
                                    })
                                  }
                                >
                                  Xem ảnh
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {question.documentTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {question.categoryTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(question)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Chỉnh sửa"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDeleteModal(question)}
                              className="text-red-500 hover:text-red-700"
                              title="Xóa"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuestionTable;
