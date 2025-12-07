import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useTheme } from "../../../context/ThemeContext";
import { useUserRole } from "../../../context/UserRoleContext";
import { useAppSettings } from "../../../context/AppSettingsContext";
import { auth } from "../../../firebase/firebase";
import {
  getAllStudentInfor,
  subscribeStudentInfor,
  addStudentInfor,
  updateStudentInfor,
  deleteStudentInfor,
  bulkDeleteStudentInfor,
} from "../../../firebase/studentInforService";
import Sidebar from "../../../components/Sidebar";
import UserHeader from "../../../components/UserHeader";
import { DocumentMobileHeader } from "../../../components/MobileHeader";
import ThemeColorPicker from "../../../components/ThemeColorPicker";
import StudentFormModal from "./StudentFormModal";
import Modal from "../../../components/Modal";
import LoadingSpinner from "../../../components/content/LoadingSpinner";
import StudentTable from "./StudentTable";
import StudentMobileCard from "./StudentMobileCard";
import {
  ensureXLSX,
  mapHeaderToKey,
  normalizeForSearch,
  formatDate,
  isValidUrl,
  parseDateToYMD,
  parseExcelDateToYMD,
  parseCSV,
  computePendingLinkUpdates,
} from "./studentInforHelpers";

const columns = [
  { key: "fullName", label: "Họ và tên" },
  { key: "username", label: "Tài khoản" },
  { key: "examDate", label: "Ngày thi" },
  { key: "subject", label: "Tên môn học" },
  { key: "examSession", label: "Ca thi" },
  { key: "examTime", label: "Thời gian" },
  { key: "examRoom", label: "Phòng thi" },
  { key: "course", label: "Khóa" },
  { key: "majorCode", label: "Mã ngành" },
  { key: "examLink", label: "Link phòng" },
];

const emptyForm = {
  studentId: "",
  fullName: "",
  username: "",
  dob: "",
  examDate: "",
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
  const { studentPageEnabled, setStudentPageEnabled } = useAppSettings();
  const [isTogglingStudentPage, setIsTogglingStudentPage] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importErrors, setImportErrors] = useState([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportInfo, setPendingImportInfo] = useState(null);
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
    "examDate",
    "username",
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

  // Map numeric/short examSession values to canonical examTime strings
  const mapExamSessionToTime = (sess) => {
    if (sess === undefined || sess === null) return null;
    const s = String(sess).trim().toLowerCase();
    // look for a digit 1-6 anywhere in the string
    const m = s.match(/[1-6]/);
    if (!m) return null;
    const k = m[0];
    const map = {
      1: "7h30 - 8h30",
      2: "8h45 - 9h45",
      3: "10h - 11h",
      4: "13h - 14h30",
      5: "15h15 - 16h15",
      6: "16h30 - 17h30",
    };
    return map[k] || null;
  };

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

  // Execute the actual import after user confirms
  const executeImport = async (toImport) => {
    if (!toImport || toImport.length === 0) return;
    setShowImportConfirm(false);
    setImportLoading(true);
    setImportProgress({ done: 0, total: toImport.length });
    const errors = [];
    let done = 0;
    try {
      const concurrency = Math.min(5, toImport.length);
      let idx = 0;
      const workers = new Array(concurrency).fill(null).map(() =>
        (async () => {
          while (true) {
            const current = idx;
            idx += 1;
            if (current >= toImport.length) break;
            const row = toImport[current];
            try {
              if (!row.studentId || !row.fullName) {
                errors.push({ row, error: "Thiếu mã sinh viên hoặc họ tên" });
                done += 1;
                setImportProgress({ done, total: toImport.length });
                continue;
              }

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
        })()
      );

      await Promise.all(workers);
      setImportErrors(errors);
      if (errors.length > 0) {
        setError(
          `Import hoàn tất với ${errors.length} lỗi. Kiểm tra console để biết chi tiết.`
        );
      } else {
        setError(null);
        alert(`Import thành công ${toImport.length} bản ghi`);
      }
    } finally {
      setImportLoading(false);
      setPendingImportInfo(null);
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
    const q = normalizeForSearch((searchQuery || "").trim());
    if (!q) return studentInfors;
    return studentInfors.filter((r) => {
      const id = normalizeForSearch(r.studentId || "");
      const name = normalizeForSearch(r.fullName || "");
      const subject = normalizeForSearch(r.subject || "");
      const usernameNorm = normalizeForSearch(r.username || "");
      // allow searching by studentId, fullName, subject name or username (tài khoản)
      return (
        id.includes(q) ||
        name.includes(q) ||
        subject.includes(q) ||
        usernameNorm.includes(q)
      );
    });
  }, [studentInfors, searchQuery]);

  // Pagination state (show limited records like other management pages)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10); // rows per page

  // reset to first page when filter result changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStudentInfors]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredStudentInfors?.length || 0) / limit)
  );
  // clamp currentPage if totalPages decreased
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  const startIndex = (currentPage - 1) * limit;
  const pagedStudentInfors = (filteredStudentInfors || []).slice(
    startIndex,
    startIndex + limit
  );
  const showingFrom = filteredStudentInfors.length === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(filteredStudentInfors.length, startIndex + limit);

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
    // normalize examDate to YYYY-MM-DD if it's a Timestamp
    if (item && item.examDate && item.examDate.toDate) {
      try {
        const ed = item.examDate.toDate();
        normalized.examDate = ed.toISOString().substring(0, 10);
      } catch (e) {}
    }
    setForm(normalized);
    setIsModalOpen(true);
  };

  // Modal state for single delete
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!deleteId) return;
    try {
      await deleteStudentInfor(deleteId);
      setStudentInfors((s) => s.filter((r) => r.id !== deleteId));
      setDeleteResult({ success: true, message: "Xóa thành công." });
    } catch (e) {
      console.error(e);
      setDeleteResult({ success: false, message: "Xóa thất bại." });
    } finally {
      setDeleteId(null);
    }
  };

  // Modal state for bulk delete
  const [bulkDeleteIds, setBulkDeleteIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({
    done: 0,
    total: 0,
  });

  // Mobile selection state
  const [mobileSelectedIds, setMobileSelectedIds] = useState(new Set());

  const toggleMobileSelect = (id) => {
    setMobileSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMobileBulkDelete = () => {
    if (mobileSelectedIds.size === 0) return;
    handleBulkDelete(Array.from(mobileSelectedIds));
    setMobileSelectedIds(new Set());
  };

  const handleBulkDelete = (ids) => {
    if (!ids || ids.length === 0) return;
    setBulkDeleteIds(ids);
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    setShowBulkDeleteModal(false);
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;

    // Delete in chunks of 10 until all ids processed
    setBulkDeleting(true);
    setBulkDeleteProgress({ done: 0, total: bulkDeleteIds.length });
    const idsToProcess = Array.from(bulkDeleteIds);
    const errors = [];

    try {
      while (idsToProcess.length > 0) {
        const chunk = idsToProcess.splice(0, 10);
        try {
          // bulkDeleteStudentInfor deletes up to 10 ids and returns number deleted
          const deleted = await bulkDeleteStudentInfor(chunk);
          // remove deleted ids from local state
          setStudentInfors((prev) => prev.filter((r) => !chunk.includes(r.id)));
          setBulkDeleteProgress((p) => ({
            done: p.done + deleted,
            total: p.total,
          }));
        } catch (e) {
          console.error("Bulk delete chunk error", e, chunk);
          // record per-id errors
          for (const id of chunk)
            errors.push({ id, error: e?.message || String(e) });
        }
      }

      if (errors.length > 0) {
        setBulkDeleteResult({
          success: false,
          message: `Xóa hoàn tất nhưng có ${errors.length} lỗi.`,
        });
      } else {
        setBulkDeleteResult({
          success: true,
          message: `Xóa thành công ${
            bulkDeleteProgress.total || bulkDeleteIds.length
          } bản ghi.`,
        });
      }
    } finally {
      setBulkDeleting(false);
      setBulkDeleteIds([]);
      setBulkDeleteProgress((p) => ({ ...p, done: p.total }));
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
      const rows =
        filteredStudentInfors && filteredStudentInfors.length > 0
          ? filteredStudentInfors
          : studentInfors;
      if (!rows || rows.length === 0) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      // Build header and row data according to columns order
      const header = columns.map((c) => c.label);
      const data = rows.map((r) =>
        columns.map((c) => {
          const v = r[c.key];
          if (c.key === "dob") {
            // prefer YYYY-MM-DD for dob export
            return parseDateToYMD(v) || "";
          }
          if (c.key === "examDate") {
            // prefer YYYY-MM-DD for examDate export
            return parseDateToYMD(v) || "";
          }
          return v ?? "";
        })
      );

      const aoa = [header, ...data];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const now = new Date();
      const fn = `student_infor_export_${now
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "_")}.xlsx`;
      XLSX.writeFile(wb, fn);
    } catch (err) {
      console.error("Export error", err);
      setError("Xuất Excel thất bại: " + (err?.message || String(err)));
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
      // Support CSV files directly (avoid loading XLSX for CSV)
      let rows = null;
      // default date1904 flag (CSV won't set this)
      let date1904 = false;
      const name = (file.name || "").toLowerCase();
      const isCSV = name.endsWith(".csv") || file.type === "text/csv";

      if (isCSV) {
        const text = await file.text();
        rows = parseCSV(text);
        if (!rows || rows.length === 0) {
          setError("Không tìm thấy dữ liệu trong file");
          return;
        }
      } else {
        const XLSX = await ensureXLSX();
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: true,
        });
        // detect if workbook uses Excel 1904 date system
        const date1904 = Boolean(
          workbook &&
            workbook.Workbook &&
            workbook.Workbook.WBProps &&
            workbook.Workbook.WBProps.date1904
        );
        // Only process the first sheet of the workbook (SheetNames[0]).
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setError("File không chứa sheet nào");
          setImportLoading(false);
          return;
        }
        // If workbook has a single sheet, just use it.
        let worksheet;
        if (workbook.SheetNames.length === 1) {
          const only = workbook.SheetNames[0];
          worksheet = workbook.Sheets[only];
        } else {
          // Multiple sheets: prefer exact " DATA"; otherwise accept trimmed/case-insensitive 'data' (e.g. 'Data', 'DATA').
          const prefer = " DATA";
          let chosen = workbook.SheetNames.find((s) => s === prefer);
          if (!chosen) {
            chosen = workbook.SheetNames.find(
              (s) => typeof s === "string" && s.trim().toLowerCase() === "data"
            );
          }

          if (!chosen) {
            const available = workbook.SheetNames.join(", ");
            const msg = `File phải chứa sheet có tên "${prefer}" (hoặc 'Data'). Sheet hiện có: ${available}`;
            console.warn("Import aborted - required sheet missing", {
              availableSheets: workbook.SheetNames,
            });
            setError(msg);
            setImportLoading(false);
            return;
          }

          worksheet = workbook.Sheets[chosen];
        }
        // Convert to JSON using headers from sheet
        // include cellDates handling above; we'll pass date1904 flag when parsing
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rows || rows.length === 0) {
          setError("Không tìm thấy dữ liệu trong file");
          return;
        }
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
      const allRows = [];
      for (const r of rows) {
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

        const item = {
          studentId: studentId || "",
          fullName: fullName || "",
          username: headerMap.username
            ? String(vals[headerMap.username]).trim()
            : "",
          dob: headerMap.dob
            ? parseExcelDateToYMD(vals[headerMap.dob], { date1904 })
            : "",
          // examDate may be present in some excel files (Ngày thi)
          examDate: headerMap.examDate
            ? parseExcelDateToYMD(vals[headerMap.examDate], { date1904 })
            : "",
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

        // If examTime is missing but examSession is provided and maps to a known
        // time slot (1-6), fill examTime automatically.
        try {
          if (
            (!item.examTime || String(item.examTime).trim() === "") &&
            item.examSession
          ) {
            const mapped = mapExamSessionToTime(item.examSession);
            if (mapped) item.examTime = mapped;
          }
        } catch (e) {
          // silent fallback: do not block import on mapping errors
        }

        // Keep all rows for further processing. We will separate identity-rows
        // (rows that can be imported as student records) from link-only rows
        // (rows that only contain exam metadata + examLink and should be used
        // to update existing DB records' examLink).
        allRows.push(item);
      }

      // Split rows into import candidates (have student identity) and
      // link candidates (have examLink + at least one exam-metadata field).
      let toImport = allRows.filter((it) => it.studentId || it.fullName);
      const linkCandidates = allRows.filter((it) => {
        const hasLink = it.examLink && it.examLink.trim();
        const hasExamMeta =
          (it.examDate && it.examDate.trim()) ||
          (it.subject && it.subject.trim()) ||
          (it.examSession && it.examSession.trim()) ||
          (it.examTime && it.examTime.trim()) ||
          (it.examRoom && it.examRoom.trim());
        return hasLink && hasExamMeta;
      });

      // If the Excel contains an exam link and rows that match existing records by
      // exam fields (examDate, subject, examSession, examTime, examRoom), then
      // overwrite the existing records' examLink with the one from Excel.
      // This happens regardless of student identity — the admin requested that
      // link nhóm (group link) be applied to matching exam records in the DB.
      try {
        const linkUpdates = [];
        const normalize = (v) =>
          v == null ? "" : String(v).trim().toLowerCase();
        for (const item of linkCandidates) {
          if (!item.examLink) continue;
          // build match predicate values
          const ed =
            item.examDate && item.examDate !== "" ? item.examDate : null;
          const subj = normalize(item.subject);
          const sess = normalize(item.examSession);
          const etime = normalize(item.examTime);
          const room = normalize(item.examRoom);
          if (!subj && !sess && !etime && !room && !ed) continue;

          // find matching records in current studentInfors
          const matches = (studentInfors || []).filter((s) => {
            const sEd = parseDateToYMD(s.examDate || "") || null;
            // if imported row specifies examDate, require DB to have same examDate
            if (ed) {
              if (!sEd || ed !== sEd) return false;
            }
            if (subj && normalize(s.subject) !== subj) return false;
            if (sess && normalize(s.examSession) !== sess) return false;
            if (etime && normalize(s.examTime) !== etime) return false;
            if (room && normalize(s.examRoom) !== room) return false;
            return true;
          });

          for (const m of matches) {
            // if existing link is different, schedule update
            if ((m.examLink || "").trim() !== (item.examLink || "").trim()) {
              linkUpdates.push({ id: m.id, link: item.examLink });
            }
          }
        }

        if (linkUpdates.length > 0) {
          console.info(
            `Applying ${linkUpdates.length} link updates from Excel`
          );
          for (const u of linkUpdates) {
            try {
              await updateStudentInfor(u.id, { examLink: u.link });
              // update local state
              setStudentInfors((prev) =>
                prev.map((p) =>
                  p.id === u.id ? { ...p, examLink: u.link } : p
                )
              );
            } catch (e) {
              console.error("Failed to update examLink for", u.id, e);
            }
          }
        }

        // If we applied link updates and there are no identity rows to import,
        // surface a success message and stop the import flow gracefully.
        if (linkUpdates.length > 0 && (!toImport || toImport.length === 0)) {
          const msg = `Áp dụng ${linkUpdates.length} cập nhật link phòng từ file Excel thành công.`;
          console.info(msg);
          setError(null);
          alert(msg);
          return;
        }
      } catch (e) {
        console.error("Error while applying link updates from Excel", e);
      }
      // Deduplicate against existing DB records: skip imports that already exist in `studentInfors`.
      // New rule: treat a row as duplicate only if there exists an existing record with the same
      // studentId OR same (fullName + dob) AND all exam fields also match:
      // subject, examSession, examTime, examRoom, course, majorCode, examType.
      const makeComposite = (obj) => {
        const fields = [
          // include examDate in composite so duplicates consider the exam date
          obj.examDate,
          obj.subject,
          obj.examSession,
          obj.examTime,
          obj.examRoom,
          obj.course,
          obj.majorCode,
          obj.examType,
        ];
        return fields
          .map((v) => (v == null ? "" : String(v).trim().toLowerCase()))
          .join("||");
      };

      const existingById = new Map();
      const existingByNameDob = new Map();
      (studentInfors || []).forEach((s) => {
        const idKey = String(s.studentId || "")
          .trim()
          .toLowerCase();
        const name = String(s.fullName || "")
          .trim()
          .toLowerCase();
        const dob = parseDateToYMD(s.dob || "");
        const sExamDate = parseDateToYMD(s.examDate || "");
        const nameDobKey = name && dob ? `${name}||${dob}` : null;
        // build composite using normalized examDate
        const comp = makeComposite({ ...s, examDate: sExamDate });
        if (idKey) {
          const set = existingById.get(idKey) || new Set();
          set.add(comp);
          existingById.set(idKey, set);
        }
        if (nameDobKey) {
          const set2 = existingByNameDob.get(nameDobKey) || new Set();
          set2.add(comp);
          existingByNameDob.set(nameDobKey, set2);
        }
      });

      // --- PATCH: Nếu các trường khác trùng mà trường examDate rỗng thì ghi trường dob vào examDate ---
      // Nếu import row có examDate rỗng, nhưng dob có giá trị, và DB record trùng các trường khác mà examDate rỗng, thì update examDate = dob
      const dateUpdates = [];
      const handledImportIndexes = new Set();
      const normalizeId = (s) =>
        s == null
          ? ""
          : String(s)
              .replace(/[^a-z0-9]/gi, "")
              .trim()
              .toLowerCase();
      const normalizeName = (s) => normalizeForSearch(String(s || "").trim());

      for (let i = 0; i < toImport.length; i++) {
        const item = toImport[i];
        const importedExamDate = parseDateToYMD(item.examDate || "");
        const importedDob = parseDateToYMD(item.dob || "");

        // Nếu examDate rỗng, dob có giá trị
        if (!importedExamDate && importedDob) {
          // attempt matching by studentId (normalized)
          const importedIdNorm = normalizeId(item.studentId || "");
          if (importedIdNorm) {
            const matches = (studentInfors || []).filter((s) => {
              const sIdNorm = normalizeId(s.studentId || "");
              return (
                sIdNorm &&
                sIdNorm === importedIdNorm &&
                !parseDateToYMD(s.examDate || "") &&
                parseDateToYMD(s.dob || "") === importedDob &&
                String(s.subject || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.subject || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examSession || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examSession || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examTime || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examTime || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examRoom || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examRoom || "")
                    .trim()
                    .toLowerCase() &&
                String(s.course || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.course || "")
                    .trim()
                    .toLowerCase() &&
                String(s.majorCode || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.majorCode || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examType || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examType || "")
                    .trim()
                    .toLowerCase()
              );
            });
            for (const m of matches) {
              // chỉ update examDate, không update dob
              dateUpdates.push({ id: m.id, examDate: importedDob });
              handledImportIndexes.add(i);
            }
            if (handledImportIndexes.has(i)) continue;
          }

          // try username match if provided
          const importedUsername = String(item.username || "")
            .trim()
            .toLowerCase();
          if (importedUsername) {
            const matches = (studentInfors || []).filter((s) => {
              return (
                String(s.username || "")
                  .trim()
                  .toLowerCase() === importedUsername &&
                !parseDateToYMD(s.examDate || "") &&
                parseDateToYMD(s.dob || "") === importedDob &&
                String(s.subject || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.subject || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examSession || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examSession || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examTime || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examTime || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examRoom || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examRoom || "")
                    .trim()
                    .toLowerCase() &&
                String(s.course || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.course || "")
                    .trim()
                    .toLowerCase() &&
                String(s.majorCode || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.majorCode || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examType || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examType || "")
                    .trim()
                    .toLowerCase()
              );
            });
            for (const m of matches) {
              // chỉ update examDate, không update dob
              dateUpdates.push({ id: m.id, examDate: importedDob });
              handledImportIndexes.add(i);
            }
            if (handledImportIndexes.has(i)) continue;
          }

          // fallback: fullName + dob
          const importedNameNorm = normalizeName(item.fullName || "");
          if (importedNameNorm && importedDob) {
            const matches = (studentInfors || []).filter((s) => {
              const sNameNorm = normalizeName(s.fullName || "");
              const sDob = parseDateToYMD(s.dob || "");
              return (
                sNameNorm === importedNameNorm &&
                sDob &&
                sDob === importedDob &&
                !parseDateToYMD(s.examDate || "") &&
                String(s.subject || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.subject || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examSession || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examSession || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examTime || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examTime || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examRoom || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examRoom || "")
                    .trim()
                    .toLowerCase() &&
                String(s.course || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.course || "")
                    .trim()
                    .toLowerCase() &&
                String(s.majorCode || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.majorCode || "")
                    .trim()
                    .toLowerCase() &&
                String(s.examType || "")
                  .trim()
                  .toLowerCase() ===
                  String(item.examType || "")
                    .trim()
                    .toLowerCase()
              );
            });
            for (const m of matches) {
              // chỉ update examDate, không update dob
              dateUpdates.push({ id: m.id, examDate: importedDob });
              handledImportIndexes.add(i);
            }
          }
          continue; // đã xử lý trường hợp này
        }

        // --- END PATCH ---

        // Trường hợp cũ: nếu import row có examDate, update vào DB nếu DB record examDate rỗng
        if (!importedExamDate) continue; // nothing to apply

        // attempt matching by studentId (normalized)
        const importedIdNorm = normalizeId(item.studentId || "");
        if (importedIdNorm) {
          const matches = (studentInfors || []).filter((s) => {
            const sIdNorm = normalizeId(s.studentId || "");
            return sIdNorm && sIdNorm === importedIdNorm;
          });
          for (const m of matches) {
            const mExam = parseDateToYMD(m.examDate || "");
            if (!mExam) {
              dateUpdates.push({ id: m.id, examDate: importedExamDate });
              handledImportIndexes.add(i);
            }
          }
          if (handledImportIndexes.has(i)) continue;
        }

        // try username match if provided
        const importedUsername = String(item.username || "")
          .trim()
          .toLowerCase();
        if (importedUsername) {
          const matches = (studentInfors || []).filter((s) => {
            return (
              String(s.username || "")
                .trim()
                .toLowerCase() === importedUsername
            );
          });
          for (const m of matches) {
            const mExam = parseDateToYMD(m.examDate || "");
            if (!mExam) {
              dateUpdates.push({ id: m.id, examDate: importedExamDate });
              handledImportIndexes.add(i);
            }
          }
          if (handledImportIndexes.has(i)) continue;
        }

        // fallback: fullName + dob
        const importedNameNorm = normalizeName(item.fullName || "");
        if (importedNameNorm && importedDob) {
          const matches = (studentInfors || []).filter((s) => {
            const sNameNorm = normalizeName(s.fullName || "");
            const sDob = parseDateToYMD(s.dob || "");
            return (
              sNameNorm === importedNameNorm && sDob && sDob === importedDob
            );
          });
          for (const m of matches) {
            const mExam = parseDateToYMD(m.examDate || "");
            if (!mExam) {
              dateUpdates.push({ id: m.id, examDate: importedExamDate });
              handledImportIndexes.add(i);
            }
          }
        }
      }

      if (dateUpdates.length > 0) {
        console.info(
          `Applying ${dateUpdates.length} examDate updates from Excel to existing records`,
          { dateUpdates }
        );

        // Show progress in the import modal while applying date updates
        setImportProgress({ done: 0, total: dateUpdates.length });

        const errors = [];
        let done = 0;

        // process updates with limited concurrency to avoid blocking UI
        const concurrency = Math.min(8, dateUpdates.length);
        let idxWorker = 0;
        const workers = new Array(concurrency).fill(null).map(() =>
          (async () => {
            while (true) {
              const current = idxWorker;
              idxWorker += 1;
              if (current >= dateUpdates.length) break;
              const u = dateUpdates[current];
              try {
                await updateStudentInfor(u.id, { examDate: u.examDate });
                setStudentInfors((prev) =>
                  prev.map((p) =>
                    p.id === u.id ? { ...p, examDate: u.examDate } : p
                  )
                );
              } catch (e) {
                console.error("Failed to apply examDate update", u, e);
                errors.push({ id: u.id, error: e?.message || String(e) });
              } finally {
                done += 1;
                // update import progress so UI reflects work being done
                setImportProgress({ done, total: dateUpdates.length });
              }
            }
          })()
        );

        await Promise.all(workers);

        if (errors.length > 0) {
          console.warn(
            `Completed examDate updates with ${errors.length} errors`
          );
          // attach to importErrors for admin to inspect
          setImportErrors((prev) => [...(prev || []), ...errors]);
          setError(
            `Áp dụng ngày thi hoàn tất nhưng có ${errors.length} lỗi (xem console).`
          );
        } else {
          setError(null);
        }

        // remove handled imports so they won't be re-created
        toImport = toImport.filter((_, idx) => !handledImportIndexes.has(idx));
      }

      const originalCount = toImport.length;
      const filtered = [];
      let skippedExisting = 0;
      for (const item of toImport) {
        const idKey = String(item.studentId || "")
          .trim()
          .toLowerCase();
        const name = String(item.fullName || "")
          .trim()
          .toLowerCase();
        const dob = parseDateToYMD(item.dob || "");
        const itemExamDate = parseDateToYMD(item.examDate || "");
        const nameDobKey = name && dob ? `${name}||${dob}` : null;
        const comp = makeComposite({ ...item, examDate: itemExamDate });

        let isDuplicate = false;
        const normalize = (v) =>
          v == null ? "" : String(v).trim().toLowerCase();

        // Helper to compare exam-related fields between an existing record and the imported item
        const fieldsEqual = (existing, imported) => {
          const eExamDate = parseDateToYMD(existing.examDate || "") || "";
          const iExamDate = parseDateToYMD(imported.examDate || "") || "";
          if (eExamDate !== iExamDate) return false;
          if (normalize(existing.subject) !== normalize(imported.subject))
            return false;
          if (
            normalize(existing.examSession) !== normalize(imported.examSession)
          )
            return false;
          if (normalize(existing.examTime) !== normalize(imported.examTime))
            return false;
          if (normalize(existing.examRoom) !== normalize(imported.examRoom))
            return false;
          if (normalize(existing.course) !== normalize(imported.course))
            return false;
          if (normalize(existing.majorCode) !== normalize(imported.majorCode))
            return false;
          if (normalize(existing.examType) !== normalize(imported.examType))
            return false;
          return true;
        };

        // Check duplicates by studentId: only if there's an existing record with same id
        // and all exam-related fields match exactly (including examDate). If DB examDate
        // is empty but imported has a value, fieldsEqual will return false so it's NOT a duplicate.
        if (idKey) {
          const matches = (studentInfors || []).filter(
            (s) =>
              String(s.studentId || "")
                .trim()
                .toLowerCase() === idKey
          );
          for (const m of matches) {
            if (fieldsEqual(m, { ...item, examDate: itemExamDate })) {
              isDuplicate = true;
              break;
            }
          }
        }

        // If not duplicate by id, check by fullName+dob
        if (!isDuplicate && nameDobKey) {
          const matches = (studentInfors || []).filter((s) => {
            const sName = String(s.fullName || "")
              .trim()
              .toLowerCase();
            const sDob = parseDateToYMD(s.dob || "");
            return sName === name && sDob === dob;
          });
          for (const m of matches) {
            if (fieldsEqual(m, { ...item, examDate: itemExamDate })) {
              isDuplicate = true;
              break;
            }
          }
        }

        if (isDuplicate) {
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

        // Instead of failing because many headers are ignored, only check for
        // presence of REQUIRED headers that we need to build an importable record.
        // Minimal required headers for importing student records: studentId OR fullName
        // For link-only imports we accept exam metadata + examLink (handled earlier).
        const requiredPresent = Boolean(
          headerMap.studentId || headerMap.fullName || headerMap.dob
        );

        if (!requiredPresent) {
          // Tell admin which required headers are missing (concise)
          const needed = [
            { key: "studentId", label: "Mã sinh viên" },
            { key: "fullName", label: "Họ và tên (hoặc Họ + Tên)" },
            { key: "dob", label: "Ngày sinh (nếu dùng Họ+Ngày sinh để khớp)" },
          ];
          const found = needed
            .filter((n) => headerMap[n.key])
            .map((n) => n.label);
          const missing = needed
            .filter((n) => !headerMap[n.key])
            .map((n) => n.label);

          const shortMsg = `Không tìm thấy trường cần thiết để import bản ghi. Tìm thấy: ${
            found.length ? found.join(", ") : "(không có)"
          }; Thiếu: ${missing.join(
            ", "
          )}. Vui lòng kiểm tra header dòng 1 (ví dụ: Mã sinh viên, Họ, Tên, Ngày sinh).`;
          console.warn("Import aborted - missing required headers", {
            rawHeaders,
            headerMap,
            ignored,
          });
          setError(shortMsg);
          return;
        }

        // If required headers are present but no rows passed deduplication/validation,
        // provide a simpler diagnostic focused on mapped headers instead of listing all ignored headers.
        const mappedKeys = Object.keys(headerMap).length
          ? Object.entries(headerMap)
              .map(([k, v]) => `${k}<-"${v}"`)
              .join(", ")
          : "(no mapped headers)";

        const msg = `Không tìm thấy bản ghi hợp lệ để import. Các trường được mapping: ${mappedKeys}. Có thể do tất cả bản ghi trong file đã tồn tại hoặc thiếu thông tin nhận dạng. Kiểm tra header dòng 1 (ví dụ: Mã sinh viên, Họ, Tên, ...).`;
        console.warn("Import aborted - no valid rows to import", {
          originalCount,
          skippedExisting,
          headerMap,
          rawHeaders,
        });
        setError(msg);
        return;
      }

      // Instead of browser confirm, show an in-app confirmation modal.
      setPendingImportInfo({ toImport, originalCount, skippedExisting });
      // stop importLoading while waiting for confirmation
      setImportLoading(false);
      setShowImportConfirm(true);
    } finally {
      setImportLoading(false);
    }
  };

  const importPercent = (() => {
    const { done, total } = importProgress || { done: 0, total: 0 };
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((done / total) * 100));
  })();

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
              <div className={`flex ${windowWidth < 770 ? "flex-col gap-3" : "items-center justify-between"} mb-4`}>
                <h2 className={`text-xl md:text-2xl font-bold ${windowWidth < 770 ? "text-center" : ""}`}>
                  Quản lý thông tin sinh viên dự thi
                </h2>
                
                {/* Toggle switch for StudentPage visibility */}
                <div className={`flex items-center gap-3 ${windowWidth < 770 ? "justify-center" : ""}`}>
                  <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Hiển thị trang sinh viên:
                  </span>
                  <button
                    onClick={async () => {
                      setIsTogglingStudentPage(true);
                      try {
                        await setStudentPageEnabled(!studentPageEnabled);
                      } catch (err) {
                        console.error("Failed to toggle studentPage:", err);
                        setError("Lỗi khi thay đổi cài đặt");
                      } finally {
                        setIsTogglingStudentPage(false);
                      }
                    }}
                    disabled={isTogglingStudentPage}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      studentPageEnabled
                        ? "bg-green-600 focus:ring-green-500"
                        : isDarkMode
                        ? "bg-gray-600 focus:ring-gray-500"
                        : "bg-gray-300 focus:ring-gray-400"
                    } ${isTogglingStudentPage ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-pressed={studentPageEnabled}
                    title={studentPageEnabled ? "Đang bật - Nhấn để tắt" : "Đang tắt - Nhấn để bật"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        studentPageEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    studentPageEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {studentPageEnabled ? "Bật" : "Tắt"}
                  </span>
                </div>
              </div>
              
              {/* Search and Actions */}
              <div className="space-y-3 mb-6">
                {/* Search Row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="search"
                      placeholder={windowWidth < 770 ? "Tìm kiếm..." : "Tìm theo Mã SV, Họ và tên, Tài khoản hoặc Tên môn học..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className={`flex ${windowWidth < 770 ? "flex-wrap gap-2" : "gap-2"}`}>
                  <button
                    onClick={openAddModal}
                    className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${
                      windowWidth < 770 ? "flex-1 px-3 py-2 text-sm" : "px-4 py-2"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{windowWidth < 770 ? "Thêm" : "Thêm mới"}</span>
                  </button>
                  <button
                    onClick={() => document.getElementById("student-import-input")?.click()}
                    className={`flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors ${
                      windowWidth < 770 ? "flex-1 px-3 py-2 text-sm" : "px-4 py-2"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Import</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={exportLoading}
                    className={`flex items-center justify-center gap-2 text-white rounded-lg transition-colors ${
                      exportLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-yellow-600 hover:bg-yellow-700"
                    } ${windowWidth < 770 ? "flex-1 px-3 py-2 text-sm" : "px-4 py-2"}`}
                    title="Xuất Excel các bản ghi đang hiển thị"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{exportLoading ? "Đang xuất..." : "Export"}</span>
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

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <LoadingSpinner />
                    <div
                      className={`mt-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Đang tải dữ liệu...
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  {windowWidth < 770 ? (
                    <div className="space-y-4">
                      {/* Mobile bulk actions header */}
                      <div className={`flex items-center justify-between p-3 rounded-lg ${
                        isDarkMode ? "bg-gray-800/50" : "bg-gray-50"
                      }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={
                              pagedStudentInfors.length > 0 &&
                              pagedStudentInfors.every((s) => mobileSelectedIds.has(s.id))
                            }
                            onChange={() => {
                              if (pagedStudentInfors.every((s) => mobileSelectedIds.has(s.id))) {
                                setMobileSelectedIds(new Set());
                              } else {
                                setMobileSelectedIds(new Set(pagedStudentInfors.map((s) => s.id)));
                              }
                            }}
                            className="w-5 h-5 rounded"
                          />
                          <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Đã chọn: <strong>{mobileSelectedIds.size}</strong>
                          </span>
                        </div>
                        {mobileSelectedIds.size > 0 && (
                          <button
                            onClick={handleMobileBulkDelete}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Xóa ({mobileSelectedIds.size})
                          </button>
                        )}
                      </div>

                      {/* Empty state */}
                      {pagedStudentInfors.length === 0 ? (
                        <div className={`p-8 text-center rounded-lg ${
                          isDarkMode ? "bg-gray-800/80" : "bg-white/80"
                        } backdrop-blur-md border ${
                          isDarkMode ? "border-gray-700/50" : "border-gray-200/50"
                        } shadow-lg`}>
                          <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h3 className={`text-lg font-medium ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                            Không có dữ liệu
                          </h3>
                          <p className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Không tìm thấy sinh viên nào phù hợp với tiêu chí tìm kiếm.
                          </p>
                        </div>
                      ) : (
                        pagedStudentInfors.map((student) => (
                          <StudentMobileCard
                            key={student.id}
                            student={student}
                            isDarkMode={isDarkMode}
                            isSelected={mobileSelectedIds.has(student.id)}
                            onToggleSelect={() => toggleMobileSelect(student.id)}
                            onEdit={() => openEditModal(student)}
                            onDelete={() => handleDelete(student.id)}
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    /* Desktop View */
                    <StudentTable
                      columns={columns}
                      rows={pagedStudentInfors}
                      loading={loading}
                      isDarkMode={isDarkMode}
                      openEditModal={openEditModal}
                      handleDelete={handleDelete}
                      onBulkDelete={handleBulkDelete}
                      // pass allRowIds so the table can support "select all" across the full
                      // filtered result (or the whole DB if filteredStudentInfors === studentInfors)
                      allRowIds={(filteredStudentInfors || []).map((r) => r.id)}
                    />
                  )}

                  {/* Pagination controls */}
                  <div className={`mt-4 flex ${windowWidth < 770 ? "flex-col gap-3" : "items-center justify-between"}`}>
                    <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"} ${windowWidth < 770 ? "text-center" : ""}`}>
                      Hiển thị <strong>{showingFrom}</strong> -{" "}
                      <strong>{showingTo}</strong> của{" "}
                      <strong>{filteredStudentInfors.length}</strong> bản ghi
                    </div>

                    <div className={`flex items-center ${windowWidth < 770 ? "justify-center" : ""} gap-3`}>
                      <label className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                        Hiển thị
                      </label>
                      <select
                        value={limit}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 10;
                          setLimit(v);
                          setCurrentPage(1);
                        }}
                        className={`px-2 py-1 border rounded-md text-sm ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage <= 1}
                          className={`px-3 py-1 rounded-md ${
                            currentPage <= 1
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : isDarkMode
                              ? "bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
                              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          &laquo;
                        </button>

                        <div className={`text-sm px-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                          {currentPage} / {totalPages}
                        </div>

                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage >= totalPages}
                          className={`px-3 py-1 rounded-md ${
                            currentPage >= totalPages
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : isDarkMode
                              ? "bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
                              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          &raquo;
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Import confirmation modal (replace window.confirm) */}
      <Modal
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingImportInfo(null);
          setImportLoading(false);
        }}
        title="Xác nhận import"
        className="max-w-md"
      >
        {pendingImportInfo ? (
          <div className="space-y-4">
            <p>
              Tìm thấy <strong>{pendingImportInfo.originalCount}</strong> bản
              ghi trong file.
            </p>
            <p>
              Bỏ qua <strong>{pendingImportInfo.skippedExisting}</strong> bản
              ghi trùng đã có trên hệ thống.
            </p>
            <p>
              Bắt đầu import{" "}
              <strong>{pendingImportInfo.toImport.length}</strong> bản ghi?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImportInfo(null);
                  setImportLoading(false);
                }}
                className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-800"
              >
                Huỷ
              </button>
              <button
                onClick={async () => {
                  // start import
                  try {
                    await executeImport(pendingImportInfo.toImport);
                  } catch (err) {
                    console.error("Execute import error", err);
                    setError(
                      "Import thất bại: " + (err?.message || String(err))
                    );
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-green-600 text-white"
              >
                Xác nhận và bắt đầu
              </button>
            </div>
          </div>
        ) : (
          <div>Đang chuẩn bị...</div>
        )}
      </Modal>

      {/* Import progress modal */}
      <Modal
        isOpen={importLoading}
        onClose={() => {
          /* prevent closing while importing */
        }}
        title={
          importProgress.total
            ? `Import dữ liệu (${importPercent}%)`
            : "Import dữ liệu"
        }
        className="max-w-md"
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {importProgress.total > 0 ? (
              <>
                Đã xử lý <strong>{importProgress.done}</strong> /{" "}
                <strong>{importProgress.total}</strong> bản ghi.
              </>
            ) : (
              <>Đang chuẩn bị dữ liệu...</>
            )}
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 bg-green-500 dark:bg-green-400 transition-all"
              style={{ width: `${importPercent}%` }}
            />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            {importPercent}%
          </div>

          {importErrors && importErrors.length > 0 && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Có {importErrors.length} lỗi xảy ra (xem console để biết chi
              tiết).
            </div>
          )}
        </div>
      </Modal>

      {/* Single delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác nhận xóa"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p>Bạn có chắc muốn xóa bản ghi này không?</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-800"
            >
              Hủy
            </button>
            <button
              onClick={confirmDelete}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </Modal>
      {/* Bulk delete confirmation modal (parent-level) */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Xác nhận xóa nhiều"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p>
            Bạn có chắc muốn xóa <strong>{bulkDeleteIds.length}</strong> bản ghi
            đã chọn không?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBulkDeleteModal(false)}
              className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-800"
            >
              Hủy
            </button>
            <button
              onClick={confirmBulkDelete}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </Modal>
      {/* Single delete result modal */}
      <Modal
        isOpen={!!deleteResult}
        onClose={() => setDeleteResult(null)}
        title={deleteResult?.success ? "Thành công" : "Lỗi"}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p>{deleteResult?.message}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setDeleteResult(null)}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
      {/* Bulk delete result modal */}
      <Modal
        isOpen={!!bulkDeleteResult}
        onClose={() => setBulkDeleteResult(null)}
        title={bulkDeleteResult?.success ? "Thành công" : "Lỗi"}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p>{bulkDeleteResult?.message}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setBulkDeleteResult(null)}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
      {/* Bulk deleting progress modal */}
      <Modal
        isOpen={bulkDeleting}
        onClose={() => {
          /* prevent closing while deleting */
        }}
        title={`Xóa dữ liệu (${Math.round(
          ((bulkDeleteProgress.done || 0) / (bulkDeleteProgress.total || 1)) *
            100
        )}%)`}
        className="max-w-md"
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Đang xóa <strong>{bulkDeleteProgress.done}</strong> /{" "}
            <strong>{bulkDeleteProgress.total}</strong> bản ghi...
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 bg-red-500 dark:bg-red-400 transition-all"
              style={{
                width: `${
                  bulkDeleteProgress.total
                    ? Math.min(
                        100,
                        Math.round(
                          (bulkDeleteProgress.done / bulkDeleteProgress.total) *
                            100
                        )
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </Modal>
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        form={form}
        handleChange={handleChange}
        handleSave={handleSave}
        isSaving={isSaving}
        error={error}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default StudentInforManagement;
