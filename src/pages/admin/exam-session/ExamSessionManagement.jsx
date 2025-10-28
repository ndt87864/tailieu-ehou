import React, { useEffect, useState } from "react";
import ExamSessionFormModal from "./ExamSessionFormModal";
import {
  getAllExamSessions,
  addExamSession,
  updateExamSession,
  deleteExamSession,
} from "../../../firebase/examSessionService";
import {
  getAllStudentInfor,
  updateStudentInfor,
} from "../../../firebase/studentInforService";
import Sidebar from "../../../components/Sidebar";
import UserHeader from "../../../components/UserHeader";

const ExamSessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [syncingSessionInfo, setSyncingSessionInfo] = useState(null); // Lưu thông tin ca thi đang đồng bộ

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
    if (!window.confirm("Xóa ca thi này?")) return;
    try {
      await deleteExamSession(id);
      await load();
    } catch (e) {
      console.error(e);
      alert("Xóa thất bại");
    }
  };

  // Helper để format examTime
  const formatExamTime = (start, end) => {
    const toHM = (t) => {
      if (!t) return "";
      // Nếu là string dạng HH:mm hoặc HH:mm:ss thì trả về luôn
      if (typeof t === "string") {
        // Nếu là ISO string, chuyển sang Date
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) {
          const d = new Date(t);
          if (d instanceof Date && !isNaN(d)) {
            return `${d.getHours()}h${d
              .getMinutes()
              .toString()
              .padStart(2, "0")}`;
          }
        }
        // Nếu là HH:mm hoặc HH:mm:ss thì lấy phần giờ/phút
        const match = t.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          return `${match[1]}h${match[2]}`;
        }
        return t; // fallback: trả về nguyên text
      }
      if (t && typeof t.toDate === "function") t = t.toDate();
      if (t instanceof Date && !isNaN(t)) {
        return `${t.getHours()}h${t.getMinutes().toString().padStart(2, "0")}`;
      }
      return "";
    };
    return `${toHM(start)} - ${toHM(end)}`;
  };

  // Đồng bộ examTime cho student_infor khi thêm/sửa ca thi
  const syncExamTimeForStudents = async (session) => {
    setSyncing(true);
    setSyncingSessionInfo({
      title: session.title,
      examType: session.examType || "Onsite",
    });
    try {
      const students = await getAllStudentInfor();
      // Lọc ra sinh viên cùng ca thi (cùng examSession, examType)
      const related = students.filter(
        (student) =>
          student.examSession === session.title &&
          (student.examType || "Onsite") === (session.examType || "Onsite")
      );
      // Luôn đồng bộ lại examTime cho tất cả sinh viên thuộc ca thi này
      let updated = 0;
      let total = related.length;
      let done = 0;
      setSyncProgress({ done: 0, total });
      const batchSize = 10;
      const newExamTime = formatExamTime(session.startTime, session.endTime);
      for (let i = 0; i < related.length; i += batchSize) {
        const batch = related.slice(i, i + batchSize);
        await Promise.all(
          batch.map((student) =>
            updateStudentInfor(student.id, { examTime: newExamTime })
          )
        );
        updated += batch.length;
        done += batch.length;
        setSyncProgress({ done: Math.min(done, related.length), total });
      }
      setSyncProgress({ done: related.length, total });
      if (updated > 0) {
        alert(`Đã đồng bộ thời gian cho ${updated} sinh viên.`);
      }
    } catch (err) {
      console.error("Lỗi đồng bộ examTime:", err);
    } finally {
      setSyncing(false);
      setSyncingSessionInfo(null);
    }
  };

  const handleSave = async (payload) => {
    setIsSaving(true);
    try {
      let session;
      if (editing && editing.id) {
        await updateExamSession(editing.id, payload);
        // Sử dụng title mới (payload.title) để đồng bộ đúng sinh viên thuộc ca thi mới
        session = { ...payload, title: payload.title, id: editing.id };
      } else {
        const added = await addExamSession(payload);
        session = { ...payload, ...added };
      }
      setModalOpen(false);
      await load();
      // Sau khi lưu ca thi, đồng bộ thời gian cho sinh viên
      await syncExamTimeForStudents(session);
    } catch (e) {
      console.error(e);
      alert("Lưu thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Popup tiến trình đồng bộ */}
      {syncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-w-[320px] flex flex-col items-center">
            <div className="mb-2 font-semibold text-lg text-gray-800 dark:text-white">
              Đang đồng bộ thời gian ca thi
              {syncingSessionInfo && (
                <>
                  <br />
                  <span className="text-base font-normal text-blue-700 dark:text-blue-300">
                    {syncingSessionInfo.title} ({syncingSessionInfo.examType})
                  </span>
                </>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{
                  width: `${
                    syncProgress.total
                      ? Math.round(
                          (syncProgress.done / syncProgress.total) * 100
                        )
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-200">
              {syncProgress.done} / {syncProgress.total} sinh viên cùng ca thi
            </div>
            {syncProgress.total === 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Không có sinh viên nào thuộc ca thi này.
              </div>
            )}
          </div>
        </div>
      )}
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
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Quản lý ca thi
            </h2>
            <button
              onClick={openAdd}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded shadow"
            >
              + Thêm ca thi
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                Đang tải...
              </div>
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
                        <td
                          colSpan={6}
                          className="text-center py-6 text-gray-500 dark:text-gray-300"
                        >
                          Chưa có ca thi
                        </td>
                      </tr>
                    )}
                    {sessions.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <td className="px-4 py-2">{s.title}</td>
                        <td className="px-4 py-2">{s.startTime || "-"}</td>
                        <td className="px-4 py-2">{s.endTime || "-"}</td>
                        <td className="px-4 py-2">{s.examType || "-"}</td>
                        <td className="px-4 py-2">
                          {s.isActive ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                              Đã tắt
                            </span>
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
