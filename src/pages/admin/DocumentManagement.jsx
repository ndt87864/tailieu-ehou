import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import { useUserRole } from "../../context/UserRoleContext";
import { useTheme } from "../../context/ThemeContext";
import {
  getAllCategories,
  getAllCategoriesWithDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
} from "../../firebase/firestoreService";
import Sidebar from "../../components/Sidebar";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import UserHeader from "../../components/UserHeader";
import ThemeColorPicker from "../../components/ThemeColorPicker";

const DocumentManagement = () => {
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  const [sidebarData, setSidebarData] = useState([]);
  const [sidebarDocuments, setSidebarDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: "",
    categoryId: "",
    isVip: false,
  });
  const [editDocument, setEditDocument] = useState({
    id: "",
    title: "",
    categoryId: "",
    isVip: false,
  });
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  useEffect(() => {
    const loadData = async () => {
      if (!isAdmin) {
        return;
      }

      try {
        setLoading(true);
        const categoriesWithDocs = await getAllCategoriesWithDocuments();

        const categoriesData = await getAllCategories();

        const allDocuments = [];

        categoriesWithDocs.forEach((category) => {
          if (category.documents && category.documents.length > 0) {
            const docsWithCategory = category.documents.map((doc) => ({
              ...doc,
              categoryTitle: category.title,
              categoryId: category.id,
              categoryLogo: category.logo || null,
            }));
            allDocuments.push(...docsWithCategory);
          }
        });

        setCategories(categoriesData);
        setDocuments(allDocuments);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Không thể tải danh sách tài liệu và danh mục");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  const handleCategoryFilterChange = (e) => {
    setSelectedCategoryFilter(e.target.value);
  };

  const handleInputChange = (e) => {
    setNewDocument({
      ...newDocument,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditInputChange = (e) => {
    setEditDocument({
      ...editDocument,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!newDocument.title.trim()) {
      setFormError("Vui lòng nhập tên tài liệu");
      return;
    }

    if (!newDocument.categoryId) {
      setFormError("Vui lòng chọn danh mục");
      return;
    }

    try {
      setIsSubmitting(true);

      const documentData = {
        title: newDocument.title.trim(),
        categoryId: newDocument.categoryId,
        isVip: newDocument.isVip, // Đảm bảo truyền isVip
      };

      const addedDocument = await addDocument(documentData);

      const category = categories.find(
        (cat) => cat.id === documentData.categoryId
      );

      setDocuments((prevDocuments) => [
        ...prevDocuments,
        {
          ...addedDocument,
          categoryTitle: category?.title || "",
          categoryLogo: category?.logo || null,
        },
      ]);
      setSuccessMessage("Đã thêm tài liệu thành công!");
      setTimeout(() => {
        setNewDocument({ title: "", categoryId: "", isVip: false });
        setShowAddModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      console.error("Error adding document:", err);
      setFormError("Đã xảy ra lỗi khi thêm tài liệu. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!editDocument.title.trim()) {
      setFormError("Vui lòng nhập tên tài liệu");
      return;
    }

    if (!editDocument.categoryId) {
      setFormError("Vui lòng chọn danh mục");
      return;
    }

    try {
      setIsSubmitting(true);
      const documentData = {
        title: editDocument.title.trim(),
        categoryId: editDocument.categoryId,
        isVip: editDocument.isVip, // Đảm bảo truyền isVip
      };

      const updatedDocument = await updateDocument(
        editDocument.id,
        documentData
      );

      const category = categories.find(
        (cat) => cat.id === documentData.categoryId
      );

      setDocuments((prevDocuments) =>
        prevDocuments.map((doc) =>
          doc.id === editDocument.id
            ? {
                ...updatedDocument,
                categoryTitle: category?.title || "",
                categoryLogo: category?.logo || null,
              }
            : doc
        )
      );

      setSuccessMessage("Đã cập nhật tài liệu thành công!");

      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      console.error("Error updating document:", err);
      setFormError(
        "Đã xảy ra lỗi khi cập nhật tài liệu. Vui lòng thử lại sau."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete || !isDeleteConfirmed) return;

    setIsDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");

    try {
      await deleteDocument(documentToDelete.id);

      setDocuments((prevDocuments) =>
        prevDocuments.filter((doc) => doc.id !== documentToDelete.id)
      );

      setDeleteSuccess(
        `Đã xóa tài liệu "${documentToDelete.title}" thành công!`
      );

      setTimeout(() => {
        setShowDeleteModal(false);
        setDocumentToDelete(null);
        setDeleteSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Error deleting document:", err);
      setDeleteError("Đã xảy ra lỗi khi xóa tài liệu. Vui lòng thử lại sau.");
    } finally {
      setIsDeleting(false);
    }
  };
  // Thêm state cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Lọc tài liệu theo search và category
  const filteredAllDocuments = documents.filter((doc, index) => {
    const stt = (index + 1).toString();
    const title = doc.title.toLowerCase();
    const category = doc.categoryTitle?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      title.includes(query) || category.includes(query) || stt.includes(query);

    const matchesCategory =
      selectedCategoryFilter === "all" ||
      doc.categoryId === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Lấy tài liệu cho trang hiện tại
  const filteredDocuments = filteredAllDocuments.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  // Tính tổng số trang
  const totalPages = Math.ceil(filteredAllDocuments.length / limit);

  // Hàm chuyển trang
  function handlePrevPage() {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  }
  function handleNextPage() {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  }

  // State cho input nhập số trang
  const [gotoPageInput, setGotoPageInput] = useState(currentPage);

  // Đồng bộ input với currentPage
  useEffect(() => {
    setGotoPageInput(currentPage);
  }, [currentPage]);

  // Hàm xác nhận chuyển trang
  function handleGotoPage() {
    let page = parseInt(gotoPageInput);
    if (isNaN(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  }

  const handleEditClick = (doc) => {
    setEditDocument({
      id: doc.id,
      title: doc.title,
      categoryId: doc.categoryId,
      isVip: doc.isVip || false,
    });
    setShowEditModal(true);
    setFormError("");
    setSuccessMessage("");
  };

  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
    setDeleteError("");
    setDeleteSuccess("");
    setIsDeleteConfirmed(false);
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
        {/* Sidebar - Fixed on desktop, slidable on mobile */}
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
            sidebarData={sidebarData}
            documents={sidebarDocuments}
            openMain={openMain}
            setOpenMain={setOpenMain}
            selectedCategory={selectedCategory}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            setSearch={setSearch}
            setDocuments={setSidebarDocuments}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            hideDocumentTree={true}
          />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && windowWidth < 770 && (
          <div
            className="fixed inset-0 z-10 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop Header - Fixed at top */}
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

          {/* Main content with padding */}
          <main
            className={`p-4 md:p-6 ${
              isDarkMode
                ? "bg-gray-900 text-white"
                : "bg-slate-100 text-gray-900"
            }`}
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h1 className="text-2xl font-bold mb-4 md:mb-0">
                  Quản lý Tài Liệu
                </h1>
              </div>
            </div>
            {/* Rest of the DocumentManagement content */}
            <div className="flex-1 p-6">
              <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <button
                      onClick={() => setShowAddModal(true)}
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
                      Thêm tài liệu mới
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    {/* Category Filter */}
                    <div
                      className={`relative rounded-lg overflow-hidden ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      } shadow-sm w-full md:w-64`}
                    >
                      <select
                        value={selectedCategoryFilter}
                        onChange={handleCategoryFilterChange}
                        className={`w-full px-4 py-2.5 ${
                          isDarkMode
                            ? "bg-gray-800 text-white border-gray-700"
                            : "bg-white text-gray-900 border-gray-200"
                        } border-0 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                      >
                        <option value="all">Tất cả danh mục</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search Box */}
                    <div
                      className={`relative rounded-lg overflow-hidden ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      } shadow-sm w-full md:w-96 lg:w-[500px]`}
                    >
                      <input
                        type="text"
                        placeholder="Tìm kiếm tài liệu theo tên, danh mục hoặc STT..."
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
                </div>
              </div>

              {/* Thông báo lỗi */}
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

              {/* Documents list */}
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
                      Danh sách tài liệu
                    </h3>
                    <p
                      className={`mt-1 text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {loading
                        ? "Đang tải..."
                        : `Hiển thị ${filteredDocuments.length} / ${documents.length} tài liệu trong hệ thống`}
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  ) : filteredDocuments.length === 0 ? (
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                      <p
                        className={`mt-2 text-sm font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Không tìm thấy tài liệu nào
                      </p>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Thử thay đổi bộ lọc hoặc thêm tài liệu mới
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile view */}
                      <div className="md:hidden">
                        {filteredDocuments.map((doc, index) => (
                          <div
                            key={doc.id}
                            className={`px-4 py-3 border-b ${
                              isDarkMode ? "border-gray-700" : "border-gray-200"
                            } ${
                              isDarkMode
                                ? "hover:bg-gray-700/30"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex space-x-3 items-center">
                                {/* STT and Icon */}
                                <div className="flex flex-col items-center space-y-1">
                                  <span
                                    className={`text-xs font-medium ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {(currentPage - 1) * limit + index + 1}
                                  </span>
                                  <div
                                    className={`w-8 h-8 flex items-center justify-center rounded-md ${
                                      isDarkMode ? "bg-gray-600" : "bg-blue-100"
                                    }`}
                                  >
                                    <svg
                                      className={`h-5 w-5 ${
                                        isDarkMode
                                          ? "text-blue-300"
                                          : "text-blue-600"
                                      }`}
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                  <h4
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {doc.title}
                                  </h4>
                                  <div className="mt-1 flex flex-col space-y-1">
                                    <span
                                      className={`flex items-center text-xs ${
                                        isDarkMode
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      <svg
                                        className="w-3 h-3 mr-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                        />
                                      </svg>
                                      {doc.categoryTitle || "Không có danh mục"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleEditClick(doc)}
                                  className={`p-1.5 rounded-md ${
                                    isDarkMode
                                      ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                                      : "text-blue-600 hover:bg-gray-100 hover:text-blue-700"
                                  }`}
                                  title="Chỉnh sửa tài liệu"
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
                                  onClick={() => handleDeleteClick(doc)}
                                  className={`p-1.5 rounded-md ${
                                    isDarkMode
                                      ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                                      : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                                  }`}
                                  title="Xóa tài liệu"
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
                            </div>
                          </div>
                        ))}
                        <div className="flex flex-col md:flex-row justify-center items-center gap-2 mt-4 pb-4">
                          <div className="flex flex-row items-center gap-2 w-full justify-center">
                            <button
                              className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
                              onClick={handlePrevPage}
                              disabled={currentPage === 1}
                            >
                              Trang trước
                            </button>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={gotoPageInput}
                                onChange={(e) =>
                                  setGotoPageInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleGotoPage();
                                  }
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                              />
                              <span className="text-sm">/ {totalPages}</span>
                            </div>
                            <button
                              className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
                              onClick={handleNextPage}
                              disabled={currentPage === totalPages}
                            >
                              Trang sau
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop view */}
                      <div
                        className="hidden md:block w-full overflow-x-auto"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
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
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                STT
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                Biểu tượng
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                Tên tài liệu
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                Danh mục
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                Loại
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                <span className="sr-only">Thao tác</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody
                            className={`divide-y ${
                              isDarkMode ? "divide-gray-700" : "divide-gray-200"
                            }`}
                          >
                            {filteredDocuments.map((doc, index) => (
                              <tr
                                key={doc.id}
                                className={
                                  isDarkMode
                                    ? "hover:bg-gray-700/30"
                                    : "hover:bg-gray-50"
                                }
                              >
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {(currentPage - 1) * limit + index + 1}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center">
                                    <div
                                      className={`w-8 h-8 flex items-center justify-center rounded-md ${
                                        isDarkMode
                                          ? "bg-gray-600"
                                          : "bg-blue-100"
                                      }`}
                                    >
                                      <svg
                                        className={`h-5 w-5 ${
                                          isDarkMode
                                            ? "text-blue-300"
                                            : "text-blue-600"
                                        }`}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div
                                    className={`text-sm font-medium ${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {doc.title}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                  <div
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {doc.categoryTitle || "Không có danh mục"}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  {doc.isVip ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <svg
                                        className="w-3 h-3 mr-1"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      VIP
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        isDarkMode
                                          ? "bg-gray-700 text-gray-300"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      Miễn phí
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditClick(doc)}
                                      className={`inline-flex items-center p-1.5 rounded-md ${
                                        isDarkMode
                                          ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                                          : "text-blue-600 hover:bg-gray-100 hover:text-blue-700"
                                      }`}
                                      title="Chỉnh sửa tài liệu"
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
                                      onClick={() => handleDeleteClick(doc)}
                                      className={`inline-flex items-center p-1.5 rounded-md ${
                                        isDarkMode
                                          ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                                          : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                                      }`}
                                      title="Xóa tài liệu"
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
                        <div className="flex flex-col md:flex-row justify-center items-center gap-2 mt-4 pb-4">
                          <button
                            className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                          >
                            Trang trước
                          </button>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={totalPages}
                              value={gotoPageInput}
                              onChange={(e) => setGotoPageInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleGotoPage();
                                }
                              }}
                              className="w-16 px-2 py-1 border rounded text-center"
                            />
                            <span className="text-sm">/ {totalPages}</span>
                          </div>
                          <button
                            className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                          >
                            Trang sau
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />

      {/* Add Document Modal */}
      {showAddModal && (
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
              {/* Modal Header */}
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
                    Thêm tài liệu mới
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowAddModal(false)}
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

              {/* Modal Body */}
              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                <form onSubmit={handleAddDocument}>
                  {/* Title field */}
                  <div className="mb-5">
                    <label
                      htmlFor="title"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tên tài liệu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={newDocument.title}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập tên tài liệu"
                    />
                  </div>

                  {/* Category selection */}
                  <div className="mb-5">
                    <label
                      htmlFor="categoryId"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      value={newDocument.categoryId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* VIP checkbox */}
                  <div className="mb-5">
                    <div className="flex items-center">
                      <input
                        id="isVip"
                        name="isVip"
                        type="checkbox"
                        checked={newDocument.isVip}
                        onChange={(e) =>
                          setNewDocument({
                            ...newDocument,
                            isVip: e.target.checked,
                          })
                        }
                        className={`h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                          isDarkMode ? "bg-gray-700 border-gray-500" : ""
                        }`}
                      />
                      <label
                        htmlFor="isVip"
                        className={`ml-2 block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Tài liệu VIP
                      </label>
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Chỉ người dùng trả phí mới có thể truy cập tài liệu VIP
                    </p>
                  </div>

                  {/* Success message */}
                  {successMessage && (
                    <div
                      className={`p-3 mb-4 text-sm rounded-md ${
                        isDarkMode
                          ? "bg-green-900/30 text-green-300 border border-green-800"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      <div className="flex">
                        <svg
                          className="h-5 w-5 mr-2 text-green-400 flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{successMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {formError && (
                    <div
                      className={`p-3 mb-4 text-sm rounded-md ${
                        isDarkMode
                          ? "bg-red-900/30 text-red-300 border border-red-800"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      <div className="flex">
                        <svg
                          className="h-5 w-5 mr-2 text-red-400 flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{formError}</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={handleAddDocument}
                  disabled={isSubmitting}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isSubmitting
                      ? "bg-green-500 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-green-700 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500"
                      : "bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  }`}
                >
                  {isSubmitting ? (
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
                    <>
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
                      Thêm tài liệu
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

      {/* Edit Document Modal */}
      {showEditModal && (
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
              {/* Modal Header */}
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
                    Chỉnh sửa tài liệu
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowEditModal(false)}
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

              {/* Modal Body */}
              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                <form onSubmit={handleUpdateDocument}>
                  {/* Title field */}
                  <div className="mb-5">
                    <label
                      htmlFor="edit-title"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tên tài liệu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="edit-title"
                      value={editDocument.title}
                      onChange={handleEditInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập tên tài liệu"
                    />
                  </div>

                  {/* Category selection */}
                  <div className="mb-5">
                    <label
                      htmlFor="edit-categoryId"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="edit-categoryId"
                      name="categoryId"
                      value={editDocument.categoryId}
                      onChange={handleEditInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* VIP checkbox */}
                  <div className="mb-5">
                    <div className="flex items-center">
                      <input
                        id="edit-isVip"
                        name="isVip"
                        type="checkbox"
                        checked={editDocument.isVip}
                        onChange={(e) =>
                          setEditDocument({
                            ...editDocument,
                            isVip: e.target.checked,
                          })
                        }
                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                          isDarkMode ? "bg-gray-700 border-gray-500" : ""
                        }`}
                      />
                      <label
                        htmlFor="edit-isVip"
                        className={`ml-2 block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Tài liệu VIP
                      </label>
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Chỉ người dùng trả phí mới có thể truy cập tài liệu VIP
                    </p>
                  </div>

                  {/* Success message */}
                  {successMessage && (
                    <div
                      className={`p-3 mb-4 text-sm rounded-md ${
                        isDarkMode
                          ? "bg-green-900/30 text-green-300 border border-green-800"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      <div className="flex">
                        <svg
                          className="h-5 w-5 mr-2 text-green-400 flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{successMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {formError && (
                    <div
                      className={`p-3 mb-4 text-sm rounded-md ${
                        isDarkMode
                          ? "bg-red-900/30 text-red-300 border border-red-800"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      <div className="flex">
                        <svg
                          className="h-5 w-5 mr-2 text-red-400 flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{formError}</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={handleUpdateDocument}
                  disabled={isSubmitting}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isSubmitting
                      ? "bg-blue-500 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-blue-700 hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  }`}
                >
                  {isSubmitting ? (
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
                    <>
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                      Cập nhật tài liệu
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
              {/* Modal Header */}
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
                    Xác nhận xóa tài liệu
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

              {/* Modal Body */}
              <div
                className={`px-6 py-5 ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                {deleteSuccess ? (
                  <div
                    className={`p-3 mb-4 text-sm rounded-md ${
                      isDarkMode
                        ? "bg-green-900/30 text-green-300 border border-green-800"
                        : "bg-green-50 text-green-700 border border-green-200"
                    }`}
                  >
                    <div className="flex">
                      <svg
                        className="h-5 w-5 mr-2 text-green-400 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{deleteSuccess}</span>
                    </div>
                  </div>
                ) : (
                  <form>
                    {/* Name field - readonly */}
                    <div className="mb-5">
                      <label
                        htmlFor="delete-title"
                        className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Tên tài liệu
                      </label>
                      <input
                        type="text"
                        id="delete-title"
                        value={documentToDelete?.title || ""}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${
                          isDarkMode
                            ? "bg-gray-600 border-gray-500 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      />
                    </div>

                    {/* Category field - readonly */}
                    <div className="mb-5">
                      <label
                        htmlFor="delete-category"
                        className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Danh mục
                      </label>
                      <input
                        type="text"
                        id="delete-category"
                        value={documentToDelete?.categoryTitle || ""}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-md shadow-sm ${
                          isDarkMode
                            ? "bg-gray-600 border-gray-500 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      />
                    </div>

                    {/* Warning message */}
                    <div
                      className={`p-3 mb-5 text-sm rounded-md border ${
                        isDarkMode
                          ? "bg-red-900/30 text-red-300 border-red-800"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 mr-2 text-red-400 flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="font-medium">Cảnh báo: </span>
                        <span className="ml-1">
                          Tất cả câu hỏi trong tài liệu này sẽ bị xóa vĩnh viễn!
                        </span>
                      </div>
                    </div>

                    {/* Confirmation checkbox */}
                    <div className="flex items-center mb-5">
                      <input
                        id="confirm-delete"
                        name="confirm-delete"
                        type="checkbox"
                        checked={isDeleteConfirmed}
                        onChange={(e) => setIsDeleteConfirmed(e.target.checked)}
                        className={`h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded ${
                          isDarkMode ? "bg-gray-700 border-gray-500" : ""
                        }`}
                      />
                      <label
                        htmlFor="confirm-delete"
                        className={`ml-2 block text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Tôi xác nhận muốn xóa tài liệu này và tất cả câu hỏi
                        liên quan
                      </label>
                    </div>

                    {/* Error message */}
                    {deleteError && (
                      <div
                        className={`p-3 mb-4 text-sm rounded-md ${
                          isDarkMode
                            ? "bg-red-900/30 text-red-300 border border-red-800"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <div className="flex">
                          <svg
                            className="h-5 w-5 mr-2 text-red-400 flex-shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{deleteError}</span>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 sm:flex ${
                  deleteSuccess ? "justify-center" : "sm:flex-row-reverse"
                } ${
                  isDarkMode
                    ? "bg-gray-700 border-t border-gray-600"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                {deleteSuccess ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className={`w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:w-auto sm:text-sm ${
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                  >
                    Đóng
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteDocument}
                      disabled={isDeleting || !isDeleteConfirmed}
                      className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                        isDeleting
                          ? "bg-red-500 cursor-not-allowed"
                          : !isDeleteConfirmed
                          ? "bg-red-400 cursor-not-allowed"
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
                        <>
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            ></path>
                          </svg>
                          Xác nhận xóa
                        </>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
