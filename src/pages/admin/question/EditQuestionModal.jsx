// Ẩn thanh scroll cho phần nội dung form
const hideScrollbarStyle = `
  .custom-hide-scrollbar::-webkit-scrollbar { display: none; }
  .custom-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
import React from "react";

const EditQuestionModal = ({
  showEditModal,
  isDarkMode,
  formError,
  imageError,
  handleUpdateQuestion,
  documents,
  editQuestion,
  handleEditInputChange,
  questionImageInputRef,
  questionImage,
  questionImageUrl,
  setQuestionImage,
  setQuestionImageUrl,
  answerImageInputRef,
  answerImage,
  answerImageUrl,
  setAnswerImage,
  setAnswerImageUrl,
  handleImageChange,
  setShowEditModal,
  isSubmitting,
}) => {
  if (!showEditModal) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full max-w-3xl mx-auto">
        <div
          className={`inline-block align-bottom rounded-lg text-left overflow-hidden sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full transition-colors ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600 hover:border-blue-500"
              : "bg-gray-50 border border-gray-200 hover:border-blue-500"
          }`}
          style={{ maxHeight: "90vh" }}
        >
          {/* Thêm style ẩn thanh scroll */}
          <style>{hideScrollbarStyle}</style>
          <div
            className={`px-6 pt-6 pb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } custom-hide-scrollbar`}
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <h3 className="text-xl font-medium leading-6 mb-5">
              Chỉnh sửa câu hỏi
            </h3>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                {formError}
              </div>
            )}
            {imageError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
                {imageError}
              </div>
            )}
            <form onSubmit={handleUpdateQuestion}>
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">
                  Tài liệu
                </label>
                <div
                  className={`px-4 py-3 rounded-xl border ${
                    isDarkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  }`}
                >
                  {documents.length > 0 && documents[0].title
                    ? documents[0].title
                    : "Unknown Document"}
                </div>
              </div>
              <div className="mb-5">
                <label
                  htmlFor="edit-question"
                  className="block text-sm font-medium mb-2"
                >
                  Câu hỏi
                </label>
                <textarea
                  id="edit-question"
                  name="question"
                  rows="3"
                  className={`w-full rounded-xl py-3 px-4 ${
                    isDarkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Nhập câu hỏi..."
                  value={editQuestion.question}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="mb-5">
                <label
                  htmlFor="edit-questionImage"
                  className="block text-sm font-semibold mb-2"
                >
                  Ảnh cho câu hỏi (không bắt buộc)
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 hover:border-gray-500"
                      : "bg-gray-50 border-gray-300 hover:border-gray-400"
                  } transition-colors`}
                >
                  <input
                    type="file"
                    id="edit-questionImage"
                    accept="image/*"
                    ref={questionImageInputRef}
                    className="hidden"
                    onChange={(e) => handleImageChange(e, "question")}
                  />
                  {questionImage || editQuestion.url_question ? (
                    <div className="py-2">
                      <img
                        src={questionImageUrl || editQuestion.url_question}
                        alt="Question Preview"
                        className="max-w-full h-auto rounded mb-2"
                      />
                      {questionImage && (
                        <>
                          <p className="text-sm font-semibold mb-1">
                            {questionImage.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(questionImage.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionImage(null);
                            setQuestionImageUrl("");
                            if (questionImageInputRef.current)
                              questionImageInputRef.current.value = "";
                            // Xóa luôn url_question trong editQuestion nếu có
                            if (editQuestion.url_question) {
                              editQuestion.url_question = "";
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-md ${
                            isDarkMode
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-red-100 hover:bg-red-200 text-red-700"
                          }`}
                        >
                          Xóa ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionImage(null);
                            setQuestionImageUrl("");
                            if (questionImageInputRef.current)
                              questionImageInputRef.current.value = "";
                            questionImageInputRef.current?.click();
                          }}
                          className={`px-3 py-1 text-xs rounded-md ${
                            isDarkMode
                              ? "bg-gray-600 hover:bg-gray-500 text-white"
                              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          }`}
                        >
                          Chọn ảnh khác
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="py-8 cursor-pointer"
                      onClick={() => questionImageInputRef.current?.click()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 mx-auto text-gray-400 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm font-semibold mb-1">
                        Chọn ảnh cho câu hỏi
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Chấp nhận file ảnh (tối đa 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-5">
                <label
                  htmlFor="edit-answer"
                  className="block text-sm font-medium mb-2"
                >
                  Câu trả lời
                </label>
                <textarea
                  id="edit-answer"
                  name="answer"
                  rows="5"
                  className={`w-full rounded-xl py-3 px-4 ${
                    isDarkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Nhập câu trả lời..."
                  value={editQuestion.answer}
                  onChange={handleEditInputChange}
                />
              </div>
              <div className="mb-5">
                <label
                  htmlFor="edit-answer-Image"
                  className="block text-sm font-semibold mb-2"
                >
                  Ảnh cho câu trả lời (không bắt buộc)
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 hover:border-gray-500"
                      : "bg-gray-50 border-gray-300 hover:border-gray-400"
                  } transition-colors`}
                >
                  <input
                    type="file"
                    id="edit-answerImage"
                    accept="image/*"
                    ref={answerImageInputRef}
                    className="hidden"
                    onChange={(e) => handleImageChange(e, "answer")}
                  />
                  {answerImage || editQuestion.url_answer ? (
                    <div className="py-2">
                      <img
                        src={answerImageUrl || editQuestion.url_answer}
                        alt="Answer Preview"
                        className="max-w-full h-auto rounded mb-2"
                      />
                      {answerImage && (
                        <>
                          <p className="text-sm font-semibold mb-1">
                            {answerImage.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(answerImage.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAnswerImage(null);
                            setAnswerImageUrl("");
                            if (answerImageInputRef.current)
                              answerImageInputRef.current.value = "";
                            // Xóa luôn url_answer trong editQuestion nếu có
                            if (editQuestion.url_answer) {
                              editQuestion.url_answer = "";
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-md ${
                            isDarkMode
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-red-100 hover:bg-red-200 text-red-700"
                          }`}
                        >
                          Xóa ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAnswerImage(null);
                            setAnswerImageUrl("");
                            if (answerImageInputRef.current)
                              answerImageInputRef.current.value = "";
                            answerImageInputRef.current?.click();
                          }}
                          className={`px-3 py-1 text-xs rounded-md ${
                            isDarkMode
                              ? "bg-gray-600 hover:bg-gray-500 text-white"
                              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          }`}
                        >
                          Chọn ảnh khác
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="py-8 cursor-pointer"
                      onClick={() => answerImageInputRef.current?.click()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 mx-auto text-gray-400 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm font-semibold mb-1">
                        Chọn ảnh cho câu trả lời
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Chấp nhận file ảnh (tối đa 5MB)
                      </p>
                    </div>
                  )}
                </div>
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
                    setShowEditModal(false);
                    setQuestionImage(null);
                    setAnswerImage(null);
                    setQuestionImageUrl("");
                    setAnswerImageUrl("");
                    if (questionImageInputRef.current)
                      questionImageInputRef.current.value = "";
                    if (answerImageInputRef.current)
                      answerImageInputRef.current.value = "";
                  }}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  } transition-colors ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang cập nhật..." : "Cập nhật câu hỏi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
