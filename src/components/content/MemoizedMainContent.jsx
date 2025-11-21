// Đối tượng React.memo để tối ưu hiệu suất cho các component con
import React, { memo, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

// Component MainContent được wrap bởi React.memo để tránh render lại khi props không thay đổi
export const MemoizedMainContent = memo(({ filteredQuestions }) => {
  const { isDarkMode } = useTheme();

  // State cho modal xem ảnh
  const [imageModal, setImageModal] = useState({ open: false, url: "" });

  // Hàm render modal popup ảnh
  const renderImageModal = () =>
    imageModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div
          className="rounded-lg p-4 max-w-2xl w-full relative bg-cover bg-center"
          style={{
            backgroundColor: "#fff", // fallback nếu ảnh lỗi
          }}
        >
          <div className="absolute inset-0 bg-white bg-opacity-80 rounded-lg pointer-events-none" />
          <button
            className="absolute top-1.5 right-1.5 bg-red-600 rounded-full text-white text-lg w-7 h-7 flex items-center justify-center border border-gray-300 hover:border-blue-500 transition-colors z-50 backdrop-blur"
            onClick={() => setImageModal({ open: false, url: "" })}
            title="Đóng"
            style={{ boxShadow: "0 2px 8px rgba(245, 14, 14, 0.95)" }}
          >
            &times;
          </button>
          <img
            src={imageModal.url}
            alt="Preview"
            className="w-full h-auto max-h-[70vh] object-contain rounded relative z-10"
          />
          <div className="mt-3 text-center relative z-10">
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

  // Nếu không có câu hỏi nào để hiển thị, hiển thị trạng thái rỗng
  if (filteredQuestions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <svg
            className={`mx-auto h-12 w-12 ${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3
            className={`mt-4 text-lg font-medium ${
              isDarkMode ? "text-gray-300" : "text-gray-900"
            }`}
          >
            Không có câu hỏi nào
          </h3>
          <p
            className={`mt-2 text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Không tìm thấy câu hỏi phù hợp với tìm kiếm của bạn.
          </p>
        </div>
      </div>
    );
  }

  // Handlers để ngăn chặn việc sao chép
  const handleCopy = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="py-4">
      {renderImageModal()}
      {/* Hiển thị dạng bảng trên desktop */}
      <div className="hidden md:block">
        <div
          className={`questions-wrapper overflow-hidden rounded-lg shadow ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } mx-6`}
          onCopy={handleCopy}
          onCut={handleCopy}
          onDragStart={handleCopy}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          <div className="overflow-x-auto">
            <table
              className={`question-table min-w-full divide-y ${
                isDarkMode ? "divide-gray-700" : "divide-gray-200"
              }`}
            >
              <thead className={isDarkMode ? "bg-gray-700" : "bg-gray-50"}>
                <tr>
                  <th
                    scope="col"
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? "text-gray-300" : "text-gray-500"
                    }`}
                    style={{ width: "60px" }}
                  >
                    STT
                  </th>
                  <th
                    scope="col"
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? "text-gray-300" : "text-gray-500"
                    }`}
                    style={{ width: "40%" }}
                  >
                    Câu hỏi
                  </th>
                  <th
                    scope="col"
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    Câu trả lời
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isDarkMode ? "divide-gray-700" : "divide-gray-200"
                }`}
              >
                {/* Luôn sử dụng chỉ số + 1 để đánh số thứ tự liên tiếp (1, 2, 3, ...) */}
                {filteredQuestions.map((question, index) => (
                  <tr
                    key={question.id || index}
                    className={
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                    }
                  >
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {index + 1}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      <div className="break-words" data-nocopy="true">
                        {question.question}
                      </div>
                      {question.url_question && (
                        <div className="mt-2 flex flex-col items-start gap-1">
                          <img
                            src={question.url_question}
                            alt="Ảnh câu hỏi"
                            className="max-w-xs h-auto rounded"
                          />
                          <button
                            type="button"
                            className="text-blue-600 underline text-xs mt-1"
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
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      <div
                        className="break-words whitespace-pre-line"
                        data-nocopy="true"
                      >
                        {question.answer}
                      </div>
                      {question.url_answer && (
                        <div className="mt-2 flex flex-col items-start gap-1">
                          <img
                            src={question.url_answer}
                            alt="Ảnh trả lời"
                            className="max-w-xs h-auto rounded"
                          />
                          <button
                            type="button"
                            className="text-blue-600 underline text-xs mt-1"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className={`px-6 py-3 text-sm ${
              isDarkMode
                ? "text-gray-400 bg-gray-700"
                : "text-gray-500 bg-gray-50"
            } border-t`}
          >
            Hiển thị {filteredQuestions.length} câu hỏi
          </div>
        </div>
      </div>

      {/* Hiển thị dạng card trên mobile */}
      <div className="md:hidden">
        {filteredQuestions.map((question, index) => (
          <div
            key={question.id || index}
            className="question-card"
            onCopy={handleCopy}
            onCut={handleCopy}
            onDragStart={handleCopy}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
          >
              <div
                className={`question-card-header px-4 py-3 ${
                  isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-start">
                  <span
                    className={`question-index inline-flex items-center justify-center flex-shrink-0 w-6 h-6 mr-2 rounded-full text-xs ${
                      isDarkMode
                        ? "bg-gray-600 text-gray-300"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <span
                      className={`text-xs font-medium ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      } mb-1 block`}
                    >
                      Câu hỏi:
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                      data-nocopy="true"
                    >
                      {question.question}
                    </span>
                    {question.url_question && (
                      <div className="mt-2 flex flex-col items-start gap-1">
                        <img
                          src={question.url_question}
                          alt="Ảnh câu hỏi"
                          className="max-w-xs h-auto rounded"
                        />
                        <button
                          type="button"
                          className="text-blue-600 underline text-xs mt-1"
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
                </div>
              </div>
              <div
                className={`question-card-body px-4 py-3 text-sm ${
                  isDarkMode
                    ? "text-gray-300 border-t border-gray-700"
                    : "text-gray-700 border-t border-gray-200"
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  } mb-1 block`}
                >
                  Trả lời:
                </span>
                <div className="whitespace-pre-line" data-nocopy="true">
                  {question.answer}
                </div>
                {question.url_answer && (
                  <div className="mt-2 flex flex-col items-start gap-1">
                    <img
                      src={question.url_answer}
                      alt="Ảnh trả lời"
                      className="max-w-xs h-auto rounded"
                    />
                    <button
                      type="button"
                      className="text-blue-600 underline text-xs mt-1"
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
            </div>
          ))}
          <div
            className={`mt-4 p-3 rounded-lg text-sm text-center ${
              isDarkMode
                ? "text-gray-400 bg-gray-800"
                : "text-gray-500 bg-gray-100"
            }`}
          >
            Hiển thị {filteredQuestions.length} câu hỏi
          </div>
      </div>
    </div>
  );
});

MemoizedMainContent.displayName = "MemoizedMainContent";

export default MemoizedMainContent;
