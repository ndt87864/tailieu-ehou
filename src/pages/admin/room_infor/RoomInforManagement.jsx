import React, { useEffect, useState, useMemo, useRef } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import {
  getAllStudentInfor,
  subscribeStudentInfor,
} from "../../../firebase/studentInforService";
import {
  formatDate,
  normalizeForSearch,
  parseDateToYMD,
  ensureXLSX,
  mapHeaderToKey,
  parseExcelDateToYMD,
} from "../student_infor/studentInforHelpers";
import { useTheme } from "../../../context/ThemeContext";
import { useUserRole } from "../../../context/UserRoleContext";
import Sidebar from "../../../components/Sidebar";
import UserHeader from "../../../components/UserHeader";
import { HomeMobileHeader } from "../../../components/MobileHeader";
import Footer from "../../../components/Footer";
import ThemeColorPicker from "../../../components/ThemeColorPicker";
import { getAllCategoriesWithDocuments } from "../../../firebase/firestoreService";
import Modal from "../../../components/Modal";
import {
  getAllRoomInfor,
  addRoomInfor,
  updateRoomInfor,
} from "../../../firebase/roomInforService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../firebase/firebase";

const emptyRoom = {
  examDate: "",
  subject: "",
  examSession: "",
  examTime: "",
  examRoom: "",
  examLink: "",
};

const RoomInforManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(emptyRoom);
  const [isSaving, setIsSaving] = useState(false);
  // filters for searching
  const [filterSubject, setFilterSubject] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSession, setFilterSession] = useState("");

  // in-app confirmation popup state (replaces window.confirm)
  const [confirmState, setConfirmState] = useState({ open: false, message: "" });
  const confirmResolverRef = useRef(null);

  const showConfirm = (message) =>
    new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ open: true, message });
    });

  const handleConfirmResult = (val) => {
    setConfirmState({ open: false, message: "" });
    if (confirmResolverRef.current) {
      confirmResolverRef.current(val);
      confirmResolverRef.current = null;
    }
  };

  const computeRoomsFromStudents = (students = []) => {
    const map = new Map();
    for (const s of students) {
      // build a composite key from the fields we care about
      const key = `${s.examDate || ""}||${s.subject || ""}||${
        s.examSession || ""
      }||${s.examTime || ""}||${s.examRoom || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key, // deterministic id for display only
          examDate: s.examDate || "",
          subject: s.subject || "",
          examSession: s.examSession || "",
          examTime: s.examTime || "",
          examRoom: s.examRoom || "",
          examLink: s.examLink || "",
        });
      } else {
        // prefer non-empty examLink if current has none
        const existing = map.get(key);
        if ((!existing.examLink || existing.examLink === "") && s.examLink)
          existing.examLink = s.examLink;
      }
    }
    return Array.from(map.values());
  };

  // layout / sidebar state
  const { isDarkMode } = useTheme();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [sidebarData, setSidebarData] = useState([]);
  const [documents, setDocuments] = useState({});
  const [openMain, setOpenMain] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let unsub = null;
    setLoading(true);

    // initial fetch fallback
    getAllStudentInfor()
      .then((students) => {
        setRooms(computeRoomsFromStudents(students || []));
      })
      .catch((e) => {
        console.error("getAllStudentInfor error", e);
        setError("Không thể tải dữ liệu thí sinh");
      })
      .finally(() => setLoading(false));

    // subscribe to realtime updates from student_infor and compute derived rooms
    unsub = subscribeStudentInfor(
      (students) => {
        setRooms(computeRoomsFromStudents(students || []));
      },
      (err) => {
        console.error("subscribeStudentInfor error", err);
        setError("Không thể tải dữ liệu thí sinh (realtime)");
      }
    );

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // load sidebar categories/documents for navigation
  useEffect(() => {
    let mounted = true;
    const loadSidebar = async () => {
      try {
        const cats = await getAllCategoriesWithDocuments();
        if (!mounted) return;
        setSidebarData(cats || []);
        const map = {};
        (cats || []).forEach((c) => {
          map[c.id] = c.documents || [];
        });
        setDocuments(map);
      } catch (e) {
        console.error("Failed to load sidebar data", e);
      }
    };
    loadSidebar();
    return () => {
      mounted = false;
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setEditingKey(null);
    setForm(emptyRoom);
    setIsModalOpen(true);
  };

  const makeKey = (r) =>
    `${r.examDate || ""}||${r.subject || ""}||${r.examSession || ""}||${
      r.examTime || ""
    }||${r.examRoom || ""}`;

  const getMatchingRoomDocs = async (roomObj) => {
    try {
      const all = await getAllRoomInfor();

      // Match by subject, examSession, examTime, examRoom (normalized). Only require examDate when it's provided in roomObj.
      return all.filter((d) => {
        try {
          const norm = (v) => normalizeForSearch(String(v || "")).trim();

          // if caller provided examDate (non-empty), require date equality (normalized YMD)
          if (roomObj.examDate) {
            const a = parseDateToYMD(roomObj.examDate || "");
            const b = parseDateToYMD(d.examDate || "");
            if (a !== b) return false;
          }

          // subject/session/time/room comparisons
          const fieldsMatch =
            norm(d.subject) === norm(roomObj.subject) &&
            norm(d.examSession) === norm(roomObj.examSession) &&
            norm(d.examTime) === norm(roomObj.examTime) &&
            norm(d.examRoom) === norm(roomObj.examRoom);

          return fieldsMatch;
        } catch (e) {
          return false;
        }
      });
    } catch (err) {
      console.error("getMatchingRoomDocs error", err);
      return [];
    }
  };

  const filteredRooms = useMemo(() => {
    const sFilter = normalizeForSearch(filterSubject || "");
    const rFilter = normalizeForSearch(filterRoom || "");
    const sessFilter = normalizeForSearch(filterSession || "");
    const dateFilter = filterDate || ""; // YYYY-MM-DD from input

    return (rooms || []).filter((r) => {
      // subject
      if (sFilter) {
        const subj = normalizeForSearch(r.subject || "");
        if (!subj.includes(sFilter)) return false;
      }
      // room
      if (rFilter) {
        const room = normalizeForSearch(r.examRoom || "");
        if (!room.includes(rFilter)) return false;
      }
      // session
      if (sessFilter) {
        const sess = normalizeForSearch(r.examSession || "");
        if (!sess.includes(sessFilter)) return false;
      }
      // date exact match (normalize to YYYY-MM-DD)
      if (dateFilter) {
        const rYmd = parseDateToYMD(r.examDate || "");
        if (rYmd !== dateFilter) return false;
      }
      return true;
    });
  }, [rooms, filterSubject, filterRoom, filterDate, filterSession]);

  // Import unique room metadata from existing student_infor records
  const importFromStudents = async () => {
    const proceed = await showConfirm(
      "Nhập danh sách phòng từ dữ liệu thí sinh hiện có? Các phòng trùng sẽ được bỏ qua."
    );
    if (!proceed) return;
    setIsSaving(true);
    try {
      const students = await getAllStudentInfor();
      if (!Array.isArray(students) || students.length === 0) {
        alert("Không tìm thấy bản ghi thí sinh để nhập.");
        return;
      }

      // Build a set of keys for existing rooms to avoid duplicates
      const existingKeys = new Set(
        (rooms || []).map(
          (r) =>
            `${r.examDate}||${r.subject}||${r.examSession}||${r.examTime}||${r.examRoom}`
        )
      );

      // From students, build unique room candidates
      const candidatesMap = new Map();
      for (const s of students) {
        const key = `${s.examDate || ""}||${s.subject || ""}||${
          s.examSession || ""
        }||${s.examTime || ""}||${s.examRoom || ""}`;
        if (!key) continue;
        // skip empty key
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            examDate: s.examDate || "",
            subject: s.subject || "",
            examSession: s.examSession || "",
            examTime: s.examTime || "",
            examRoom: s.examRoom || "",
            examLink: s.examLink || "",
          });
        }
      }

      const toAdd = [];
      for (const [key, roomObj] of candidatesMap.entries()) {
        if (!existingKeys.has(key)) toAdd.push(roomObj);
      }

      if (toAdd.length === 0) {
        alert("Không có phòng mới để thêm.");
        return;
      }

      // insert sequentially to avoid Firestore rate spikes; could be parallelized
      for (const r of toAdd) {
        await addRoomInfor(r);
      }

      alert(`Đã thêm ${toAdd.length} phòng mới từ dữ liệu thí sinh.`);
    } catch (err) {
      console.error("importFromStudents error", err);
      alert("Lỗi khi nhập dữ liệu từ thí sinh. Xem console để biết chi tiết.");
    } finally {
      setIsSaving(false);
    }
  };

  // Import examDate and examLink from Excel when matching subject/session/time/room
  const handleExcelImport = async (file) => {
    if (!file) return;
    const proceed = await showConfirm(
      "Nhập từ file Excel: sẽ cập nhật ngày thi và link phòng cho các phòng khớp (không tạo mới). Tiếp tục?"
    );
    if (!proceed) return;
    setIsSaving(true);
    try {
      const XLSX = await ensureXLSX();
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!Array.isArray(json) || json.length === 0) {
        alert("File Excel không có dữ liệu.");
        return;
      }

      // Map headers: take the first row keys
      const headerMap = {};
      const firstRow = json[0];
      Object.keys(firstRow).forEach((h) => {
        const mapped = mapHeaderToKey(h);
        if (mapped) headerMap[h] = mapped;
      });

      // We expect at least subject, examSession, examTime, examRoom to match; date/link optional
      let updatedCount = 0;
      let rowCount = 0;

      for (const row of json) {
        rowCount++;
        const mapped = {};
        Object.entries(row).forEach(([k, v]) => {
          const key = headerMap[k];
          if (key) mapped[key] = v;
        });

        // build match key from subject/session/time/room
        const keyObj = {
          subject: (mapped.subject || "").toString().trim(),
          examSession: (mapped.examSession || "").toString().trim(),
          examTime: (mapped.examTime || "").toString().trim(),
          examRoom: (mapped.examRoom || "").toString().trim(),
        };

        if (
          !keyObj.subject &&
          !keyObj.examSession &&
          !keyObj.examTime &&
          !keyObj.examRoom
        )
          continue;

        const matches = await getMatchingRoomDocs(keyObj);
        if (!matches || matches.length === 0) continue;

        // normalize date value if present
        let rowDate = "";
        if (mapped.examDate) {
          rowDate = parseExcelDateToYMD(mapped.examDate);
        }
        const rowLink = mapped.examLink ? String(mapped.examLink).trim() : "";

        for (const doc of matches) {
          const updates = {};
          // update date if present in excel and missing in db
          const docDate = parseDateToYMD(doc.examDate || "");
          if (rowDate && !docDate) updates.examDate = rowDate;
          // update link if present in excel and missing in db
          if (rowLink && (!doc.examLink || String(doc.examLink).trim() === ""))
            updates.examLink = rowLink;

          if (Object.keys(updates).length > 0) {
            await updateRoomInfor(doc.id, { ...doc, ...updates });
            updatedCount++;
          }
        }
      }

      alert(
        `Đã xử lý ${rowCount} dòng. Cập nhật ${updatedCount} bản ghi phòng.`
      );
    } catch (err) {
      console.error("handleExcelImport error", err);
      alert("Lỗi khi đọc file Excel. Xem console để biết chi tiết.");
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ ...r });
    setEditingKey(makeKey(r));
    setIsModalOpen(true);
  };

  const handleChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSaving(true);
    try {
      if (editing) {
        // update all room_infor docs that match the original composite key
        const matches = await getMatchingRoomDocs({
          examDate: editing.examDate,
          subject: editing.subject,
          examSession: editing.examSession,
          examTime: editing.examTime,
          examRoom: editing.examRoom,
        });

        if (matches.length === 0) {
          // nothing to update, create a new room doc
          await addRoomInfor(form);
        } else {
          for (const doc of matches) {
            await updateRoomInfor(doc.id, { ...form });
          }
        }
      } else {
        await addRoomInfor(form);
      }

      setIsModalOpen(false);
      setEditing(null);
      setEditingKey(null);
      setForm(emptyRoom);
      setError(null);
    } catch (err) {
      console.error("save room error", err);
      setError("Lưu thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {windowWidth < 770 && (
        <HomeMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen w-full">
        {isAdmin && (
          <div
            className={`theme-sidebar ${
              windowWidth < 770
                ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                  }`
                : "sticky top-0 h-screen z-10"
            }`}
          >
            <Sidebar
              sidebarData={sidebarData}
              documents={documents}
              openMain={openMain}
              setOpenMain={setOpenMain}
              selectedCategory={selectedCategory}
              selectedDocument={selectedDocument}
              setSelectedDocument={setSelectedDocument}
              setSearch={() => {}}
              setDocuments={setDocuments}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              hideDocumentTree={true}
            />
          </div>
        )}

        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="theme-content-container flex-1 min-w-0 shadow-sm flex flex-col">
          {windowWidth >= 770 && (
            <div className="w-full">
              <UserHeader
                title="Quản lý thông tin phòng thi"
                setIsSidebarOpen={setIsSidebarOpen}
                setIsThemePickerOpen={setIsThemePickerOpen}
              />
            </div>
          )}

          <div className="flex-1 p-6 min-w-0">
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quản lý thông tin phòng thi</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Lấy dữ liệu trực tiếp từ bảng thí sinh — chỉ hiển thị các trường cần thiết và loại bỏ trùng.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="room-excel-file"
                      type="file"
                      accept=".xls,.xlsx"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handleExcelImport(f);
                        e.target.value = null;
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => document.getElementById("room-excel-file")?.click()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5"/></svg>
                      Import Excel
                    </button>
                  </div>
                </div>

                <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="relative">
                      <input
                        placeholder="Tìm theo tên môn"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="px-3 py-2 rounded-lg border w-full bg-gray-50 dark:bg-gray-900 text-sm"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Môn</div>
                    </div>

                    <div className="relative">
                      <input
                        placeholder="Tìm theo phòng"
                        value={filterRoom}
                        onChange={(e) => setFilterRoom(e.target.value)}
                        className="px-3 py-2 rounded-lg border w-full bg-gray-50 dark:bg-gray-900 text-sm"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Phòng</div>
                    </div>

                    <div>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border w-full bg-gray-50 dark:bg-gray-900 text-sm"
                      />
                    </div>

                    <div className="relative">
                      <input
                        placeholder="Tìm theo ca thi"
                        value={filterSession}
                        onChange={(e) => setFilterSession(e.target.value)}
                        className="px-3 py-2 rounded-lg border w-full bg-gray-50 dark:bg-gray-900 text-sm"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Ca</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">Tổng: <strong>{rooms.length}</strong> — Hiển thị: <strong>{filteredRooms.length}</strong></div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setFilterSubject(""); setFilterRoom(""); setFilterDate(""); setFilterSession(""); }}
                        className="px-3 py-1 rounded border text-sm"
                      >Xóa bộ lọc</button>
                      <button
                        onClick={importFromStudents}
                        className="px-3 py-1 rounded border text-sm"
                      >Nhập từ thí sinh</button>
                    </div>
                  </div>
                </div>
              </div>
            {error && (
              <div className="mb-4 text-sm text-red-700">{String(error)}</div>
            )}

            {loading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Tổng: <strong>{rooms.length}</strong>
                    </div>
                  </div>
                  <table className="min-w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Ngày thi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Tên môn học
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Ca thi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Thời gian
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Phòng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Link phòng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-sm text-gray-500"
                          >
                            Không có dữ liệu
                          </td>
                        </tr>
                      ) : (
                        filteredRooms.map((r, idx) => (
                          <tr
                            key={r.id}
                            className={`${
                              idx % 2 === 0
                                ? "bg-white dark:bg-gray-800"
                                : "bg-gray-50 dark:bg-gray-700"
                            } hover:bg-gray-100 dark:hover:bg-gray-600`}
                          >
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                              {r.examDate ? (
                                formatDate(r.examDate)
                              ) : (
                                <span className="text-sm text-gray-500">
                                  chưa cập nhật
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                              {r.subject || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                              {r.examSession || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                              {r.examTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                              {r.examRoom || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 break-all">
                              {r.examLink ? (
                                <a
                                  href={r.examLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  Mở link
                                </a>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  (không)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openEdit(r)}
                                  className="px-2 py-1 rounded bg-yellow-400 text-xs text-white hover:opacity-90"
                                >
                                  Sửa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation modal (replaces native window.confirm) */}
          <Modal
            isOpen={confirmState.open}
            onClose={() => handleConfirmResult(false)}
            title="Xác nhận"
          >
            <div className="space-y-4">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                {confirmState.message}
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => handleConfirmResult(false)}
                  className="px-4 py-2 rounded border text-sm"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmResult(true)}
                  className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          </Modal>

          {/* Edit/Add modal for room_infor (updates all matching DB records when saving) */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditing(null);
              setEditingKey(null);
              setForm(emptyRoom);
            }}
            title={editing ? "Sửa thông tin phòng (đồng bộ)" : "Thêm phòng mới"}
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-sm text-gray-600">Ngày thi</div>
                  <input
                    type="date"
                    value={form.examDate || ""}
                    onChange={(e) => handleChange("examDate", e.target.value)}
                    className="mt-1 block w-full rounded border px-3 py-2"
                  />
                </label>

                <label className="block">
                  <div className="text-sm text-gray-600">Tên môn học</div>
                  <input
                    value={form.subject || ""}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    className="mt-1 block w-full rounded border px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <div className="text-sm text-gray-600">Ca thi</div>
                  <input
                    value={form.examSession || ""}
                    onChange={(e) =>
                      handleChange("examSession", e.target.value)
                    }
                    className="mt-1 block w-full rounded border px-3 py-2"
                  />
                </label>

                <label className="block">
                  <div className="text-sm text-gray-600">Thời gian</div>
                  <input
                    value={form.examTime || ""}
                    onChange={(e) => handleChange("examTime", e.target.value)}
                    className="mt-1 block w-full rounded border px-3 py-2"
                  />
                </label>

                <label className="block">
                  <div className="text-sm text-gray-600">Phòng</div>
                  <input
                    value={form.examRoom || ""}
                    onChange={(e) => handleChange("examRoom", e.target.value)}
                    className="mt-1 block w-full rounded border px-3 py-2"
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm text-gray-600">Link phòng</div>
                <input
                  value={form.examLink || ""}
                  onChange={(e) => handleChange("examLink", e.target.value)}
                  className="mt-1 block w-full rounded border px-3 py-2"
                />
              </label>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditing(null);
                    setEditingKey(null);
                    setForm(emptyRoom);
                  }}
                  className="px-4 py-2 rounded border text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                >
                  {isSaving ? "Đang lưu..." : "Lưu và đồng bộ"}
                </button>
              </div>
            </form>
          </Modal>

          <Footer />
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />
    </div>
  );
};

export default RoomInforManagement;
