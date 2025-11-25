import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import LoadingSpinner from "../components/content/LoadingSpinner";
import { subscribeStudentInfor } from "../firebase/studentInforService";
import { getAllCategoriesWithDocuments } from "../firebase/firestoreService";
import {
  formatDate,
  normalizeForSearch,
} from "./admin/student_infor/studentInforHelpers";
import Sidebar from "../components/Sidebar";
import UserHeader from "../components/UserHeader";
import { HomeMobileHeader } from "../components/MobileHeader";
import Footer from "../components/Footer";
import ThemeColorPicker from "../components/ThemeColorPicker";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebase";
import "../styles/document-view.css";

// Hide studentId, dob, examType columns from user-facing table
const columns = [
  { key: "fullName", label: "Họ và tên" },
  { key: "username", label: "Tài khoản" },
  { key: "examDate", label: "Ngày thi" },
  { key: "subject", label: "Tên môn học" },
  { key: "examSession", label: "Ca thi" },
  { key: "examRoom", label: "Phòng thi" },
  { key: "course", label: "Khóa" },
  { key: "majorCode", label: "Mã ngành" },
  { key: "examLink", label: "Link phòng" },
];

const StudentPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const { isDarkMode } = useTheme();
  const [sidebarData, setSidebarData] = useState([]);
  const [documents, setDocuments] = useState({});
  const [openMain, setOpenMain] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [user] = useAuthState(auth);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeStudentInfor(
      (data) => {
        setRows(data || []);
        setLoading(false);
      },
      (err) => {
        console.error("subscribeStudentInfor error", err);
        setError(err?.message || "Lỗi khi tải dữ liệu");
        setLoading(false);
      }
    );

    return () => unsub && typeof unsub === "function" && unsub();
  }, []);

  // If navigated here with ?query=..., prefill the search input.
  // This uses URL params only to set the local search state — we do NOT run
  // any additional Firestore query here; filtering is client-side on `rows`.
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const q = params.get("query") || "";
      if (q && q !== search) {
        setSearch(q);
        setPendingSearch(q);
      }
    } catch (e) {
      // ignore malformed URL
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Load sidebar categories + documents so sidebar shows the usual category list
  useEffect(() => {
    let mounted = true;
    const loadSidebar = async () => {
      try {
        const cats = await getAllCategoriesWithDocuments();
        if (!mounted) return;
        setSidebarData(cats || []);
        // build documents mapping by category id
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

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = normalizeForSearch(search);
    return rows.filter((r) => {
      return (
        (r.studentId && normalizeForSearch(r.studentId).includes(q)) ||
        (r.fullName && normalizeForSearch(r.fullName).includes(q)) ||
        (r.username && normalizeForSearch(r.username).includes(q))
      );
    });
  }, [rows, search]);

  // Pagination (client-side) similar to admin management pages
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    // reset to first page whenever the filtered list changes
    setCurrentPage(1);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / limit));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  const startIndex = (currentPage - 1) * limit;
  const paged = (filtered || []).slice(startIndex, startIndex + limit);
  const showingFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(filtered.length, startIndex + limit);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="theme-consistent-wrapper">
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <HomeMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
          title="Danh sách thí sinh"
        />
      )}

      <div className="flex min-h-screen w-full">
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
          />
        </div>

        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div
          className={`theme-content-container document-view-container flex-1 shadow-sm flex flex-col ${
            isDarkMode ? "dark" : "light"
          }`}
        >
          {windowWidth >= 770 && (
            <div className="w-full">
              <UserHeader
                title="Danh sách thí sinh"
                setIsSidebarOpen={setIsSidebarOpen}
                setIsThemePickerOpen={setIsThemePickerOpen}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 px-4 mt-6">
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-slate-500"
                }`}
              >
                {loading
                  ? ""
                  : `Hiển thị từ ${showingFrom} đến ${showingTo} trong tổng số ${filtered.length} thí sinh`}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Mobile Excel button */}
                {windowWidth < 770 && (
                  <button
                    onClick={async () => {
                      try {
                        const XLSX = await import("xlsx");
                        // Export only visible fields (hide studentId, dob, examType)
                        const data = filtered.map((r) => ({
                          "Họ và tên": r.fullName || "",
                          "Tài khoản": r.username || "",
                          "Tên môn học": r.subject || "",
                          "Ca thi": r.examSession || "",
                          "Phòng thi": r.examRoom || "",
                          Khóa: r.course || "",
                          "Mã ngành": r.majorCode || "",
                          "Link phòng": r.examLink || "",
                        }));
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.json_to_sheet(data);
                        XLSX.utils.book_append_sheet(
                          wb,
                          ws,
                          "Danh sách thí sinh"
                        );
                        const wbout = XLSX.write(wb, {
                          bookType: "xlsx",
                          type: "array",
                        });
                        const blob = new Blob([wbout], {
                          type: "application/octet-stream",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `students_${new Date()
                          .toISOString()
                          .slice(0, 19)
                          .replace(/[:T]/g, "-")}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        console.error("Export XLSX failed", e);
                        alert("Lỗi xuất file excel: " + (e?.message || e));
                      }
                    }}
                    className={`action-btn flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors text-sm ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg"
                    }`}
                    disabled={loading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Tải Excel</span>
                  </button>
                )}
                {windowWidth >= 770 && (
                  <button
                    onClick={async () => {
                      try {
                        const XLSX = await import("xlsx");
                        // Export only visible fields (hide studentId, dob, examType)
                        const data = filtered.map((r) => ({
                          "Họ và tên": r.fullName || "",
                          "Tài khoản": r.username || "",
                          "Tên môn học": r.subject || "",
                          "Ca thi": r.examSession || "",
                          "Phòng thi": r.examRoom || "",
                          Khóa: r.course || "",
                          "Mã ngành": r.majorCode || "",
                          "Link phòng": r.examLink || "",
                        }));
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.json_to_sheet(data);
                        XLSX.utils.book_append_sheet(
                          wb,
                          ws,
                          "Danh sách thí sinh"
                        );
                        const wbout = XLSX.write(wb, {
                          bookType: "xlsx",
                          type: "array",
                        });
                        const blob = new Blob([wbout], {
                          type: "application/octet-stream",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `students_${new Date()
                          .toISOString()
                          .slice(0, 19)
                          .replace(/[:T]/g, "-")}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        console.error("Export XLSX failed", e);
                        alert("Lỗi xuất file excel: " + (e?.message || e));
                      }
                    }}
                    className={`action-btn flex items-center gap-1 px-3 py-2 rounded-md text-white transition-colors ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    disabled={loading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-9 w-9"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Excel</span>
                  </button>
                )}
                <div className="search-container relative group w-full sm:w-auto">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nhập họ và tên,tên tài khoản"
                      value={pendingSearch}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPendingSearch(v);
                        if (v === "") {
                          setSearch("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSearch(pendingSearch);
                        }
                      }}
                      disabled={loading}
                      className={`w-full md:w-80 pl-12 pr-4 py-3 text-sm rounded-xl border-0 outline-none transition-all duration-300 ease-in-out shadow-lg backdrop-blur-md ${
                        isDarkMode
                          ? "bg-gray-800/80 text-gray-100 placeholder-gray-400 border-gray-600/50 hover:bg-gray-700/90 hover:border-gray-500/70 focus:bg-gray-700/95 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/70"
                          : "bg-white/80 text-gray-900 placeholder-gray-500 border-gray-200/50 hover:bg-white/95 hover:border-gray-300/70 focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/70"
                      } ${
                        loading
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-xl focus:shadow-xl"
                      }`}
                    />
                    <div
                      className={`absolute top-1/2 left-0 pl-4 transform -translate-y-1/2 flex items-center pointer-events-none transition-colors duration-200 ${
                        isDarkMode
                          ? "text-gray-400 group-hover:text-gray-300"
                          : "text-gray-500 group-hover:text-gray-600"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 transition-colors duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    {pendingSearch && (
                      <button
                        onClick={() => {
                          setPendingSearch("");
                          setSearch("");
                        }}
                        className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-all duration-200 ${
                          isDarkMode
                            ? "text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                        } rounded-r-xl`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  {pendingSearch && (
                    <div
                      className={`absolute top-full mt-2 left-0 right-0 md:right-auto md:w-80 p-3 rounded-lg shadow-lg backdrop-blur-md border transition-all duration-200 ${
                        isDarkMode
                          ? "bg-gray-800/95 border-gray-600/50 text-gray-200"
                          : "bg-white/95 border-gray-200/50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          Tìm thấy <strong>{filtered.length}</strong> kết quả
                        </span>
                        <button
                          onClick={() => {
                            setPendingSearch("");
                            setSearch("");
                          }}
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            isDarkMode
                              ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 text-red-600">Có lỗi: {String(error)}</div>
            )}

            <div className="mx-auto w-full md:w-[90%] max-w-full">
              {/* Mobile optimized view: stacked cards for small screens */}
              {windowWidth < 770 ? (
                <div className="p-3 space-y-4">
                  {filtered.length === 0 ? (
                    <div className="p-8 text-center rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 mx-auto mb-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3
                        className={`text-lg font-medium ${
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        Không có bản ghi nào
                      </h3>
                      <p
                        className={`mt-2 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Không tìm thấy thí sinh nào phù hợp với tiêu chí tìm
                        kiếm.
                      </p>
                    </div>
                  ) : (
                    paged.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                              {r.fullName || "-"}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                              Tài khoản: {r.username || "-"}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Ngày thi:{" "}
                              {formatDate(r.examDate) || (
                                <span className="text-gray-500">
                                  chưa cập nhật
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                              Môn học
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {r.subject || "-"}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                              Ca thi
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {r.examSession || "-"}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                              Phòng thi
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {r.examRoom || "-"}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                              Khóa
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {r.course || "-"}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                              Mã ngành
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {r.majorCode || "-"}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 col-span-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">
                              Link phòng
                            </span>
                            {r.examLink ? (
                              <a
                                href={r.examLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm"
                              >
                                {r.examLink}
                              </a>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-max table-auto divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {columns.map((c) => (
                          <th
                            key={c.key}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filtered.length === 0 && (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="p-4 text-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-16 w-16 mx-auto mb-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <h3
                              className={`text-lg font-medium ${
                                isDarkMode ? "text-gray-200" : "text-gray-700"
                              }`}
                            >
                              Không có bản ghi nào
                            </h3>
                            <p
                              className={`mt-2 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Không tìm thấy thí sinh nào phù hợp với tiêu chí
                              tìm kiếm.
                            </p>
                          </td>
                        </tr>
                      )}

                      {paged.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.fullName || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.username || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {formatDate(r.examDate) || (
                              <span className="text-sm text-gray-500">
                                chưa cập nhật
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.subject || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.examSession || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.examRoom || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.course || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.majorCode || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.examLink ? (
                              <a
                                href={r.examLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-green-600 hover:underline break-all"
                              >
                                {r.examLink}
                              </a>
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-center md:justify-between w-full md:w-[90%] mx-auto">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-300">
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
                      ? "bg-gray-800 border-gray-600 text-gray-200"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={`px-3 py-1 rounded-md ${
                      currentPage <= 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border ${
                            isDarkMode
                              ? "border-gray-600 hover:bg-gray-700"
                              : "border-gray-300 hover:bg-gray-50"
                          }`
                    }`}
                  >
                    &laquo; Trước
                  </button>

                  <div className="text-sm text-gray-700 dark:text-gray-200 px-2">
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
                        : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border ${
                            isDarkMode
                              ? "border-gray-600 hover:bg-gray-700"
                              : "border-gray-300 hover:bg-gray-50"
                          }`
                    }`}
                  >
                    Sau &raquo;
                  </button>
                </div>
              </div>
            </div>
          </div>

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

export default StudentPage;
