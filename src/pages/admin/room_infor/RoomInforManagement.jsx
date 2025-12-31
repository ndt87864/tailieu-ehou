import React, { useEffect, useState, useMemo, useRef } from "react";
import LoadingSpinner from "../../../components/content/LoadingSpinner";
import {
  getAllStudentInfor,
  subscribeStudentInfor,
  updateStudentsByMatch,
  deleteStudentsByMatch,
} from "../../../firebase/studentInforService";
import {
  formatDate,
  normalizeForSearch,
  parseDateToYMD,
  ensureXLSX,
  mapHeaderToKey,
  parseExcelDateToYMD,
  isValidUrl,
  parseCSV,
} from "../student_infor/studentInforHelpers";
import { useTheme } from "../../../context/ThemeContext";
import { useUserRole } from "../../../context/UserRoleContext";
import Sidebar from "../../../components/Sidebar";
import UserHeader from "../../../components/UserHeader";
import { DocumentMobileHeader } from "../../../components/MobileHeader";
import Footer from "../../../components/Footer";
import ThemeColorPicker from "../../../components/ThemeColorPicker";
import { getAllCategoriesWithDocuments } from "../../../firebase/firestoreService";
import Modal from "../../../components/Modal";
import {
  getAllRoomInfor,
  addRoomInfor,
  updateRoomInfor,
} from "../../../firebase/roomInforService";
import { deleteRoomInfor } from "../../../firebase/roomInforService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../firebase/firebase";
import RoomTable from "./RoomTable";
import RoomMobileCard from "./RoomMobileCard";
import RoomFormModal from "./RoomFormModal";

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

  // Excel import modal / progress
  const [importModal, setImportModal] = useState({
    open: false,
    title: "",
    message: "",
    processed: 0,
    total: 0,
    updatedCount: 0,
    studentUpdatedCount: 0,
    done: false,
  });
  // filters for searching
  const [filterSubject, setFilterSubject] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupByLink, setGroupByLink] = useState(false);

  // in-app confirmation popup state (replaces window.confirm)
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: "",
  });
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

  // Theme, auth and layout states (needed by header/sidebar and dark mode)
  const [user] = useAuthState(auth);
  const { isDarkMode } = useTheme();
  const { isAdmin } = useUserRole();
  const [sidebarData, setSidebarData] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  const getMatchingRoomDocs = async (roomObj) => {
    try {
      const all = await getAllRoomInfor();

      // Match by subject, examSession, examRoom (normalized). BỎ examTime. Only require examDate when it's provided in roomObj.
      return all.filter((d) => {
        try {
          const norm = (v) => normalizeForSearch(String(v || "")).trim();
          let logReason = [];
          // if caller provided examDate (non-empty), require date equality (normalized YMD)
          if (roomObj && roomObj.examDate) {
            const a = parseDateToYMD(roomObj.examDate || "");
            const b = parseDateToYMD(d.examDate || "");
            if (a !== b) {
              logReason.push(`examDate not match: excel=${a}, db=${b}`);
              // not return yet, let log all reasons
            }
          }
          if (norm(d.subject) !== norm(roomObj.subject)) {
            logReason.push(
              `subject not match: excel=${norm(roomObj.subject)}, db=${norm(d.subject)}`
            );
          }
          if (norm(d.examSession) !== norm(roomObj.examSession)) {
            logReason.push(
              `examSession not match: excel=${norm(roomObj.examSession)}, db=${norm(d.examSession)}`
            );
          }
          if (norm(d.examRoom) !== norm(roomObj.examRoom)) {
            logReason.push(
              `examRoom not match: excel=${norm(roomObj.examRoom)}, db=${norm(d.examRoom)}`
            );
          }
          if (roomObj.examType && norm(d.examType) !== norm(roomObj.examType)) {
            logReason.push(
              `examType not match: excel=${norm(roomObj.examType)}, db=${norm(d.examType)}`
            );
          }
          if (logReason.length > 0) {
            console.warn("[RoomImport][NoMatch]", {
              excel: roomObj,
              db: d,
              reasons: logReason,
            });
            return false;
          }
          return true;
        } catch (e) {
          console.error("[RoomImport][ErrorMatching]", e);
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

    const filtered = (rooms || []).filter((r) => {
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

    // Sorting: examDate (asc), examSession (asc), examRoom (asc)
    const normalizeEmptyDate = (d) => {
      const y = parseDateToYMD(d || "") || "";
      // Treat empty dates as far-future so they appear last
      return y === "" ? "9999-12-31" : y;
    };

    const extractNumber = (s) => {
      if (!s) return null;
      const m = String(s).match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    };

    const compareAlphaNum = (a, b) => {
      if (a === b) return 0;
      const aNum = extractNumber(a);
      const bNum = extractNumber(b);
      if (aNum !== null && bNum !== null) {
        return aNum - bNum;
      }
      // fallback to localeCompare for strings
      return String(a || "").localeCompare(String(b || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    };

    filtered.sort((x, y) => {
      try {
        const dx = normalizeEmptyDate(x.examDate);
        const dy = normalizeEmptyDate(y.examDate);
        if (dx < dy) return -1;
        if (dx > dy) return 1;

        // examSession compare (allow numeric comparison when possible)
        const sessCmp = compareAlphaNum(
          x.examSession || "",
          y.examSession || ""
        );
        if (sessCmp !== 0) return sessCmp;

        // examRoom compare (allow numeric comparison when possible)
        const roomCmp = compareAlphaNum(x.examRoom || "", y.examRoom || "");
        if (roomCmp !== 0) return roomCmp;

        // final fallback: compare subject to have deterministic order
        return String(x.subject || "").localeCompare(
          String(y.subject || ""),
          undefined,
          { sensitivity: "base" }
        );
      } catch (e) {
        return 0;
      }
    });

    return filtered;
  }, [rooms, filterSubject, filterRoom, filterDate, filterSession]);

  // visibleRooms is either the flat filtered list or the flattened groups when grouping is enabled
  const visibleRooms = useMemo(() => {
    if (!groupByLink) return filteredRooms || [];
    // group by exact examLink (normalized)
    const groupsMap = new Map();
    const normalizeLink = (s) => (s || "").toString().trim();
    (filteredRooms || []).forEach((r) => {
      const key = normalizeLink(r.examLink) || "(no-link)";
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(r);
    });
    // flatten groups but keep group boundaries info not needed here; return flattened array for selection/counts
    return Array.from(groupsMap.values()).flat();
  }, [filteredRooms, groupByLink]);

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
            `${r.examDate}||${r.subject}||${r.examSession}||${r.examRoom}||${
              r.examType
            }||${r.majorCode || ""}`
        )
      );

      // From students, build unique room candidates
      const candidatesMap = new Map();
      for (const s of students) {
        const key = `${s.examDate || ""}||${s.subject || ""}||${
          s.examSession || ""
        }||${s.examRoom || ""}||${s.examType || ""}||${s.majorCode || ""}`;
        if (!key) continue;
        // skip empty key
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            examDate: s.examDate || "",
            subject: s.subject || "",
            examSession: s.examSession || "",
            examRoom: s.examRoom || "",
            examType: s.examType || "",
            majorCode: s.majorCode || "",
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
      // Support CSV as well as Excel. Use file extension/type to choose parser.
      const isCsv =
        String(file.name || "")
          .toLowerCase()
          .endsWith(".csv") || file.type === "text/csv";
      let json = [];
      let date1904 = false;

      if (isCsv) {
        // Parse CSV using our helper which returns array of objects (header -> value)
        const text = await file.text();
        json = parseCSV(text);
        date1904 = false;
      } else {
        const XLSX = await ensureXLSX();
        const data = await file.arrayBuffer();
        // request cellDates so date cells become JS Date where possible
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        date1904 = Boolean(
          wb &&
            wb.Workbook &&
            wb.Workbook.WBProps &&
            wb.Workbook.WBProps.date1904
        );
        const firstSheet = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheet];
        json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      }
      if (!Array.isArray(json) || json.length === 0) {
        setImportModal({
          open: true,
          title: "Lỗi file Excel",
          message: "File Excel không có dữ liệu.",
          processed: 0,
          total: 0,
          updatedCount: 0,
          studentUpdatedCount: 0,
          done: true,
        });
        return;
      }

      // Map headers: take the first row keys
      const headerMap = {};
      const firstRow = json[0];
      Object.keys(firstRow).forEach((h) => {
        const mapped = mapHeaderToKey(h);
        if (mapped) headerMap[h] = mapped;
      });
      // Debug: log header map so admins can verify Excel headers map to expected fields
      console.info("📋 handleExcelImport: headerMap", headerMap);
      console.info("📋 handleExcelImport: firstRow raw data", firstRow);

      // Debug: log first row after mapping
      const debugMappedFirstRow = {};
      Object.entries(firstRow).forEach(([k, v]) => {
        const key = headerMap[k];
        if (key) debugMappedFirstRow[key] = v;
      });
      console.info(
        "📋 handleExcelImport: firstRow mapped data",
        debugMappedFirstRow
      );

      // We expect at least subject, examSession, examTime, examRoom to match; date/link optional
      let updatedCount = 0;
      let studentUpdatedCount = 0;
      let rowCount = 0;
      // additional counters for debugging/reporting
      let rowsSkippedNoKey = 0; // rows with no matching key fields
      let rowsWithNoMatches = 0; // rows that had key but no matching room docs
      let rowsWithMatches = 0; // rows that had at least one matching room doc
      // collect rows for display in the result modal so admin can inspect failures
      const skippedRowsList = [];
      const noMatchRowsList = [];

      // open import progress modal
      setImportModal((m) => ({
        ...m,
        open: true,
        title: "Đang nhập Excel",
        message: "Đang xử lý...",
        processed: 0,
        total: json.length,
        updatedCount: 0,
        studentUpdatedCount: 0,
        done: false,
      }));

      // SPECIAL CASE: file contains only links (or most rows have no matching key fields)
      // Detect if rows don't include subject/session/time/room but do include at least one URL per row.
      const extractMappedRow = (row) => {
        const mapped = {};
        Object.entries(row).forEach(([k, v]) => {
          const key = headerMap[k];
          if (key) mapped[key] = v;
        });
        return { raw: row, mapped };
      };

      const rowsMapped = json.map((r) => extractMappedRow(r));

      const rowHasKeyFields = (m) => {
        return (
          (m.mapped.subject && String(m.mapped.subject).trim() !== "") ||
          (m.mapped.examSession &&
            String(m.mapped.examSession).trim() !== "") ||
          (m.mapped.examTime && String(m.mapped.examTime).trim() !== "") ||
          (m.mapped.examRoom && String(m.mapped.examRoom).trim() !== "")
        );
      };

      const findUrlInAnyCell = (rawRow) => {
        for (const v of Object.values(rawRow)) {
          try {
            const s = String(v || "").trim();
            if (isValidUrl(s)) return s;
          } catch (e) {
            /* ignore */
          }
        }
        return null;
      };

      const allRowsHaveNoKeyAndHaveLink =
        rowsMapped.length > 0 &&
        rowsMapped.every((m) => {
          const hasKey = rowHasKeyFields(m);
          const link =
            (m.mapped.examLink && String(m.mapped.examLink).trim() !== "") ||
            Boolean(findUrlInAnyCell(m.raw));
          return !hasKey && link;
        });

      // NEW LOGIC: Detect file with majorCode, examRoom, examLink columns (or with examDate, subject, examSession)
      const hasThreeColumnFormat =
        rowsMapped.length > 0 &&
        rowsMapped.some((m) => {
          const hasMajorCode =
            m.mapped.majorCode && String(m.mapped.majorCode).trim() !== "";
          const hasExamRoom =
            m.mapped.examRoom && String(m.mapped.examRoom).trim() !== "";
          const hasExamLink =
            (m.mapped.examLink && String(m.mapped.examLink).trim() !== "") ||
            Boolean(findUrlInAnyCell(m.raw));
          // Also detect if file has examDate, subject, examSession columns (even without majorCode)
          const hasExamDate =
            m.mapped.examDate && String(m.mapped.examDate).trim() !== "";
          const hasSubject =
            m.mapped.subject && String(m.mapped.subject).trim() !== "";
          const hasExamSession =
            m.mapped.examSession && String(m.mapped.examSession).trim() !== "";

          // Accept if: (majorCode + examRoom + link) OR (examDate + subject + examSession + examRoom + link)
          return (
            (hasMajorCode && hasExamRoom && hasExamLink) ||
            (hasExamDate &&
              hasSubject &&
              hasExamSession &&
              hasExamRoom &&
              hasExamLink)
          );
        });

      if (hasThreeColumnFormat) {
        // Process file with multiple formats:
        // Format 1: majorCode + examRoom + examLink (+ optional subject, examDate, examSession)
        // Format 2: examDate + subject + examSession + examRoom + examLink (without majorCode)
        let applied = 0;
        let studentsSynced = 0;
        let notFoundCount = 0;

        for (const m of rowsMapped) {
          const majorCode = String(m.mapped.majorCode || "").trim();
          const examRoom = String(m.mapped.examRoom || "").trim();
          const examLink = String(
            m.mapped.examLink || findUrlInAnyCell(m.raw) || ""
          ).trim();
          // Extract optional/required examDate, examSession, and subject from the row
          const examDate = m.mapped.examDate
            ? parseExcelDateToYMD(m.mapped.examDate, { date1904 })
            : "";
          const examSession = String(m.mapped.examSession || "").trim();
          const subject = String(m.mapped.subject || "").trim();

          // Validation: must have examRoom and examLink at minimum
          if (!examRoom || !examLink) continue;

          // Flexible validation based on available data:
          // - If has majorCode: can work with just majorCode + examRoom
          // - If no majorCode but has examDate + subject: can work
          // - Allow matching even without examSession (many files don't have it)
          if (!majorCode && !examDate && !subject) {
            console.warn(
              `Bỏ qua dòng thiếu dữ liệu: cần ít nhất (majorCode + examRoom) HOẶC (examDate + subject + examRoom)`
            );
            continue;
          }

          // Debug log for this row
          console.log(`[Import] Processing row:`, {
            majorCode,
            examRoom,
            subject,
            examDate,
            examSession,
            examLink,
          });

          try {
            // IMPORTANT: Room list is computed from student_infor, not room_infor collection!
            // So we need to search in student_infor and update there directly
            const allStudents = await getAllStudentInfor();
            console.log(`[Import] Total students in DB: ${allStudents.length}`);

            // Find matching students based on criteria
            const matchingStudents = allStudents.filter((s) => {
              const dbExamRoom = normalizeForSearch(
                String(s.examRoom || "")
              ).trim();
              const inputExamRoom = normalizeForSearch(examRoom).trim();

              // Basic match: examRoom must match
              let isMatch = dbExamRoom === inputExamRoom;

              // If majorCode is provided, match by majorCode
              if (isMatch && majorCode) {
                const dbMajorCode = String(s.majorCode || "").trim();
                const majorMatch = dbMajorCode === majorCode;
                isMatch = isMatch && majorMatch;
                if (!majorMatch && dbExamRoom === inputExamRoom) {
                  // Only log once per unique combination
                }
              }

              // If subject is provided, match by subject
              if (isMatch && subject) {
                const dbSubject = normalizeForSearch(
                  String(s.subject || "")
                ).trim();
                const inputSubject = normalizeForSearch(subject).trim();
                const subjectMatch = dbSubject === inputSubject;
                isMatch = isMatch && subjectMatch;
              }

              // If examDate is provided, match by examDate
              if (isMatch && examDate) {
                const dbExamDate = parseDateToYMD(s.examDate || "");
                const dateMatch = dbExamDate === examDate;
                isMatch = isMatch && dateMatch;
              }

              // If examSession is provided, match by examSession (OPTIONAL)
              if (isMatch && examSession) {
                const dbExamSession = normalizeForSearch(
                  String(s.examSession || "")
                ).trim();
                const inputExamSession = normalizeForSearch(examSession).trim();
                const sessionMatch = dbExamSession === inputExamSession;
                isMatch = isMatch && sessionMatch;
              }

              return isMatch;
            });

            console.log(
              `[Import] Found ${matchingStudents.length} matching students for examRoom="${examRoom}"`
            );

            if (matchingStudents.length === 0) {
              notFoundCount++;
              const criteria = [];
              if (majorCode) criteria.push(`majorCode: ${majorCode}`);
              if (examRoom) criteria.push(`examRoom: ${examRoom}`);
              if (subject) criteria.push(`subject: ${subject}`);
              if (examDate) criteria.push(`examDate: ${examDate}`);
              if (examSession) criteria.push(`examSession: ${examSession}`);
              console.warn(
                `❌ Không tìm thấy sinh viên khớp cho: ${criteria.join(", ")}`
              );

              // Show sample of students with same examRoom to help debug
              const sameRoomSamples = allStudents
                .filter(
                  (s) =>
                    normalizeForSearch(String(s.examRoom || "")).trim() ===
                    normalizeForSearch(examRoom).trim()
                )
                .slice(0, 3);
              if (sameRoomSamples.length > 0) {
                console.warn(
                  `   Tìm thấy ${sameRoomSamples.length} sinh viên có cùng số phòng "${examRoom}" nhưng không khớp điều kiện khác:`,
                  sameRoomSamples.map((s) => ({
                    examRoom: s.examRoom,
                    majorCode: s.majorCode,
                    subject: s.subject,
                    examDate: parseDateToYMD(s.examDate),
                    examSession: s.examSession,
                  }))
                );
              } else {
                console.warn(
                  `   Không có sinh viên nào có số phòng "${examRoom}" trong database`
                );
              }
              continue;
            }

            console.log(
              `✅ Tìm thấy ${matchingStudents.length} sinh viên khớp, sẽ cập nhật link`
            );

            // Update examLink for all matching students using updateStudentsByMatch
            const updateCriteria = {
              examRoom: examRoom,
            };
            if (majorCode) updateCriteria.majorCode = majorCode;
            if (subject) updateCriteria.subject = subject;
            if (examDate) updateCriteria.examDate = examDate;
            if (examSession) updateCriteria.examSession = examSession;

            const res = await updateStudentsByMatch(
              updateCriteria,
              { examLink },
              { allowBulk: true }
            );

            if (res && typeof res.updated === "number" && res.updated > 0) {
              applied++;
              studentsSynced += res.updated;
              console.log(
                `✅ Đã cập nhật ${res.updated} sinh viên với link: ${examLink}`
              );
            }
          } catch (e) {
            console.error(
              "Error processing row with majorCode/examRoom/examLink:",
              e
            );
          }
        }

        setImportModal((m) => ({
          ...m,
          open: true,
          title: "Hoàn tất nhập Excel",
          message: `Đã xử lý file. Cập nhật ${applied} nhóm phòng, đồng bộ ${studentsSynced} bản ghi thí sinh. ${
            notFoundCount > 0 ? `Không tìm thấy: ${notFoundCount} phòng.` : ""
          }`,
          processed: json.length,
          total: json.length,
          updatedCount: applied,
          studentUpdatedCount: studentsSynced,
          done: true,
        }));

        setIsSaving(false);
        return; // finish three-column format flow
      }

      if (allRowsHaveNoKeyAndHaveLink) {
        // Build ordered list of links from the file
        const links = rowsMapped
          .map((m) =>
            String(m.mapped.examLink || findUrlInAnyCell(m.raw) || "").trim()
          )
          .filter(Boolean);

        if (links.length === 0) {
          setImportModal((m) => ({
            ...m,
            open: true,
            title: "Hoàn tất nhập Excel",
            message: "Không tìm thấy link hợp lệ trong file.",
            processed: json.length,
            total: json.length,
            updatedCount: 0,
            studentUpdatedCount: 0,
            done: true,
          }));
        } else {
          // Build groups from current filteredRooms ordering (distinct clusters)
          const groups = [];
          const seen = new Set();
          (filteredRooms || []).forEach((r) => {
            const k = makeKey(r);
            if (!seen.has(k)) {
              seen.add(k);
              groups.push({
                key: k,
                example: r,
              });
            }
          });

          if (groups.length === 0) {
            setImportModal((m) => ({
              ...m,
              open: true,
              title: "Hoàn tất nhập Excel",
              message:
                "Không có nhóm phòng để cập nhật (danh sách phòng trống).",
              processed: json.length,
              total: json.length,
              updatedCount: 0,
              studentUpdatedCount: 0,
              done: true,
            }));
          } else {
            let applied = 0;
            let studentsSynced = 0;
            // Assign links sequentially: group 0 -> links[0], group1 -> links[1], ...
            const limit = Math.min(links.length, groups.length);
            for (let i = 0; i < limit; i++) {
              const link = links[i];
              const grp = groups[i];
              // build match criteria from group's example record
              const example = grp.example;
              const criteriaForRooms = {
                examDate: example.examDate,
                subject: example.subject,
                examSession: example.examSession,
                examRoom: example.examRoom,
                examType: example.examType,
              };
              // find matching room_infor docs and update their examLink
              const matches = await getMatchingRoomDocs(criteriaForRooms);
              if (!matches || matches.length === 0) {
                // No room_infor docs found: update student_infor directly for this group
                try {
                  const studentCriteria = {
                    subject: example.subject,
                    examSession: example.examSession,
                    examRoom: example.examRoom,
                  };
                  if (example.examDate)
                    studentCriteria.examDate = example.examDate;
                  if (example.examType)
                    studentCriteria.examType = example.examType;

                  const res = await updateStudentsByMatch(
                    studentCriteria,
                    { examLink: link },
                    { allowBulk: true }
                  );
                  if (res && typeof res.updated === "number") {
                    studentsSynced += res.updated;
                    if (res.updated > 0) applied++;
                  }
                } catch (e) {
                  console.warn(
                    "Failed to update students for group (no room_infor docs)",
                    grp,
                    e
                  );
                }
                continue;
              }
              for (const doc of matches) {
                try {
                  if (!doc.examLink || String(doc.examLink).trim() === "") {
                    await updateRoomInfor(doc.id, { ...doc, examLink: link });
                    applied++;
                  } else {
                    // still overwrite? The user requested only update link; they didn't request to avoid overwriting.
                    // We'll overwrite empty links only to be safe. If you want forced overwrite, change here.
                  }

                  // sync to students
                  try {
                    const studentCriteria = {
                      subject: doc.subject,
                      examSession: doc.examSession,
                      examRoom: doc.examRoom,
                    };
                    if (doc.examDate) studentCriteria.examDate = doc.examDate;
                    if (doc.examType) studentCriteria.examType = doc.examType;

                    const res = await updateStudentsByMatch(
                      studentCriteria,
                      { examLink: link },
                      { allowBulk: true }
                    );
                    if (res && typeof res.updated === "number")
                      studentsSynced += res.updated;
                  } catch (e) {
                    console.warn(
                      "Failed to sync students for room doc",
                      doc.id,
                      e
                    );
                  }
                } catch (e) {
                  console.warn("Failed to update room_infor doc", doc.id, e);
                }
              }
            }

            setImportModal((m) => ({
              ...m,
              open: true,
              title: "Hoàn tất nhập Excel",
              message: `Áp dụng ${applied} phòng từ ${limit} nhóm đầu, đồng bộ ${studentsSynced} bản ghi thí sinh.`,
              processed: json.length,
              total: json.length,
              updatedCount: applied,
              studentUpdatedCount: studentsSynced,
              done: true,
            }));
          }
        }

        setIsSaving(false);
        return; // finish special-case flow
      }

      for (const row of json) {
        rowCount++;
        const mapped = {};
        Object.entries(row).forEach(([k, v]) => {
          const key = headerMap[k];
          if (key) mapped[key] = v;
        });

        // build match key from subject/session/room
        const keyObj = {
          subject: (mapped.subject || "").toString().trim(),
          examSession: (mapped.examSession || "").toString().trim(),
          examRoom: (mapped.examRoom || "").toString().trim(),
          examType: (mapped.examType || "").toString().trim(),
        };

        // If the Excel cell for 'examRoom' actually contains a URL (admins sometimes paste link
        // into the 'Phòng' column), move it to examLink and try to locate a numeric room value
        // elsewhere in the row so matching can proceed. This makes the import tolerant to
        // swapped columns in various Excel templates.
        if (isValidUrl(keyObj.examRoom)) {
          // move to mapped.examLink if not already present
          if (!mapped.examLink || String(mapped.examLink).trim() === "") {
            mapped.examLink = keyObj.examRoom;
          }
          // clear examRoom and attempt to find a numeric room value in other cells
          keyObj.examRoom = "";
          // Prefer any other mapped.examRoom-like fields (raw row values that look numeric)
          for (const v of Object.values(row)) {
            try {
              const s = String(v || "").trim();
              if (s && !isValidUrl(s) && /\d{1,4}/.test(s)) {
                // pick the first plausible numeric room value
                keyObj.examRoom = s;
                break;
              }
            } catch (e) {
              /* ignore */
            }
          }
        }

        if (!keyObj.subject && !keyObj.examSession && !keyObj.examRoom) {
          rowsSkippedNoKey++;
          // Log the skipped row for debugging: show mapped keys so we can see which headers were missing
          console.warn(
            `handleExcelImport: skipped row ${rowCount} (missing key fields)`,
            {
              mapped,
              keyObj,
              raw: row,
            }
          );
          // store a lightweight representation for the modal
          skippedRowsList.push({
            rowIndex: rowCount,
            mapped,
            keyObj,
          });
          // update processed counter so progress advances
          setImportModal((m) => ({ ...m, processed: (m.processed || 0) + 1 }));
          continue;
        }

        // Normalize keys for more robust matching (remove diacritics, lowercase)
        const normKeyObj = {
          subject: normalizeForSearch(keyObj.subject || "").trim(),
          examSession: normalizeForSearch(keyObj.examSession || "").trim(),
          examRoom: normalizeForSearch(keyObj.examRoom || "").trim(),
          examType: normalizeForSearch(keyObj.examType || "").trim(),
        };

        // normalize date value if present (we'll need this whether room docs exist or not)
        let rowDate = "";
        if (mapped.examDate) {
          rowDate = parseExcelDateToYMD(mapped.examDate, { date1904 });
        }
        const rowLink = mapped.examLink ? String(mapped.examLink).trim() : "";

        // include parsed exam date so matching requires the same calendar date
        let matches = await getMatchingRoomDocs({
          ...normKeyObj,
          examDate: rowDate,
        });
        // If no matches found, try a relaxed second-pass: match by room number OR by examLink directly
        if (
          (!matches || matches.length === 0) &&
          (normKeyObj.examRoom || rowLink)
        ) {
          try {
            const allRooms = await getAllRoomInfor();
            const norm = (v) => normalizeForSearch(String(v || "")).trim();
            const roomCandidates = allRooms.filter((d) => {
              try {
                const dbRoomNorm = norm(d.examRoom);
                const dbLinkNorm = normalizeForSearch(d.examLink || "").trim();
                const roomMatch = normKeyObj.examRoom
                  ? dbRoomNorm === normKeyObj.examRoom
                  : false;
                const linkMatch = rowLink
                  ? dbLinkNorm === normalizeForSearch(rowLink)
                  : false;
                // also allow matching numeric room when input contains number but DB room has extra text
                if (!roomMatch && normKeyObj.examRoom) {
                  const digitsInDb = (dbRoomNorm || "").match(/\d+/g) || [];
                  const digitsInInput =
                    (normKeyObj.examRoom || "").match(/\d+/g) || [];
                  if (
                    digitsInDb.length &&
                    digitsInInput.length &&
                    digitsInDb.join("") === digitsInInput.join("")
                  ) {
                    return true;
                  }
                }
                return roomMatch || linkMatch;
              } catch (e) {
                return false;
              }
            });
            if (roomCandidates && roomCandidates.length > 0) {
              console.info(
                "[RoomImport][RelaxedMatch] found",
                roomCandidates.length,
                "candidates for row",
                rowCount
              );
              matches = roomCandidates;
            }
          } catch (e) {
            console.warn("handleExcelImport: relaxed matching failed", e);
          }
        }
        if (!matches || matches.length === 0) {
          rowsWithNoMatches++;
          // Log the no-match case with the key used so we can diagnose why rooms weren't found
          console.warn(
            `handleExcelImport: no matching rooms for row ${rowCount}`,
            {
              keyObj,
              mapped,
              raw: row,
            }
          );
          // Also log a sample of existing room normalized keys to help debugging
          try {
            const allRooms = await getAllRoomInfor();
            const norm = (v) => normalizeForSearch(String(v || "")).trim();
            console.warn(
              `handleExcelImport: available rooms (sample ${Math.min(
                50,
                allRooms.length
              )}):`,
              allRooms.slice(0, 50).map((r) => ({
                id: r.id,
                subject: norm(r.subject),
                examSession: norm(r.examSession),
                examTime: norm(r.examTime),
                examRoom: norm(r.examRoom),
              }))
            );
          } catch (e) {
            console.warn(
              "handleExcelImport: failed to fetch all rooms for debug",
              e
            );
          }
          // If there are no room_infor docs, but excel provides date/link, update student_infor directly
          const updatesFallback = {};
          if (rowDate) updatesFallback.examDate = rowDate;
          if (rowLink) updatesFallback.examLink = rowLink;

          if (Object.keys(updatesFallback).length > 0) {
            try {
              const criteria = {
                subject: keyObj.subject,
                examSession: keyObj.examSession,
                examRoom: keyObj.examRoom,
              };
              // include examType if provided in the imported row
              if (keyObj.examType) criteria.examType = keyObj.examType;
              // include examDate (parsed from Excel) if available to ensure strict matching by date
              if (rowDate) criteria.examDate = rowDate;
              // attempt to update students directly
              const res = await updateStudentsByMatch(
                criteria,
                updatesFallback,
                { allowBulk: true }
              );
              if (res && typeof res.updated === "number" && res.updated > 0) {
                studentUpdatedCount += res.updated;
                setImportModal((m) => ({
                  ...m,
                  processed: (m.processed || 0) + 1,
                  studentUpdatedCount:
                    (m.studentUpdatedCount || 0) + (res.updated || 0),
                }));
              } else {
                // nothing updated
                setImportModal((m) => ({
                  ...m,
                  processed: (m.processed || 0) + 1,
                }));
              }
            } catch (e) {
              console.error(
                "handleExcelImport: fallback updateStudentsByMatch failed",
                e
              );
              setImportModal((m) => ({
                ...m,
                processed: (m.processed || 0) + 1,
              }));
            }
          } else {
            // store for modal review
            noMatchRowsList.push({ rowIndex: rowCount, keyObj, mapped });
            // advance processed for this row
            setImportModal((m) => ({
              ...m,
              processed: (m.processed || 0) + 1,
            }));
          }
          continue;
        }
        rowsWithMatches++;

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

            // Also update matching student_infor records so UI (which derives rooms from students)
            // reflects the imported examDate/examLink. Use the student service helper.
            try {
              const criteria = {
                subject: doc.subject,
                examSession: doc.examSession,
                examRoom: doc.examRoom,
              };
              // include examType if available on the room doc
              if (doc.examType) criteria.examType = doc.examType;
              // include examDate in criteria if room doc has a date (prefer stricter match)
              if (doc.examDate) criteria.examDate = doc.examDate;

              const res = await updateStudentsByMatch(criteria, updates, {
                allowBulk: true,
              });
              if (res && typeof res.updated === "number") {
                studentUpdatedCount += res.updated;
                // update modal progress after each room update
                setImportModal((m) => ({
                  ...m,
                  processed: (m.processed || 0) + 1,
                  updatedCount: (m.updatedCount || 0) + 1,
                  studentUpdatedCount:
                    (m.studentUpdatedCount || 0) + (res.updated || 0),
                }));
              } else {
                // still increment processed for a room updated even if no students changed
                setImportModal((m) => ({
                  ...m,
                  processed: (m.processed || 0) + 1,
                  updatedCount: (m.updatedCount || 0) + 1,
                }));
              }
            } catch (e) {
              console.error(
                "handleExcelImport: failed to update student records",
                e
              );
              // ensure processed count advances so progress continues
              setImportModal((m) => ({
                ...m,
                processed: (m.processed || 0) + 1,
              }));
            }
          }
        }
        // finished processing this row (even if multiple matching room docs)
        setImportModal((m) => ({ ...m, processed: (m.processed || 0) + 1 }));
      }

      // finalize modal with results (include more counters)
      setImportModal((m) => ({
        ...m,
        open: true,
        title: "Hoàn tất nhập Excel",
        message: `Đã xử lý ${rowCount} dòng. Phát hiện: ${rowsWithMatches} dòng có phòng khớp, ${rowsWithNoMatches} dòng không tìm thấy phòng khớp, ${rowsSkippedNoKey} dòng thiếu dữ liệu để đối chiếu. Cập nhật ${updatedCount} phòng. Cập nhật ${studentUpdatedCount} bản ghi thí sinh.`,
        processed: rowCount,
        total: json.length,
        updatedCount,
        studentUpdatedCount,
        // attach lists for inspection in modal
        noMatchRows: noMatchRowsList,
        skippedRows: skippedRowsList,
        done: true,
      }));
    } catch (err) {
      console.error("handleExcelImport error", err);
      setImportModal({
        open: true,
        title: "Lỗi nhập Excel",
        message: "Lỗi khi đọc file Excel. Xem console để biết chi tiết.",
        processed: 0,
        total: 0,
        updatedCount: 0,
        studentUpdatedCount: 0,
        done: true,
      });
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
        const matches = await getMatchingRoomDocs({
          examDate: editing.examDate,
          subject: editing.subject,
          examSession: editing.examSession,
          examRoom: editing.examRoom,
          examType: editing.examType,
        });

        // apply the room changes: update existing room docs or create a new one
        const affectedDocs = [];
        if (matches.length === 0) {
          // nothing to update, create a new room doc
          try {
            const created = await addRoomInfor(form);
            if (created) affectedDocs.push(created);
          } catch (e) {
            console.error("Failed to create room_infor document", e);
          }
        } else {
          for (const doc of matches) {
            try {
              await updateRoomInfor(doc.id, { ...form });
              // push a representation of the updated doc (use form values for current state)
              affectedDocs.push({ id: doc.id, ...form });
            } catch (e) {
              console.error("Failed to update room_infor document", doc.id, e);
            }
          }
        }

        // Additionally, update student_infor documents so they reflect the room edits.
        // We'll do two passes:
        // 1) Update students that matched the original (editing) key so they get new values.
        // 2) Update students that match the saved/updated room documents (affectedDocs) so missing fields
        //    like examDate/examLink are propagated.
        try {
          const origCriteria = {
            subject: editing.subject,
            examSession: editing.examSession,
            examRoom: editing.examRoom,
          };
          if (editing.examType) origCriteria.examType = editing.examType;
          if (editing.examDate) origCriteria.examDate = editing.examDate;

          const updatesFromForm = {};
          if ((form.subject || "") !== (editing.subject || ""))
            updatesFromForm.subject = form.subject || "";
          if ((form.examDate || "") !== (editing.examDate || ""))
            updatesFromForm.examDate = form.examDate || "";
          if ((form.examLink || "") !== (editing.examLink || ""))
            updatesFromForm.examLink = form.examLink || "";
          if ((form.examType || "") !== (editing.examType || ""))
            updatesFromForm.examType = form.examType || "";

          if (Object.keys(updatesFromForm).length > 0) {
            const res = await updateStudentsByMatch(
              origCriteria,
              updatesFromForm,
              {
                allowBulk: true,
                force: true,
              }
            );
            if (res && typeof res.updated === "number" && res.updated > 0) {
              console.info(
                `Updated ${res.updated} student_infor records to reflect room edits (original key).`
              );
            }
          }

          // PASS 2: for each affected (created/updated) room doc, propagate form values (propagate examDate/examLink/examType)
          for (const savedDoc of affectedDocs) {
            const criteria2 = {
              subject: savedDoc.subject,
              examSession: savedDoc.examSession,
              examTime: savedDoc.examTime,
              examRoom: savedDoc.examRoom,
            };
            if (savedDoc.examType) criteria2.examType = savedDoc.examType;
            if (savedDoc.examDate) criteria2.examDate = savedDoc.examDate;

            const updates2 = {};
            if (form.examDate) updates2.examDate = form.examDate;
            if (form.examLink) updates2.examLink = form.examLink;
            if (form.examType) updates2.examType = form.examType;

            if (Object.keys(updates2).length > 0) {
              const res2 = await updateStudentsByMatch(criteria2, updates2, {
                allowBulk: true,
                force: true,
              });
              if (
                res2 &&
                typeof res2.updated === "number" &&
                res2.updated > 0
              ) {
                console.info(
                  `Updated ${res2.updated} student_infor records to reflect room edits (saved doc ${savedDoc.id}).`
                );
              }
            }
          }
        } catch (e) {
          console.error("Failed to update student records for room edit", e);
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

  // Delete a displayed room (derived) and all matching student_infor records.
  const handleDeleteRoom = async (r) => {
    const proceed = await showConfirm(
      "Xóa phòng này và tất cả bản ghi thí sinh trùng (Ngày thi, Tên môn, Ca, Thời gian, Phòng, Link). Hành động không thể hoàn tác. Tiếp tục?"
    );
    if (!proceed) return;
    setIsSaving(true);
    try {
      // Delete any room_infor documents that match this room (if present)
      const matches = await getMatchingRoomDocs({
        examDate: r.examDate,
        subject: r.subject,
        examSession: r.examSession,
        examTime: r.examTime,
        examRoom: r.examRoom,
        examType: r.examType,
      });

      let deletedRooms = 0;
      for (const doc of matches) {
        try {
          await deleteRoomInfor(doc.id);
          deletedRooms++;
        } catch (e) {
          console.warn("Failed to delete room_infor", doc.id, e);
        }
      }

      // Delete matching student records
      const criteria = {
        subject: r.subject,
        examSession: r.examSession,
        examTime: r.examTime,
        examRoom: r.examRoom,
      };
      if (r.examDate) criteria.examDate = r.examDate;
      if (r.examType) criteria.examType = r.examType;

      const res = await deleteStudentsByMatch(criteria);

      alert(
        `Hoàn thành. Đã xóa ${deletedRooms} phòng (nếu có) và ${
          res.deleted || 0
        } bản ghi thí sinh.`
      );
    } catch (err) {
      console.error("handleDeleteRoom error", err);
      alert(
        "Lỗi khi xóa phòng hoặc bản ghi thí sinh. Xem console để biết chi tiết."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Selection helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    setSelectedIds(visibleRooms.map((r) => r.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Delete all selected rooms
  const handleDeleteSelected = async () => {
    if (!selectedIds || selectedIds.length === 0) return;
    const proceed = await showConfirm(
      `Xóa ${selectedIds.length} phòng đã chọn và tất cả bản ghi thí sinh liên quan? Hành động không thể hoàn tác.`
    );
    if (!proceed) return;

    setIsSaving(true);
    try {
      const toDelete = visibleRooms.filter((r) => selectedIds.includes(r.id));
      let totalDeleted = 0;
      let totalStudentsDeleted = 0;

      for (const r of toDelete) {
        try {
          const matches = await getMatchingRoomDocs({
            examDate: r.examDate,
            subject: r.subject,
            examSession: r.examSession,
            examTime: r.examTime,
            examRoom: r.examRoom,
            examType: r.examType,
          });

          for (const doc of matches) {
            try {
              await deleteRoomInfor(doc.id);
              totalDeleted++;
            } catch (e) {
              console.warn("Failed to delete room_infor", doc.id, e);
            }
          }

          const criteria = {
            subject: r.subject,
            examSession: r.examSession,
            examTime: r.examTime,
            examRoom: r.examRoom,
          };
          if (r.examDate) criteria.examDate = r.examDate;
          if (r.examType) criteria.examType = r.examType;

          const res = await deleteStudentsByMatch(criteria);
          totalStudentsDeleted += res.deleted || 0;
        } catch (e) {
          console.error("Failed to delete room", r, e);
        }
      }

      alert(
        `Đã xóa ${totalDeleted} phòng và ${totalStudentsDeleted} bản ghi thí sinh.`
      );
      setSelectedIds([]);
    } catch (err) {
      console.error("handleDeleteSelected error", err);
      alert("Lỗi khi xóa. Xem console để biết chi tiết.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to build a unique key for grouping rooms
  const makeKey = (r) => {
    return `${r.examDate || ""}|${r.subject || ""}|${r.examSession || ""}|${
      r.examTime || ""
    }|${r.examRoom || ""}|${r.examType || ""}`;
  };

  // Load data on mount and subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeStudentInfor(
      (data) => {
        // Derive unique rooms from student records
        const computeRoomsFromStudents = (students) => {
          const roomsMap = new Map();
          (students || []).forEach((s) => {
            const key = makeKey(s);
            if (!roomsMap.has(key)) {
              roomsMap.set(key, {
                id: key,
                examDate: s.examDate || "",
                subject: s.subject || "",
                examSession: s.examSession || "",
                examTime: s.examTime || "",
                examRoom: s.examRoom || "",
                examLink: s.examLink || "",
                examType: s.examType || "",
                majorCode: s.majorCode || "",
              });
            }
          });
          return Array.from(roomsMap.values());
        };

        const derived = computeRoomsFromStudents(data);
        setRooms(derived);
        setLoading(false);
      },
      (err) => {
        console.error("subscribeStudentInfor error", err);
        setError("Lỗi khi tải dữ liệu");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {windowWidth < 770 && (
        <DocumentMobileHeader
          selectedCategory={selectedCategory}
          selectedDocument={selectedDocument}
          setIsSidebarOpen={setIsSidebarOpen}
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
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Quản lý thông tin phòng thi
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Lấy dữ liệu trực tiếp từ bảng thí sinh — chỉ hiển thị các
                    trường cần thiết và loại bỏ trùng.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="room-excel-file"
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) handleExcelImport(f);
                      e.target.value = null;
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("room-excel-file")?.click()
                    }
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 5v14m7-7H5"
                      />
                    </svg>
                    Import Excel/CSV
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={
                      !selectedIds || selectedIds.length === 0 || isSaving
                    }
                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow-sm text-sm"
                  >
                    Xóa đã chọn
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      Môn
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      placeholder="Tìm theo phòng"
                      value={filterRoom}
                      onChange={(e) => setFilterRoom(e.target.value)}
                      className="px-3 py-2 rounded-lg border w-full bg-gray-50 dark:bg-gray-900 text-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      Phòng
                    </div>
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      Ca
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Tổng: <strong>{rooms.length}</strong> — Hiển thị:{" "}
                    <strong>{visibleRooms.length}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFilterSubject("");
                        setFilterRoom("");
                        setFilterDate("");
                        setFilterSession("");
                      }}
                      className="px-3 py-1 rounded border text-sm"
                    >
                      Xóa bộ lọc
                    </button>
                    <label className="px-3 py-1 rounded border text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={groupByLink}
                        onChange={(e) => setGroupByLink(e.target.checked)}
                      />
                      Nhóm theo link phòng
                    </label>
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
            ) : windowWidth < 770 ? (
              <div className="space-y-4">
                {visibleRooms.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">Không có dữ liệu</div>
                ) : (
                  visibleRooms.map((r) => (
                    <RoomMobileCard
                      key={r.id}
                      room={r}
                      isDarkMode={isDarkMode}
                      isSelected={selectedIds.includes(r.id)}
                      onToggleSelect={() => toggleSelect(r.id)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => handleDeleteRoom(r)}
                    />
                  ))
                )}
              </div>
            ) : (
              <RoomTable
                loading={loading}
                roomsCount={rooms.length}
                filteredRooms={filteredRooms}
                visibleRooms={visibleRooms}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                selectAllVisible={selectAllVisible}
                clearSelection={clearSelection}
                openEdit={openEdit}
                handleDeleteRoom={handleDeleteRoom}
                groupByLink={groupByLink}
                isSaving={isSaving}
                isDarkMode={isDarkMode}
              />
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

          {/* Excel import progress / result modal */}
          <Modal
            isOpen={importModal.open}
            onClose={() => {
              // only allow closing when done
              if (importModal.done)
                setImportModal((m) => ({ ...m, open: false }));
            }}
            title={importModal.title || "Nhập Excel"}
          >
            <div className="space-y-4">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                {importModal.message}
              </div>
              {!importModal.done && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2"
                      style={{
                        width:
                          importModal.total > 0
                            ? `${Math.round(
                                (importModal.processed / importModal.total) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Đã xử lý: {importModal.processed}/{importModal.total}
                    {importModal.updatedCount
                      ? ` — phòng cập nhật: ${importModal.updatedCount}`
                      : ""}
                    {importModal.studentUpdatedCount
                      ? ` — thí sinh cập nhật: ${importModal.studentUpdatedCount}`
                      : ""}
                  </div>
                </div>
              )}

              {importModal.done && (
                <div className="space-y-4">
                  {/* Show lists of problematic rows for admin inspection */}
                  {importModal.noMatchRows &&
                    importModal.noMatchRows.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Dòng không tìm thấy phòng khớp (
                          {importModal.noMatchRows.length})
                        </div>
                        <div className="mt-2 max-h-48 overflow-auto border rounded p-2 bg-gray-50 dark:bg-gray-900">
                          {importModal.noMatchRows.map((r, i) => (
                            <div
                              key={`nomatch-${i}`}
                              className="mb-2 text-xs text-gray-800 dark:text-gray-200"
                            >
                              <div className="font-semibold">
                                Dòng {r.rowIndex}
                              </div>
                              <div>
                                subject:{" "}
                                {r.mapped?.subject ||
                                  r.keyObj?.subject ||
                                  "(trống)"}{" "}
                                — ca:{" "}
                                {r.mapped?.examSession ||
                                  r.keyObj?.examSession ||
                                  "(trống)"}{" "}
                                — thời gian:{" "}
                                {r.mapped?.examTime ||
                                  r.keyObj?.examTime ||
                                  "(trống)"}{" "}
                                — phòng:{" "}
                                {r.mapped?.examRoom ||
                                  r.keyObj?.examRoom ||
                                  "(trống)"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {importModal.skippedRows &&
                    importModal.skippedRows.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Dòng bị bỏ qua do thiếu trường để đối chiếu (
                          {importModal.skippedRows.length})
                        </div>
                        <div className="mt-2 max-h-48 overflow-auto border rounded p-2 bg-gray-50 dark:bg-gray-900">
                          {importModal.skippedRows.map((r, i) => (
                            <div
                              key={`skipped-${i}`}
                              className="mb-2 text-xs text-gray-800 dark:text-gray-200"
                            >
                              <div className="font-semibold">
                                Dòng {r.rowIndex}
                              </div>
                              <div>
                                Mapped keys:{" "}
                                {Object.keys(r.mapped || {}).length > 0
                                  ? Object.entries(r.mapped)
                                      .map(([k, v]) => `${k}:${String(v)}`)
                                      .join(" | ")
                                  : "(không có trường)"}{" "}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setImportModal((m) => ({ ...m, open: false }))
                      }
                      className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Modal>

          <RoomFormModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditing(null);
              setEditingKey(null);
              setForm(emptyRoom);
            }}
            editing={editing}
            form={form}
            handleChange={handleChange}
            handleSave={handleSave}
            isSaving={isSaving}
            isDarkMode={isDarkMode}
          />

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
