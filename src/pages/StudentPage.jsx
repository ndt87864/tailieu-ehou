import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import LoadingSpinner from "../components/LoadingSpinner";
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

const columns = [
  { key: "studentId", label: "Mã sv" },
  { key: "fullName", label: "Họ và tên" },
  { key: "dob", label: "Ngày sinh" },
  { key: "examDate", label: "Ngày thi" },
  { key: "subject", label: "Tên môn học" },
  { key: "examSession", label: "Ca thi" },
  { key: "examTime", label: "Thời gian" },
  { key: "examRoom", label: "Phòng thi" },
  { key: "course", label: "Khóa" },
  { key: "majorCode", label: "Mã ngành" },
  { key: "examType", label: "Hình thức thi" },
  { key: "examLink", label: "Link phòng" },
];

const StudentPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
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
        (r.fullName && normalizeForSearch(r.fullName).includes(q))
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
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <HomeMobileHeader
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
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

        <div className="theme-content-container flex-1 min-w-0 shadow-sm flex flex-col">
          {windowWidth >= 770 && (
            <div className="w-full">
              <UserHeader
                title="Danh sách thí sinh"
                setIsSidebarOpen={setIsSidebarOpen}
                setIsThemePickerOpen={setIsThemePickerOpen}
              />
            </div>
          )}

          <div className="flex-1 p-6 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-white">
                Danh sách thí sinh
              </h1>

              <div className="flex items-center gap-3">
                <div className="w-64">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo mã sv hoặc họ và tên"
                    className={`w-full px-3 py-2 rounded border focus:outline-none sm:text-sm ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-300"
                        : "bg-white border-gray-300 placeholder-gray-500"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const XLSX = await import("xlsx");
                        const data = filtered.map((r) => ({
                          "Mã sv": r.studentId || "",
                          "Họ và tên": r.fullName || "",
                          "Ngày sinh": formatDate(r.dob) || "",
                          "Tên môn học": r.subject || "",
                          "Ca thi": r.examSession || "",
                          "Thời gian": r.examTime || "",
                          "Phòng thi": r.examRoom || "",
                          Khóa: r.course || "",
                          "Mã ngành": r.majorCode || "",
                          "Hình thức thi": r.examType || "",
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
                        alert("Lỗi export XLSX: " + (e?.message || e));
                      }
                    }}
                    className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Export XLSX
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 text-red-600">Có lỗi: {String(error)}</div>
            )}

            <div className="mx-auto w-full md:w-[90%] max-w-full">
              {/* Mobile optimized view: stacked cards for small screens */}
              {windowWidth < 770 ? (
                <div className="p-3 space-y-3">
                  <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                    Hiển thị <strong>{showingFrom}</strong> -{" "}
                    <strong>{showingTo}</strong> của{" "}
                    <strong>{filtered.length}</strong> bản ghi
                  </div>
                  {filtered.length === 0 ? (
                    <div className="p-4 text-center">Không có bản ghi nào</div>
                  ) : (
                    paged.map((r) => (
                      <div
                        key={r.id}
                        className={`p-3 bg-transparent border rounded-lg  bg-white dark:bg-gray-800 rounded shadow shadow-sm ${
                          isDarkMode ? "border-gray-800" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {r.fullName || "-"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              Mã sv: {r.studentId || "-"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              Ngày thi:{" "}
                              {formatDate(r.examDate) || (
                                <span className="text-sm text-gray-500">
                                  chưa cập nhật
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-3">
                            {formatDate(r.dob) || ""}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <div>
                            <span className="font-medium">Môn:</span>{" "}
                            {r.subject || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Ca:</span>{" "}
                            {r.examSession || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Giờ:</span>{" "}
                            {r.examTime || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Phòng:</span>{" "}
                            {r.examRoom || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Khóa:</span>{" "}
                            {r.course || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Mã ngành:</span>{" "}
                            {r.majorCode || "-"}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Hình thức:</span>{" "}
                            {r.examType || "-"}
                          </div>

                          <div className="col-span-2">
                            <span className="font-medium">Link phòng:</span>{" "}
                            {r.examLink ? (
                              <a
                                href={r.examLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline break-all"
                              >
                                {r.examLink}
                              </a>
                            ) : (
                              "-"
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
                            Không có bản ghi nào
                          </td>
                        </tr>
                      )}

                      {paged.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.studentId || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.fullName || ""}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {formatDate(r.dob) || (
                              <span className="text-sm text-gray-500">
                                chưa cập nhật
                              </span>
                            )}
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
                            {r.examTime || ""}
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
                            {r.examType || ""}
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
                  className="px-2 py-1 border rounded-md text-sm"
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
                        ? "bg-gray-200 text-gray-400"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border"
                    }`}
                  >
                    &laquo; Prev
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
                        ? "bg-gray-200 text-gray-400"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border"
                    }`}
                  >
                    Next &raquo;
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
