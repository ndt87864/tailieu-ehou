import React, { useState } from "react";

const hideScrollbarStyle = `
  .custom-hide-scrollbar::-webkit-scrollbar { display: none; }
  .custom-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

const EditQuestionModal = ({
  showEditModal,
  isDarkMode,
  questionToEdit,
  setShowEditModal,
  handleEditQuestion,
  isEditing,
  editError,
}) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");

  // Cập nhật lại dữ liệu khi questionToEdit thay đổi
  React.useEffect(() => {
    setQuestion(questionToEdit?.question || "");
    setAnswer(questionToEdit?.answer || "");
    setDocumentTitle(questionToEdit?.documentTitle || "");
  }, [questionToEdit, showEditModal]);

  if (!showEditModal) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <style>{hideScrollbarStyle}</style>
      <div
        className={`custom-hide-scrollbar rounded-lg p-6 shadow-lg w-full max-w-lg overflow-y-auto ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">Chỉnh sửa câu hỏi đề thi</h2>
        <div className="mb-4">
          <label className="block mb-1">Câu hỏi</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Đáp án</label>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Tài liệu</label>
          <input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        {editError && <div className="text-red-500 mb-2">{editError}</div>}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-400"
            onClick={() => setShowEditModal(false)}
            disabled={isEditing}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white"
            onClick={() =>
              handleEditQuestion({
                ...questionToEdit,
                question,
                answer,
                documentTitle,
              })
            }
            disabled={isEditing}
          >
            {isEditing ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
