import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "../../context/UserRoleContext";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import UserHeader from "../../components/UserHeader";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import Sidebar from "../../components/Sidebar";
import ThemeColorPicker from "../../components/ThemeColorPicker";

const CalendarNoteManagement = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // State for calendar notes
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastVisible, setLastVisible] = useState(null); // For pagination
  const [hasMore, setHasMore] = useState(true); // To check if there are more documents
  const [isFetchingMore, setIsFetchingMore] = useState(false); // To prevent multiple fetches

  const NOTES_PER_PAGE = 10;

  // State for add/edit modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [noteForm, setNoteForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    important: false,
  });

  // State for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for sidebar elements
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!user && !loading) {
      navigate("/login");
    } else if (!isAdmin && !loading) {
      navigate("/");
    }

    // Initial fetch of calendar notes
    fetchCalendarNotes(true); // Pass true for initial load

    // Add window resize handler
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 100 &&
        hasMore &&
        !loading &&
        !isFetchingMore &&
        searchQuery === ""
      ) {
        fetchCalendarNotes();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, isFetchingMore, searchQuery]);

  const fetchCalendarNotes = async (initialLoad = false) => {
    if ((!hasMore && !initialLoad) || isFetchingMore) return;

    try {
      setIsFetchingMore(true);
      setLoading(true);

      let notesQuery = query(
        collection(db, "calendar_notes"),
        orderBy("date", "desc"),
        limit(NOTES_PER_PAGE)
      );

      if (!initialLoad && lastVisible) {
        notesQuery = query(
          collection(db, "calendar_notes"),
          orderBy("date", "desc"),
          startAfter(lastVisible),
          limit(NOTES_PER_PAGE)
        );
      }

      const snapshot = await getDocs(notesQuery);

      const newNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date,
      }));

      setCalendarNotes((prevNotes) =>
        initialLoad ? newNotes : [...prevNotes, ...newNotes]
      );
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(newNotes.length === NOTES_PER_PAGE);
      setLoading(false);
      setIsFetchingMore(false);
    } catch (error) {
      console.error("Error fetching calendar notes:", error);
      setError("Không thể tải ghi chú lịch. Vui lòng thử lại sau.");
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNoteForm({
      ...noteForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddNote = async (e) => {
    e.preventDefault();

    try {
      const newNote = {
        ...noteForm,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "calendar_notes"), newNote);
      setShowNoteModal(false);
      setSuccess("Thêm ghi chú lịch thành công!");
      // Re-fetch all notes from the beginning to include the new one
      setCalendarNotes([]); // Clear existing notes
      setLastVisible(null); // Reset pagination
      setHasMore(true);
      fetchCalendarNotes(true);

      // Reset form
      setNoteForm({
        title: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        important: false,
      });

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error adding calendar note:", error);
      setError("Không thể thêm ghi chú lịch. Vui lòng thử lại sau.");

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleEditNote = async (e) => {
    e.preventDefault();

    try {
      const noteRef = doc(db, "calendar_notes", noteToEdit.id);
      await updateDoc(noteRef, {
        ...noteForm,
        updatedAt: new Date(),
      });

      setShowNoteModal(false);
      setSuccess("Cập nhật ghi chú lịch thành công!");
      // Re-fetch all notes from the beginning to reflect the update
      setCalendarNotes([]); // Clear existing notes
      setLastVisible(null); // Reset pagination
      setHasMore(true);
      fetchCalendarNotes(true);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error updating calendar note:", error);
      setError("Không thể cập nhật ghi chú lịch. Vui lòng thử lại sau.");

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleDeleteNote = async () => {
    try {
      setIsDeleting(true);
      const noteRef = doc(db, "calendar_notes", noteToDelete.id);
      await deleteDoc(noteRef);

      setShowDeleteModal(false);
      setSuccess("Xóa ghi chú lịch thành công!");
      // Re-fetch all notes from the beginning to reflect the deletion
      setCalendarNotes([]); // Clear existing notes
      setLastVisible(null); // Reset pagination
      setHasMore(true);
      fetchCalendarNotes(true);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting calendar note:", error);
      setError("Không thể xóa ghi chú lịch. Vui lòng thử lại sau.");

      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddNoteModal = () => {
    setIsEditing(false);
    setNoteForm({
      title: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      important: false,
    });
    setShowNoteModal(true);
  };

  const openEditNoteModal = (note) => {
    setIsEditing(true);
    setNoteToEdit(note);
    setNoteForm({
      title: note.title,
      date: note.date,
      description: note.description || "",
      important: note.important || false,
    });
    setShowNoteModal(true);
  };

  const openDeleteModal = (note) => {
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  // Filter notes based on search query
  // When search query is active, we fetch all notes that match the query
  // This means pagination is temporarily disabled for search results
  const filteredNotes = searchQuery
    ? calendarNotes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : calendarNotes;

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("vi-VN", options);
  };

  // Format description for display with 20 character limit per line
  const formatDescription = (text) => {
    if (!text) return "";
    const chunks = [];
    for (let i = 0; i < text.length; i += 20) {
      chunks.push(text.substring(i, i + 20));
    }
    return chunks.join("\n");
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {windowWidth < 770 && (
        <DocumentMobileHeader
          selectedCategory={{ title: "Quản trị" }}
          selectedDocument={{ title: "Quản lý lịch" }}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="flex min-h-screen">
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
          />
        </div>

        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        <div className="flex-1 overflow-hidden">
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                title="Quản lý lịch"
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}

          <main
            className={`p-4 md:p-6 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    Quản lý ghi chú lịch
                  </h1>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Thêm, sửa và xóa các ghi chú hiển thị trong lịch
                  </p>
                </div>

                <div className="mt-4 md:mt-0">
                  <button
                    onClick={openAddNoteModal}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                      isDarkMode
                        ? "bg-green-700 hover:bg-green-600 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    } transition-colors shadow-sm`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    Thêm ghi chú lịch
                  </button>
                </div>
              </div>

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

              {success && (
                <div
                  className={`px-4 py-3 rounded-md border ${
                    isDarkMode
                      ? "bg-green-900/30 border-green-800 text-green-300"
                      : "bg-green-100 border-green-400 text-green-700"
                  } mb-4`}
                >
                  <span>{success}</span>
                </div>
              )}

              {/* Search */}
              <div className="mb-6">
                <div
                  className={`relative rounded-lg overflow-hidden ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } shadow-sm`}
                >
                  <input
                    type="text"
                    placeholder="Tìm kiếm ghi chú lịch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-4 py-3 pl-10 ${
                      isDarkMode
                        ? "bg-gray-800 text-white placeholder-gray-400 border-gray-700"
                        : "bg-white text-gray-900 placeholder-gray-500 border-gray-200"
                    } border-0 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className={`w-5 h-5 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Calendar Notes List */}
              <div className="w-full overflow-hidden rounded-lg shadow-md">
                <div
                  className={`${
                    isDarkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white"
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
                      Danh sách ghi chú lịch
                    </h3>
                    <p
                      className={`mt-1 text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {loading
                        ? "Đang tải..."
                        : `Hiển thị ${filteredNotes.length} ghi chú lịch`}
                    </p>
                  </div>

                  {loading && filteredNotes.length === 0 ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                      <p
                        className={`mt-2 text-sm font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {searchQuery
                          ? "Không tìm thấy ghi chú lịch nào phù hợp"
                          : "Chưa có ghi chú lịch nào"}
                      </p>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {searchQuery
                          ? "Thử tìm kiếm với từ khóa khác"
                          : 'Nhấn nút "Thêm ghi chú lịch" để tạo ghi chú mới'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table
                        className={`min-w-full divide-y ${
                          isDarkMode ? "divide-gray-700" : "divide-gray-200"
                        }`}
                      >
                        <thead>
                          <tr
                            className={
                              isDarkMode ? "bg-gray-700/30" : "bg-gray-50"
                            }
                          >
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Tiêu đề
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Ngày
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Trạng thái
                            </th>
                            <th
                              scope="col"
                              className={`sticky top-0 px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                                isDarkMode
                                  ? "text-gray-300 bg-gray-700/50"
                                  : "text-gray-500 bg-gray-50"
                              }`}
                            >
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            isDarkMode ? "divide-gray-700" : "divide-gray-200"
                          }`}
                        >
                          {filteredNotes.map((note) => (
                            <tr
                              key={note.id}
                              className={
                                isDarkMode
                                  ? "hover:bg-gray-700/30"
                                  : "hover:bg-gray-50"
                              }
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`flex items-center`}>
                                  <div
                                    className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md ${
                                      note.important
                                        ? isDarkMode
                                          ? "bg-red-900/40 text-red-300"
                                          : "bg-red-100 text-red-600"
                                        : isDarkMode
                                        ? "bg-gray-700 text-gray-300"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    <svg
                                      className="h-6 w-6"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                  <div className="ml-4">
                                    <div
                                      className={`text-sm font-medium ${
                                        isDarkMode
                                          ? "text-white"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {note.title}
                                    </div>
                                    {note.description && (
                                      <div
                                        className={`text-sm ${
                                          isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                        }`}
                                        style={{
                                          whiteSpace: "pre-line",
                                          lineHeight: "1.2",
                                        }}
                                      >
                                        {formatDescription(note.description)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div
                                  className={`text-sm ${
                                    isDarkMode
                                      ? "text-gray-300"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {formatDate(note.date)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    note.important
                                      ? isDarkMode
                                        ? "bg-red-900/30 text-red-300"
                                        : "bg-red-100 text-red-800"
                                      : isDarkMode
                                      ? "bg-green-900/30 text-green-300"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {note.important ? "Quan trọng" : "Thường"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => openEditNoteModal(note)}
                                    className={`inline-flex items-center p-1.5 rounded-md ${
                                      isDarkMode
                                        ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                                        : "text-blue-600 hover:bg-gray-100 hover:text-blue-700"
                                    }`}
                                    title="Chỉnh sửa ghi chú"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      ></path>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(note)}
                                    className={`inline-flex items-center p-1.5 rounded-md ${
                                      isDarkMode
                                        ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                                        : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                                    }`}
                                    title="Xóa ghi chú"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {isFetchingMore && (
                        <div className="flex justify-center items-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />

      {/* Add/Edit Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {isEditing
                      ? "Chỉnh sửa ghi chú lịch"
                      : "Thêm ghi chú lịch mới"}
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowNoteModal(false)}
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                <form onSubmit={isEditing ? handleEditNote : handleAddNote}>
                  <div className="mb-5">
                    <label
                      htmlFor="title"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tiêu đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={noteForm.title}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập tiêu đề ghi chú"
                      required
                    />
                  </div>

                  <div className="mb-5">
                    <label
                      htmlFor="date"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Ngày <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      id="date"
                      value={noteForm.date}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>

                  <div className="mb-5">
                    <label
                      htmlFor="description"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Mô tả
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      value={noteForm.description}
                      onChange={handleInputChange}
                      rows="3"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập mô tả chi tiết "
                    ></textarea>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="important"
                        id="important"
                        checked={noteForm.important}
                        onChange={handleInputChange}
                        className={`h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                          isDarkMode ? "bg-gray-700 border-gray-600" : ""
                        }`}
                      />
                      <label
                        htmlFor="important"
                        className={`ml-2 block text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Đánh dấu là quan trọng
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={isEditing ? handleEditNote : handleAddNote}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isDarkMode
                      ? "bg-green-700 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                      : "bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  }`}
                >
                  {isEditing ? "Cập nhật" : "Thêm ghi chú"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Xác nhận xóa ghi chú
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-4`}
                >
                  Bạn có chắc chắn muốn xóa ghi chú này không? Hành động này
                  không thể hoàn tác.
                </p>

                {noteToDelete && (
                  <div
                    className={`p-4 rounded-md ${
                      isDarkMode ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    <h4
                      className={`font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {noteToDelete.title}
                    </h4>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {formatDate(noteToDelete.date)}
                    </p>
                    {noteToDelete.description && (
                      <p
                        className={`text-sm mt-2 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                        style={{ whiteSpace: "pre-line", lineHeight: "1.2" }}
                      >
                        {formatDescription(noteToDelete.description)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={handleDeleteNote}
                  disabled={isDeleting}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isDeleting
                      ? "bg-red-500 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-red-700 hover:bg-red-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
                      : "bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận xóa"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarNoteManagement;
