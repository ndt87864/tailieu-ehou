import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useTheme } from "../../context/ThemeContext";
import { useUserRole } from "../../context/UserRoleContext";
import { auth } from "../../firebase/firebase";
import {
  getAllStudentInfor,
  subscribeStudentInfor,
  addStudentInfor,
  updateStudentInfor,
  deleteStudentInfor,
} from "../../firebase/studentInforService";
import Sidebar from "../../components/Sidebar";
import UserHeader from "../../components/UserHeader";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import ThemeColorPicker from "../../components/ThemeColorPicker";
import Modal from "../../components/Modal";

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
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importErrors, setImportErrors] = useState([]);
  const [lastRawHeaders, setLastRawHeaders] = useState(null);
  const [lastHeaderMap, setLastHeaderMap] = useState(null);
  const [lastIgnoredHeaders, setLastIgnoredHeaders] = useState(null);
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

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Normalize text for search (remove diacritics and lowercase)
  const normalizeForSearch = (s = "") => {
    try {
      return String(s)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    } catch (e) {
      return String(s).toLowerCase();
    }
  };

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

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Utility to format dob (supports Firestore Timestamp or ISO/date string)
  const formatDate = (value) => {
    if (!value) return "";
    try {
      // Firestore Timestamp
      if (value.toDate && typeof value.toDate === "function") {
        const d = value.toDate();
        return `${String(d.getDate()).padStart(2, "0")}/${String(
          d.getMonth() + 1
        ).padStart(2, "0")}/${d.getFullYear()}`;
      }

      // ISO string or YYYY-MM-DD
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, "0")}/${String(
          d.getMonth() + 1
        ).padStart(2, "0")}/${d.getFullYear()}`;
      }
    } catch (e) {
      // ignore and fallback to raw
    }
    return value;
  };

  // Basic URL validation
  const isValidUrl = (value) => {
    if (!value) return false;
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  };

  // Helper: ensure SheetJS (XLSX) is loaded (loads from CDN if needed)
  const ensureXLSX = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined")
        return reject(new Error("Browser environment required"));
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
      script.async = true;
      script.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error("XLSX failed to load"));
      };
      script.onerror = (e) => reject(new Error("Failed to load XLSX library"));
      document.head.appendChild(script);
    });
  };

  // Normalize header string: remove diacritics, spaces and lowercase
  const normalizeHeader = (s = "") => {
    try {
      return String(s)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\w]/g, "")
        .toLowerCase();
    } catch (e) {
      // fallback
      return String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }
  };

  // Map a raw header to our DB key
  const mapHeaderToKey = (h) => {
    const n = normalizeHeader(h);
    if (!n) return null;
    if (n === "stt") return null;
    // Student identifier: prefer common patterns (Mã SV, MSSV, SBD, Số báo danh)
    if (
      /(masv|mssv|msv|sbd|sobadanh|sobd|sobaodanh|sinhvien|mssinhvien)/.test(n)
    )
      return "studentId";
    // Full name combined
    if (n === "hoten" || n === "hovaten" || n === "hotenvaten")
      return "fullName";
    // Separate surname/given name
    if (n === "ho") return "lastName";
    if (n === "ten") return "firstName";
    if (n.includes("tenmon") || n.includes("mon") || n.includes("monhoc"))
      return "subject";
    if (n.includes("cathi") || (n.includes("ca") && n.includes("thi")))
      return "examSession";
    if (
      n.includes("thoigian") ||
      n.includes("thoigian") ||
      n.includes("thoi") ||
      n.includes("gian")
    )
      return "examTime";
    if (n.includes("phong")) return "examRoom";
    if (n.includes("khoa")) return "course";
    if (n.includes("manganh") || (n.includes("ma") && n.includes("nganh")))
      return "majorCode";
    if (n.includes("hinhthuc") || n.includes("hinh")) return "examType";
    if (n.includes("link")) return "examLink";
    if (
      n.includes("ngaysinh") ||
      n.includes("ngaysinh") ||
      n.includes("dob") ||
      n.includes("date")
    )
      return "dob";
    // No broad fallback on 'ma' to avoid mapping generic "Mã ..." (e.g., 'Mã đề') to studentId.
    return null;
  };

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
      const toImport = [];
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

      if (toImport.length === 0) {
        // Provide diagnostic info in error message and console
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

      // Confirm with user
      if (
        !window.confirm(
          `Tìm thấy ${toImport.length} bản ghi. Bắt đầu import vào cơ sở dữ liệu?`
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

              {/* Table area - styled like other admin pages */}
              <div
                className={`rounded-lg shadow-md overflow-hidden ${
                  isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
                }`}
              >
                <div
                  className={`px-6 py-4 ${
                    isDarkMode
                      ? "bg-gray-700/50 border-b border-gray-700"
                      : "bg-gray-50 border-b border-gray-200"
                  }`}
                >
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    Danh sách sinh viên
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Hiển thị {filteredStudentInfors.length} /{" "}
                    {studentInfors.length} bản ghi
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table
                    className={`min-w-full divide-y ${
                      isDarkMode ? "divide-gray-700" : "divide-gray-200"
                    }`}
                  >
                    <thead>
                      <tr
                        className={isDarkMode ? "bg-gray-700/30" : "bg-gray-50"}
                      >
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            scope="col"
                            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                              isDarkMode ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                        <th
                          scope="col"
                          className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isDarkMode ? "divide-gray-700" : "divide-gray-200"
                      }`}
                    >
                      {loading ? (
                        <tr>
                          <td
                            colSpan={columns.length + 1}
                            className={`px-6 py-6 text-center ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            Đang tải...
                          </td>
                        </tr>
                      ) : filteredStudentInfors.length === 0 ? (
                        <tr>
                          <td
                            colSpan={columns.length + 1}
                            className={`px-6 py-10 text-center ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            <div className="mx-auto">Không có dữ liệu</div>
                          </td>
                        </tr>
                      ) : (
                        filteredStudentInfors.map((row) => (
                          <tr
                            key={row.id}
                            className={
                              isDarkMode
                                ? "hover:bg-gray-700/30"
                                : "hover:bg-gray-50"
                            }
                          >
                            {columns.map((col) => (
                              <td
                                key={col.key}
                                className="px-6 py-4 whitespace-nowrap text-sm"
                              >
                                {col.key === "dob" ? (
                                  formatDate(row[col.key])
                                ) : col.key === "examLink" ? (
                                  row[col.key] ? (
                                    <a
                                      href={row[col.key]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:underline"
                                      title={row[col.key]}
                                    >
                                      {row[col.key].length > 60
                                        ? row[col.key].slice(0, 60) + "..."
                                        : row[col.key]}
                                    </a>
                                  ) : (
                                    ""
                                  )
                                ) : (
                                  row[col.key] ?? ""
                                )}
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => openEditModal(row)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                                  isDarkMode
                                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ml-2 ${
                                  isDarkMode
                                    ? "bg-red-700 hover:bg-red-600 text-white"
                                    : "bg-red-600 hover:bg-red-700 text-white"
                                }`}
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Modal (popup) */}
      <React.Suspense fallback={null}>
        {isModalOpen && (
          // Lazy-render modal children only when open
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingItem ? "Sửa thông tin" : "Thêm sinh viên"}
          >
            {error && <div className="alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-row">
                  <label>Mã sv</label>
                  <input
                    value={form.studentId}
                    onChange={(e) => handleChange("studentId", e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>Họ và tên</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => handleChange("dob", e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>Tên môn học</label>
                  <input
                    value={form.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Ca thi</label>
                  <input
                    value={form.examSession}
                    onChange={(e) =>
                      handleChange("examSession", e.target.value)
                    }
                  />
                </div>
                <div className="form-row">
                  <label>Thời gian</label>
                  <input
                    value={form.examTime}
                    onChange={(e) => handleChange("examTime", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Phòng thi</label>
                  <input
                    value={form.examRoom}
                    onChange={(e) => handleChange("examRoom", e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>Khóa</label>
                  <input
                    value={form.course}
                    onChange={(e) => handleChange("course", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Mã ngành</label>
                  <input
                    value={form.majorCode}
                    onChange={(e) => handleChange("majorCode", e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>Hình thức thi</label>
                  <input
                    value={form.examType}
                    onChange={(e) => handleChange("examType", e.target.value)}
                  />
                </div>

                <div className="form-row md:col-span-2">
                  <label>Link phòng</label>
                  <input
                    value={form.examLink}
                    onChange={(e) => handleChange("examLink", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="mt-4 text-right">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary ml-2"
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </React.Suspense>
    </div>
  );
};

export default StudentInforManagement;
