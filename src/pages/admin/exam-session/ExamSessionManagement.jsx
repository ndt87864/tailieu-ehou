import React, { useEffect, useState } from 'react';
import ExamSessionFormModal from './ExamSessionFormModal';
import {
  getAllExamSessions,
  addExamSession,
  updateExamSession,
  deleteExamSession,
} from '../../../firebase/examSessionService';
import Sidebar from '../../../components/Sidebar';
import UserHeader from '../../../components/UserHeader';

const ExamSessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dummy props for Sidebar (for admin pages)
  const sidebarData = [];
  const documents = {};
  const [openMain, setOpenMain] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllExamSessions();
      setSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa ca thi này?')) return;
    try {
      await deleteExamSession(id);
      await load();
    } catch (e) {
      console.error(e);
      alert('Xóa thất bại');
    }
  };

  const handleSave = async (payload) => {
    setIsSaving(true);
    try {
      if (editing && editing.id) {
        await updateExamSession(editing.id, payload);
      } else {
        await addExamSession(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      alert('Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        sidebarData={sidebarData}
        documents={documents}
        openMain={openMain}
        setOpenMain={setOpenMain}
        selectedCategory={selectedCategory}
        selectedDocument={selectedDocument}
        setSelectedDocument={setSelectedDocument}
        setSearch={setSearch}
        setDocuments={() => {}}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        hideDocumentTree={true}
      />
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <UserHeader title="Quản lý ca thi" />
        <div className="max-w-4xl mx-auto w-full p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý ca thi</h2>
            <button
              onClick={openAdd}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded shadow"
            >
              + Thêm ca thi
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-300">Đang tải...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <th className="px-4 py-2 font-semibold">Tiêu đề</th>
                      <th className="px-4 py-2 font-semibold">Bắt đầu</th>
                      <th className="px-4 py-2 font-semibold">Kết thúc</th>
                      <th className="px-4 py-2 font-semibold">Hình thức</th>
                      <th className="px-4 py-2 font-semibold">Trạng thái</th>
                      <th className="px-4 py-2 font-semibold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-300">Chưa có ca thi</td>
                      </tr>
                    )}
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-4 py-2">{s.title}</td>
                        <td className="px-4 py-2">{s.startTime || '-'}</td>
                        <td className="px-4 py-2">{s.endTime || '-'}</td>
                        <td className="px-4 py-2">{s.examType || '-'}</td>
                        <td className="px-4 py-2">
                          {s.isActive ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Hoạt động</span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">Đã tắt</span>
                          )}
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          <button
                            onClick={() => openEdit(s)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
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
          </div>
        </div>
        <ExamSessionFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          initial={editing}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
};

export default ExamSessionManagement;


