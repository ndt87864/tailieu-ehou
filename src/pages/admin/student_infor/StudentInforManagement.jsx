import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useTheme } from "../../../context/ThemeContext";
import { useUserRole } from "../../../context/UserRoleContext";
import { auth } from "../../../firebase/firebase";
import {
  getAllStudentInfor,
  subscribeStudentInfor,
  addStudentInfor,
  updateStudentInfor,
  deleteStudentInfor,
} from "../../../firebase/studentInforService";
import Sidebar from "../../../components/Sidebar";
import UserHeader from "../../../components/UserHeader";
import { DocumentMobileHeader } from "../../../components/MobileHeader";
import ThemeColorPicker from "../../../components/ThemeColorPicker";
import StudentFormModal from "./StudentFormModal";
import StudentTable from "./StudentTable";
import {
  ensureXLSX,
  mapHeaderToKey,
  normalizeForSearch,
  formatDate,
  isValidUrl,
  parseDateToYMD,
  computePendingLinkUpdates,
} from "./studentInforHelpers";

const columns = [
  { key: "studentId", label: "Mã sv" },
  { key: "fullName", label: "Họ và tên" },
  { key: "dob", label: "Ngày sinh" },
  { key: "subject", label: "Tên môn học" },
  { key: "examSession", label: "Ca thi" },
  { key: "examTime", label: "Thời gian" },
  { key: "examRoom", label: "Phòng thi" },
  { key: "course", label: "Khóa" },
  { key: "majorCode", label: "Mã ngành" },
  { key: "examType", label: "Hình thức thi" },
  { key: "examLink", label: "Link phòng" },
];

const emptyForm = {
  studentId: "",
  fullName: "",
  dob: "",
  subject: "",
  examSession: "",
  examTime: "",
  examRoom: "",
  course: "",
  majorCode: "",
  examType: "",
  examLink: "",
};

const StudentInforManagement = () => {
  const [studentInfors, setStudentInfors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const { isDarkMode } = useTheme();
  const { isAdmin } = useUserRole();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importErrors, setImportErrors] = useState([]);
  const [lastRawHeaders, setLastRawHeaders] = useState(null);
  const [lastHeaderMap, setLastHeaderMap] = useState(null);
  const [lastIgnoredHeaders, setLastIgnoredHeaders] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [syncErrors, setSyncErrors] = useState([]);
  const ALLOWED_IMPORT_KEYS = [
    "studentId",
    "fullName",
    "dob",
    "subject",
    "examSession",
    "examTime",
    "examRoom",
    "course",
    "majorCode",
    "examType",
    "examLink",
  ];
  // layout / sidebar states
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllStudentInfor();
      setStudentInfors(data || []);
    } catch (e) {
      console.error(e);
      setError("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // computePendingLinkUpdates is provided by studentInforHelpers
  const syncExamLinks = async () => {
    if (
      !window.confirm(
        "Bạn có chắc muốn đồng bộ link phòng cho các bản ghi thiếu?"
      )
    )
      return;
    setIsSyncing(true);
    setSyncErrors([]);
    try {
      const updates = computePendingLinkUpdates(studentInfors);

      if (updates.length === 0) {
        alert("Không có bản ghi nào cần đồng bộ.");
        return;
      }

      setSyncProgress({ done: 0, total: updates.length });
      const errors = [];
      let done = 0;
      for (const u of updates) {
        try {
          await updateStudentInfor(u.id, { examLink: u.link });
          // update local state
          setStudentInfors((prev) =>
            prev.map((p) => (p.id === u.id ? { ...p, examLink: u.link } : p))
          );
        } catch (err) {
          console.error("Sync update error", err, u);
          errors.push({ id: u.id, error: err?.message || String(err) });
        } finally {
          done += 1;
          setSyncProgress({ done, total: updates.length });
        }
      }

      setSyncErrors(errors);
      if (errors.length > 0) {
        setError(
          `Đồng bộ hoàn tất nhưng có ${errors.length} lỗi. Kiểm tra console để biết chi tiết.`
        );
      } else {
        setError(null);
        alert(`Đồng bộ thành công ${updates.length} bản ghi.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Subscribe to realtime updates
    setLoading(true);
    const unsubscribe = subscribeStudentInfor(
      (data) => {
        setStudentInfors(data || []);
        setLoading(false);
      },
      (err) => {
        console.error("Realtime load error", err);
        setError("Không thể tải dữ liệu (realtime)");
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Auto-sync: whenever studentInfors change, check for pending link updates and apply them automatically.
  useEffect(() => {
    if (!studentInfors || studentInfors.length === 0) return;
    if (isSyncing) return; // avoid re-entrancy

    const pending = computePendingLinkUpdates(studentInfors);
    if (!pending || pending.length === 0) return;

    // Run async without blocking render
    (async () => {
      try {
        console.info(
          "Auto-sync: found",
          pending.length,
          "updates, applying..."
        );
        setIsSyncing(true);
        setSyncProgress({ done: 0, total: pending.length });
        let done = 0;
        const errors = [];
        for (const u of pending) {
          try {
            await updateStudentInfor(u.id, { examLink: u.link });
            setStudentInfors((prev) =>
              prev.map((p) => (p.id === u.id ? { ...p, examLink: u.link } : p))
            );
          } catch (err) {
            console.error("Auto-sync update error", err, u);
            errors.push({ id: u.id, error: err?.message || String(err) });
          } finally {
            done += 1;
            setSyncProgress({ done, total: pending.length });
          }
        }
        if (errors.length > 0) {
          setSyncErrors(errors);
          setError(`Đồng bộ tự động hoàn tất nhưng có ${errors.length} lỗi.`);
        } else {
          setSyncErrors([]);
          setError(null);
          console.info("Auto-sync complete");
        }
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [studentInfors]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // normalizeForSearch is imported from studentInforHelpers

  const filteredStudentInfors = React.useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q) return studentInfors;
    return studentInfors.filter((r) => {
      const id = normalizeForSearch(r.studentId || "");
      const name = normalizeForSearch(r.fullName || "");
      return id.includes(q) || name.includes(q);
    });
  }, [studentInfors, searchQuery]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    // normalize dob to YYYY-MM-DD if it's a timestamp or string
    const normalized = { ...item };
    if (item && item.dob && item.dob.toDate) {
      try {
        const d = item.dob.toDate();
        normalized.dob = d.toISOString().substring(0, 10);
      } catch (e) {}
    }
    setForm(normalized);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    try {
      await deleteStudentInfor(id);
      setStudentInfors((s) => s.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      setError("Xóa thất bại");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // basic validation
      if (!form.studentId || !form.fullName) {
        setError("Mã sv và Họ tên là bắt buộc");
        setIsSaving(false);
        return;
      }

      // Validate examLink if provided
      if (form.examLink && form.examLink.trim()) {
        if (!isValidUrl(form.examLink.trim())) {
          setError(
            "Link phòng không hợp lệ. Vui lòng nhập URL hợp lệ bắt đầu bằng http:// hoặc https://"
          );
          setIsSaving(false);
          return;
        }
      }

      if (editingItem) {
        await updateStudentInfor(editingItem.id, form);
        setStudentInfors((s) =>
          s.map((r) => (r.id === editingItem.id ? { ...r, ...form } : r))
        );
      } else {
        const created = await addStudentInfor(form);
        // addStudentInfor returns id+data
        setStudentInfors((s) => [created, ...s]);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Lưu thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const XLSX = await ensureXLSX();
      const rows = (filteredStudentInfors && filteredStudentInfors.length > 0) ? filteredStudentInfors : studentInfors;
      if (!rows || rows.length === 0) {
        alert('Không có dữ liệu để xuất');
        return;
      }

      // Build header and row data according to columns order
      const header = columns.map((c) => c.label);
      const data = rows.map((r) =>
        columns.map((c) => {
          const v = r[c.key];
          if (c.key === 'dob') {
            // prefer YYYY-MM-DD for dob export
            return parseDateToYMD(v) || '';
          }
          return v ?? '';
        })
      );

      const aoa = [header, ...data];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const now = new Date();
      const fn = `student_infor_export_${now.toISOString().slice(0,19).replace(/[:T]/g,'_')}.xlsx`;
      XLSX.writeFile(wb, fn);
    } catch (err) {
      console.error('Export error', err);
      setError('Xuất Excel thất bại: ' + (err?.message || String(err)));
    } finally {
      setExportLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // formatDate, isValidUrl and parseDateToYMD are imported from studentInforHelpers

  // XLSX and header mapping helpers are provided by studentInforHelpers

  // Handle file import: parse workbook, map rows, prompt, and import sequentially
  const handleFileImport = async (file) => {
    setImportLoading(true);
    setImportProgress({ done: 0, total: 0 });
    setImportErrors([]);
    try {
      const XLSX = await ensureXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      // Always read sheet số 1 (first sheet). sheetIndex is 0-based.
      const sheetIndex = 0;
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setError("File không chứa sheet nào");
        setImportLoading(false);
        return;
      }
      const firstSheet =
        workbook.SheetNames[sheetIndex] ?? workbook.SheetNames[0];
      console.info(
        "Import - using sheet:",
        firstSheet,
        " (sheetIndex:",
        sheetIndex,
        ")"
      );
      const worksheet = workbook.Sheets[firstSheet];
      // Convert to JSON using headers from sheet
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rows || rows.length === 0) {
        setError("Không tìm thấy dữ liệu trong file");
        return;
      }

      // Build header map from first row keys
      const rawHeaders = Object.keys(rows[0]);
      const headerMap = {};
      rawHeaders.forEach((h) => {
        const k = mapHeaderToKey(h);
        if (k) headerMap[k] = h; // map our key -> raw header name
      });
      // Save for diagnostics
      setLastRawHeaders(rawHeaders);
      setLastHeaderMap(headerMap);
      const ignored = rawHeaders.filter(
        (h) => !Object.values(headerMap).includes(h)
      );
      setLastIgnoredHeaders(ignored);
      console.info("Import - rawHeaders:", rawHeaders);
      console.info("Import - headerMap:", headerMap);
      if (ignored && ignored.length)
        console.info("Import - ignored headers (will not be used):", ignored);

      // Prepare objects
      let toImport = [];
      for (const r of rows) {
        // Skip empty rows: require at least studentId or fullName
        const vals = r;
        const studentId = headerMap.studentId
          ? String(vals[headerMap.studentId]).trim()
          : "";
        const lastName = headerMap.lastName
          ? String(vals[headerMap.lastName]).trim()
          : "";
        const firstName = headerMap.firstName
          ? String(vals[headerMap.firstName]).trim()
          : "";
        const fullName = headerMap.fullName
          ? String(vals[headerMap.fullName]).trim()
          : lastName || firstName
          ? lastName + (lastName && firstName ? " " : "") + firstName
          : "";

        if (!studentId && !fullName) continue; // skip row

        const item = {
          studentId: studentId || "",
          fullName: fullName || "",
          dob: headerMap.dob ? String(vals[headerMap.dob]).trim() : "",
          subject: headerMap.subject
            ? String(vals[headerMap.subject]).trim()
            : "",
          examSession: headerMap.examSession
            ? String(vals[headerMap.examSession]).trim()
            : "",
          examTime: headerMap.examTime
            ? String(vals[headerMap.examTime]).trim()
            : "",
          examRoom: headerMap.examRoom
            ? String(vals[headerMap.examRoom]).trim()
            : "",
          course: headerMap.course ? String(vals[headerMap.course]).trim() : "",
          majorCode: headerMap.majorCode
            ? String(vals[headerMap.majorCode]).trim()
            : "",
          examType: headerMap.examType
            ? String(vals[headerMap.examType]).trim()
            : "",
          examLink: headerMap.examLink
            ? String(vals[headerMap.examLink]).trim()
            : "",
        };
        toImport.push(item);
      }

      // Deduplicate against existing DB records: skip imports that already exist in `studentInfors`.
      const existingIds = new Set(
        (studentInfors || [])
          .map((s) =>
            String(s.studentId || "")
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      );
      const existingNameDob = new Set(
        (studentInfors || [])
          .map((s) => {
            const name = String(s.fullName || "")
              .trim()
              .toLowerCase();
            const dob = parseDateToYMD(s.dob || "");
            return name && dob ? `${name}||${dob}` : null;
          })
          .filter(Boolean)
      );

      const originalCount = toImport.length;
      const filtered = [];
      let skippedExisting = 0;
      for (const item of toImport) {
        const idKey = String(item.studentId || "")
          .trim()
          .toLowerCase();
        const nameDobKey = `${String(item.fullName || "")
          .trim()
          .toLowerCase()}||${parseDateToYMD(item.dob || "")}`;
        if (idKey) {
          if (existingIds.has(idKey)) {
            skippedExisting += 1;
            continue;
          }
        } else if (nameDobKey && existingNameDob.has(nameDobKey)) {
          skippedExisting += 1;
          continue;
        }
        filtered.push(item);
      }
      toImport = filtered;

      if (toImport.length === 0) {
        // If all rows from the file were skipped because they already exist in DB,
        // show a clearer message to the admin instead of the generic diagnostic.
        if (originalCount > 0 && skippedExisting === originalCount) {
          const dupMsg = `Dữ liệu import đã tồn tại trong hệ thống. Không có bản ghi mới để import (${skippedExisting}/${originalCount} bản ghi trùng).`;
          console.info("Import aborted - all rows already exist in DB", {
            originalCount,
            skippedExisting,
          });
          setError(dupMsg);
          return;
        }

        // Provide diagnostic info in error message and console for other cases
        const hr =
          rawHeaders && rawHeaders.length
            ? rawHeaders.join(", ")
            : "(<no headers detected>)";
        const mappedKeys = Object.keys(headerMap).length
          ? Object.entries(headerMap)
              .map(([k, v]) => `${k}<-"${v}"`)
              .join(", ")
          : "(no mapped headers)";
        const ignoredMsg =
          ignored && ignored.length
            ? ` Ignored headers: ${ignored.join(", ")}.`
            : "";
        const msg = `Không tìm thấy bản ghi hợp lệ để import. Headers đọc được: ${hr}. Mapping: ${mappedKeys}.${ignoredMsg} Kiểm tra header dòng 1 của file (ví dụ: Mã sinh viên, Họ, Tên, ...).`;
        console.warn(
          "Import aborted - no valid rows to import. Raw headers:",
          rawHeaders,
          "Header map:",
          headerMap,
          "ignored:",
          ignored
        );
        setError(msg);
        return;
      }

      // Confirm with user, showing how many will be imported and how many were skipped
      if (
        !window.confirm(
          `Tìm thấy ${originalCount} bản ghi trong file. Bỏ qua ${skippedExisting} bản ghi trùng đã có trên hệ thống. Bắt đầu import ${toImport.length} bản ghi?`
        )
      )
        return;

      setImportProgress({ done: 0, total: toImport.length });

      const errors = [];
      let done = 0;
      for (const row of toImport) {
        try {
          // Basic validation: studentId and fullName required
          if (!row.studentId || !row.fullName) {
            errors.push({ row, error: "Thiếu mã sinh viên hoặc họ tên" });
            done += 1;
            setImportProgress({ done, total: toImport.length });
            continue;
          }

          // Validate link if present
          if (
            row.examLink &&
            row.examLink.trim() &&
            !isValidUrl(row.examLink.trim())
          ) {
            errors.push({ row, error: "Link phòng không hợp lệ" });
            done += 1;
            setImportProgress({ done, total: toImport.length });
            continue;
          }

          // Insert into Firestore via service
          await addStudentInfor(row);
          done += 1;
          setImportProgress({ done, total: toImport.length });
        } catch (err) {
          console.error("Row import error", err, row);
          errors.push({ row, error: err?.message || String(err) });
          done += 1;
          setImportProgress({ done, total: toImport.length });
        }
      }

      setImportErrors(errors);
      if (errors.length > 0) {
        setError(
          `Import hoàn tất với ${errors.length} lỗi. Kiểm tra console để biết chi tiết.`
        );
      } else {
        setError(null);
        // success message briefly
        alert(`Import thành công ${toImport.length} bản ghi`);
      }
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <DocumentMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`${
            windowWidth < 770
              ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : "sticky top-0 h-screen z-10"
          }`}
        >
          <Sidebar
            sidebarData={categories}
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

        {/* Overlay for mobile */}
        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop Header */}
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}

          <main
            className={`p-4 md:p-6 pb-10 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold">
                Quản lý thông tin sinh viên dự thi
              </h2>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between items-start mb-6 gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="ml-2 flex items-center">
                    <input
                      type="search"
                      placeholder="Tìm theo Mã SV hoặc Họ và tên..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-2 border rounded-md w-64 text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="ml-2 text-sm text-gray-600"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Thêm mới
                  </button>
                  <button
                    onClick={() =>
                      document.getElementById("student-import-input")?.click()
                    }
                    className="ml-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                  >
                    Import Excel
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={exportLoading}
                    className={`ml-2 ${exportLoading ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'} text-white px-4 py-2 rounded-md`}
                    title="Xuất Excel các bản ghi đang hiển thị"
                  >
                    {exportLoading ? `Đang xuất...` : 'Export Excel'}
                  </button>
                  <input
                    id="student-import-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={async (e) => {
                      const f = e.target.files && e.target.files[0];
                      if (!f) return;
                      // handle file
                      try {
                        setImportErrors([]);
                        await handleFileImport(f);
                      } catch (err) {
                        console.error("Import error", err);
                        setError(
                          "Import thất bại: " + (err?.message || String(err))
                        );
                      } finally {
                        // clear input so same file can be selected again
                        e.target.value = null;
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              {/* error */}
              {error && (
                <div
                  className={`px-4 py-3 rounded-md border ${
                    isDarkMode
                      ? "bg-red-900/30 border-red-800 text-red-300"
                      : "bg-red-100 border-red-400 text-red-700"
                  } mb-4`}
                >
                  <span>{error}</span>
                </div>
              )}

              <StudentTable
                columns={columns}
                rows={filteredStudentInfors}
                loading={loading}
                isDarkMode={isDarkMode}
                openEditModal={openEditModal}
                handleDelete={handleDelete}
              />
            </div>
          </main>
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        isDarkMode={isDarkMode}
      />

      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        form={form}
        handleChange={handleChange}
        handleSave={handleSave}
        isSaving={isSaving}
        error={error}
      />
    </div>
  );
};

export default StudentInforManagement;
