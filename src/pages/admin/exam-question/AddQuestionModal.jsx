import React, { useState } from "react";

const hideScrollbarStyle = `
  .custom-hide-scrollbar::-webkit-scrollbar { display: none; }
  .custom-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

const AddQuestionModal = ({
  showAddModal,
  isDarkMode,
  setShowAddModal,
  handleAddQuestion,
  isAdding,
  addError,
}) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");

  if (!showAddModal) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <style>{hideScrollbarStyle}</style>
      <div
        className={`custom-hide-scrollbar rounded-lg p-6 shadow-lg w-full max-w-lg overflow-y-auto ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">Thêm câu hỏi đề thi mới</h2>
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
        {addError && <div className="text-red-500 mb-2">{addError}</div>}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-400"
            onClick={() => setShowAddModal(false)}
            disabled={isAdding}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white"
            onClick={() =>
              handleAddQuestion({ question, answer, documentTitle })
            }
            disabled={isAdding}
          >
            {isAdding ? "Đang thêm..." : "Thêm mới"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionModal;
