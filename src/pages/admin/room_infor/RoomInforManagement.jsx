import React, { useEffect, useState, useMemo, useRef } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import {
  getAllStudentInfor,
  subscribeStudentInfor,
} from "../../../firebase/studentInforService";
import { updateStudentsByMatch } from "../../../firebase/studentInforService";
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

  const computeRoomsFromStudents = (students = []) => {
    const map = new Map();
    for (const s of students) {
      // build a composite key from the fields we care about (BỎ examTime khỏi key, NHƯNG LUÔN LƯU examTime vào object)
      const key = `${s.examDate || ""}||${s.subject || ""}||${
        s.examSession || ""
      }||${s.examRoom || ""}||${s.examType || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key, // deterministic id for display only
          examDate: s.examDate || "",
          subject: s.subject || "",
          examSession: s.examSession || "",
          examTime: s.examTime || "", // LUÔN LƯU examTime
          examRoom: s.examRoom || "",
          examType: s.examType || "",
          examLink: s.examLink || "",
        });
      } else {
        // prefer non-empty examLink if current has none
        const existing = map.get(key);
        if ((!existing.examLink || existing.examLink === "") && s.examLink)
          existing.examLink = s.examLink;
        // prefer non-empty examTime if current has none
        if ((!existing.examTime || existing.examTime === "") && s.examTime)
          existing.examTime = s.examTime;
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

  // BỎ examTime khỏi key
  const makeKey = (r) =>
    `${r.examDate || ""}||${r.subject || ""}||${r.examSession || ""}||${r.examRoom || ""}||${r.examType || ""}`;

  const getMatchingRoomDocs = async (roomObj) => {
    try {
      const all = await getAllRoomInfor();

      // Match by subject, examSession, examRoom (normalized). BỎ examTime. Only require examDate when it's provided in roomObj.
      return all.filter((d) => {
        try {
          const norm = (v) => normalizeForSearch(String(v || "")).trim();
          let logReason = [];
          // if caller provided examDate (non-empty), require date equality (normalized YMD)
          if (roomObj.examDate) {
            const a = parseDateToYMD(roomObj.examDate || "");
            const b = parseDateToYMD(d.examDate || "");
            if (a !== b) {
              logReason.push(`examDate not match: excel=${a}, db=${b}`);
              // not return yet, let log all reasons
            }
          }
          if (norm(d.subject) !== norm(roomObj.subject)) {
            logReason.push(`subject not match: excel=${norm(roomObj.subject)}, db=${norm(d.subject)}`);
          }
          if (norm(d.examSession) !== norm(roomObj.examSession)) {
            logReason.push(`examSession not match: excel=${norm(roomObj.examSession)}, db=${norm(d.examSession)}`);
          }
          if (norm(d.examRoom) !== norm(roomObj.examRoom)) {
            logReason.push(`examRoom not match: excel=${norm(roomObj.examRoom)}, db=${norm(d.examRoom)}`);
          }
          if (roomObj.examType && norm(d.examType) !== norm(roomObj.examType)) {
            logReason.push(`examType not match: excel=${norm(roomObj.examType)}, db=${norm(d.examType)}`);
          }
          if (logReason.length > 0) {
            console.warn('[RoomImport][NoMatch]', {
              excel: roomObj,
              db: d,
              reasons: logReason
            });
            return false;
          }
          return true;
        } catch (e) {
          console.error('[RoomImport][ErrorMatching]', e);
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
            `${r.examDate}||${r.subject}||${r.examSession}||${r.examTime}||${r.examRoom}||${r.examType}`
        )
      );

      // From students, build unique room candidates
      const candidatesMap = new Map();
      for (const s of students) {
        const key = `${s.examDate || ""}||${s.subject || ""}||${
          s.examSession || ""
        }||${s.examTime || ""}||${s.examRoom || ""}||${s.examType || ""}`;
        if (!key) continue;
        // skip empty key
        if (!candidatesMap.has(key)) {
          candidatesMap.set(key, {
            examDate: s.examDate || "",
            subject: s.subject || "",
            examSession: s.examSession || "",
            examTime: s.examTime || "",
            examRoom: s.examRoom || "",
            examType: s.examType || "",
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
      console.info("handleExcelImport: headerMap", headerMap);

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

        if (
          !keyObj.subject &&
          !keyObj.examSession &&
          !keyObj.examTime &&
          !keyObj.examRoom
        ) {
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
          examTime: normalizeForSearch(keyObj.examTime || "").trim(),
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
        if ((!matches || matches.length === 0) && (normKeyObj.examRoom || rowLink)) {
          try {
            const allRooms = await getAllRoomInfor();
            const norm = (v) => normalizeForSearch(String(v || "")).trim();
            const roomCandidates = allRooms.filter((d) => {
              try {
                const dbRoomNorm = norm(d.examRoom);
                const dbLinkNorm = normalizeForSearch(d.examLink || "").trim();
                const roomMatch = normKeyObj.examRoom ? dbRoomNorm === normKeyObj.examRoom : false;
                const linkMatch = rowLink ? dbLinkNorm === normalizeForSearch(rowLink) : false;
                // also allow matching numeric room when input contains number but DB room has extra text
                if (!roomMatch && normKeyObj.examRoom) {
                  const digitsInDb = (dbRoomNorm || '').match(/\d+/g) || [];
                  const digitsInInput = (normKeyObj.examRoom || '').match(/\d+/g) || [];
                  if (digitsInDb.length && digitsInInput.length && digitsInDb.join('') === digitsInInput.join('')) {
                    return true;
                  }
                }
                return roomMatch || linkMatch;
              } catch (e) {
                return false;
              }
            });
            if (roomCandidates && roomCandidates.length > 0) {
              console.info('[RoomImport][RelaxedMatch] found', roomCandidates.length, 'candidates for row', rowCount);
              matches = roomCandidates;
            }
          } catch (e) {
            console.warn('handleExcelImport: relaxed matching failed', e);
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
                examTime: keyObj.examTime,
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
                examTime: doc.examTime,
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
        // update all room_infor docs that match the original composite key
        const matches = await getMatchingRoomDocs({
          examDate: editing.examDate,
          subject: editing.subject,
          examSession: editing.examSession,
          examTime: editing.examTime,
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
            console.error('Failed to create room_infor document', e);
          }
        } else {
          for (const doc of matches) {
            try {
              await updateRoomInfor(doc.id, { ...form });
              // push a representation of the updated doc (use form values for current state)
              affectedDocs.push({ id: doc.id, ...form });
            } catch (e) {
              console.error('Failed to update room_infor document', doc.id, e);
            }
          }
        }

        // Additionally, update student_infor documents so they reflect the room edits.
        // We'll do two passes:
        // 1) Update students that matched the original (editing) key so they get new values.
        // 2) Update students that match the saved/updated room documents (affectedDocs) so missing fields
        //    like examDate/examLink are propagated.
        try {
          // PASS 1: update students that matched the original editing key
          const origCriteria = {
            subject: editing.subject,
            examSession: editing.examSession,
            examTime: editing.examTime,
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
            const res = await updateStudentsByMatch(origCriteria, updatesFromForm, {
              allowBulk: true,
              force: true,
            });
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
              if (res2 && typeof res2.updated === "number" && res2.updated > 0) {
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
                    <strong>{filteredRooms.length}</strong>
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
                    <button
                      onClick={importFromStudents}
                      className="px-3 py-1 rounded border text-sm"
                    >
                      Nhập từ thí sinh
                    </button>
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
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 md:overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Tổng: <strong>{rooms.length}</strong>
                    </div>
                  </div>
                  <table className="min-w-max table-auto">
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
                            {/* examType column hidden as requested */}
                            <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 break-all">
                              {r.examLink ? (
                                <a
                                  href={r.examLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline break-words"
                                >
                                  {r.examLink}
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
