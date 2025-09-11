import React, { useState, useEffect } from "react";
import { getAllExamQuestions } from "../../../firebase";
import AddQuestionModal from "./AddQuestionModal";
import EditQuestionModal from "./EditQuestionModal";
import DeleteQuestionModal from "./DeleteQuestionModal";

const ExamQuestionTable = ({ isDarkMode }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageModal, setImageModal] = useState({ open: false, url: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const fetchQuestions = () => {
    setLoading(true);
    getAllExamQuestions()
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);
  // Xử lý thêm mới câu hỏi đề thi
  const handleAddQuestion = async (data) => {
    setIsAdding(true);
    setAddError(null);
    try {
      const { addExamQuestion } = await import("../../../firebase");
      await addExamQuestion(data);
      setShowAddModal(false);
      fetchQuestions();
    } catch (err) {
      setAddError(err.message || "Lỗi khi thêm câu hỏi");
    } finally {
      setIsAdding(false);
    }
  };

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
      <div className="flex justify-end p-4">
        <button
          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition"
          onClick={() => setShowAddModal(true)}
        >
          Thêm câu hỏi
        </button>
      </div>
      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Đang tải dữ liệu...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-6 text-center">
          <p>Không có câu hỏi đề thi nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={isDarkMode ? "bg-gray-600" : "bg-gray-50"}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Câu hỏi
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Đáp án
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Tài liệu
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDarkMode ? "divide-gray-700" : "divide-gray-200"
              }`}
            >
              {questions.map((q, idx) => (
                <tr
                  key={q.id}
                  className={
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {q.stt || idx + 1}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="max-w-xs overflow-hidden">
                      {q.question}
                      {q.url_question && (
                        <div className="mt-2">
                          <img
                            src={q.url_question}
                            alt="Question"
                            className="max-w-full h-auto rounded"
                          />
                          <button
                            type="button"
                            className="text-blue-600 underline text-xs ml-2"
                            onClick={() =>
                              setImageModal({ open: true, url: q.url_question })
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
                      {q.answer}
                      {q.url_answer && (
                        <div className="mt-2">
                          <img
                            src={q.url_answer}
                            alt="Answer"
                            className="max-w-full h-auto rounded"
                          />
                          <button
                            type="button"
                            className="text-blue-600 underline text-xs ml-2"
                            onClick={() =>
                              setImageModal({ open: true, url: q.url_answer })
                            }
                          >
                            Xem ảnh
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {q.documentTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      className="mr-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => {
                        setQuestionToEdit(q);
                        setShowEditModal(true);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => {
                        setQuestionToDelete(q);
                        setShowDeleteModal(true);
                        setIsDeleteConfirmed(false);
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal thêm câu hỏi */}
      <AddQuestionModal
        showAddModal={showAddModal}
        isDarkMode={isDarkMode}
        setShowAddModal={setShowAddModal}
        handleAddQuestion={handleAddQuestion}
        isAdding={isAdding}
        addError={addError}
      />
      {/* Modal sửa câu hỏi */}
      <EditQuestionModal
        showEditModal={showEditModal}
        isDarkMode={isDarkMode}
        questionToEdit={questionToEdit}
        setShowEditModal={setShowEditModal}
        handleEditQuestion={async (updated) => {
          // Gọi API cập nhật, truyền đúng id và data
          try {
            const { updateExamQuestion } = await import("../../../firebase");
            await updateExamQuestion(updated.id, {
              question: updated.question,
              answer: updated.answer,
              documentTitle: updated.documentTitle,
            });
            setShowEditModal(false);
            fetchQuestions();
          } catch (err) {
            // Xử lý lỗi nếu cần
          }
        }}
        isEditing={false}
        editError={null}
      />
      {/* Modal xóa câu hỏi */}
      <DeleteQuestionModal
        showDeleteModal={showDeleteModal}
        isDarkMode={isDarkMode}
        questionToDelete={questionToDelete}
        setShowDeleteModal={setShowDeleteModal}
        handleDeleteQuestion={async () => {
          // Gọi API xóa, sau đó fetch lại danh sách
          try {
            const { deleteExamQuestion } = await import("../../../firebase");
            await deleteExamQuestion(questionToDelete?.id);
            setShowDeleteModal(false);
            setIsDeleteConfirmed(false);
            fetchQuestions();
          } catch (err) {
            // Xử lý lỗi nếu cần
          }
        }}
        isDeleting={false}
        deleteError={null}
        isDeleteConfirmed={isDeleteConfirmed}
        setIsDeleteConfirmed={setIsDeleteConfirmed}
      />
    </div>
  );
};

export default ExamQuestionTable;
