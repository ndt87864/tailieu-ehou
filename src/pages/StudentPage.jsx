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
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-slate-100"}`}>
      {/* Mobile Header */}
      {windowWidth < 770 && (
        <HomeMobileHeader setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
      )}

      <div className="flex min-h-screen w-full">
        <div
          className={`theme-sidebar ${
            windowWidth < 770
              ? `fixed inset-y-0 left-0 z-20 transition-all duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
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
          <div className="fixed inset-0 z-10 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
        )}

  <div className="theme-content-container flex-1 min-w-0 shadow-sm flex flex-col">
          {windowWidth >= 770 && (
            <div className="w-full">
              <UserHeader title="Danh sách thí sinh" setIsSidebarOpen={setIsSidebarOpen} setIsThemePickerOpen={setIsThemePickerOpen} />
            </div>
          )}

          <div className="flex-1 p-6 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-white">Danh sách thí sinh</h1>
              <div className="w-80">
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
            </div>

            {error && <div className="mb-4 text-red-600">Có lỗi: {String(error)}</div>}

            <div className="mx-auto w-full md:w-[90%] max-w-full bg-white dark:bg-gray-800 rounded shadow">
              {/* Mobile optimized view: stacked cards for small screens */}
              {windowWidth < 770 ? (
                <div className="p-3 space-y-3">
                  {filtered.length === 0 ? (
                    <div className="p-4 text-center">Không có bản ghi nào</div>
                  ) : (
                    filtered.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {r.fullName || "-"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">Mã sv: {r.studentId || "-"}</div>
                          </div>
                          <div className="text-xs text-gray-400 ml-3">{formatDate(r.dob) || ""}</div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <div><span className="font-medium">Môn:</span> {r.subject || "-"}</div>
                          <div><span className="font-medium">Ca:</span> {r.examSession || "-"}</div>
                          <div><span className="font-medium">Giờ:</span> {r.examTime || "-"}</div>
                          <div><span className="font-medium">Phòng:</span> {r.examRoom || "-"}</div>
                          <div><span className="font-medium">Khóa:</span> {r.course || "-"}</div>
                          <div><span className="font-medium">Mã ngành:</span> {r.majorCode || "-"}</div>
                          <div className="col-span-2"><span className="font-medium">Hình thức:</span> {r.examType || "-"}</div>

                          <div className="col-span-2">
                            <span className="font-medium">Link phòng:</span>{' '}
                            {r.examLink ? (
                              <a href={r.examLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                                {r.examLink}
                              </a>
                            ) : (
                              '-'
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
                          <td colSpan={columns.length} className="p-4 text-center">
                            Không có bản ghi nào
                          </td>
                        </tr>
                      )}

                      {filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.studentId || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.fullName || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{formatDate(r.dob) || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.subject || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.examSession || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.examTime || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.examRoom || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.course || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.majorCode || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.examType || ""}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            {r.examLink ? (
                              <a href={r.examLink} target="_blank" rel="noreferrer" className="text-green-600 hover:underline break-all">
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
          </div>

          <Footer />
        </div>
      </div>

      <ThemeColorPicker isOpen={isThemePickerOpen} onClose={() => setIsThemePickerOpen(false)} />
    </div>
  );
};

export default StudentPage;
