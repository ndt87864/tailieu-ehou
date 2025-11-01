import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebase/firebase";
import { useUserRole } from "../../context/UserRoleContext";
import { useTheme } from "../../context/ThemeContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import Sidebar from "../../components/Sidebar";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import UserHeader from "../../components/UserHeader";
import ThemeColorPicker from "../../components/ThemeColorPicker";
import {
  getAllCategories,
  getDocumentsByCategory,
} from "../../firebase/firestoreService";

const PricingContentManagement = () => {
  const { isDarkMode } = useTheme();
  const [user] = useAuthState(auth);
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    text: "",
    links: [],
  });

  // Sidebar and responsive states
  const [sidebarData, setSidebarData] = useState([]);
  const [sidebarDocuments, setSidebarDocuments] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openMain, setOpenMain] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemToConfirm, setDeleteItemToConfirm] = useState(null);

  // Handle window resize for responsive layout
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }

    fetchContent();
    loadSidebarData();
  }, [isAdmin, navigate]);

  const loadSidebarData = async () => {
    try {
      const categoriesData = await getAllCategories();
      if (categoriesData && categoriesData.length > 0) {
        setSidebarData(categoriesData);

        const docsPromises = categoriesData.map(async (category) => {
          const docsData = await getDocumentsByCategory(category.id);
          return { categoryId: category.id, docs: docsData };
        });
        const docsResults = await Promise.all(docsPromises);
        const docsMap = docsResults.reduce((acc, { categoryId, docs }) => {
          acc[categoryId] = docs;
          return acc;
        }, {});
        setSidebarDocuments(docsMap);
      }
    } catch (error) {
      console.error("Error loading sidebar data:", error);
    }
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "pricing_content"),
        orderBy("number", "asc")
      );
      const snapshot = await getDocs(q);
      const contentData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContent(contentData);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        number: parseInt(formData.number),
        text: formData.text,
        links: formData.links.filter((link) => link.linkText && link.linkUrl),
        updatedAt: new Date(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "pricing_content", editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, "pricing_content"), {
          ...dataToSave,
          createdAt: new Date(),
        });
      }

      resetForm();
      fetchContent();
    } catch (error) {
      console.error("Error saving content:", error);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      number: item.number.toString(),
      text: item.text,
      links: item.links || [],
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "pricing_content", id));
      setContent((prev) => prev.filter((item) => item.id !== id));
      setShowDeleteModal(false);
      setDeleteItemToConfirm(null);
    } catch (error) {
      console.error("Error deleting content:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      number: "",
      text: "",
      links: [],
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  // Functions to manage external links only
  const addLink = () => {
    setFormData({
      ...formData,
      links: [...formData.links, { linkText: "", linkUrl: "" }],
    });
  };

  const removeLink = (index) => {
    const newLinks = formData.links.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      links: newLinks,
    });
  };

  const updateLink = (index, field, value) => {
    const newLinks = [...formData.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData({
      ...formData,
      links: newLinks,
    });
  };

  const renderPreview = () => {
    if (!formData.text) return null;

    let previewText = formData.text;

    // Process external links for preview
    formData.links.forEach((link) => {
      if (link.linkText && link.linkUrl) {
        previewText = previewText.replace(
          link.linkText,
          `<a href="${link.linkUrl}" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">${link.linkText}</a>`
        );
      }
    });

    return (
      <div
        className={`mt-4 p-3 rounded-lg border ${
          isDarkMode
            ? "bg-gray-700 border-gray-600"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <h4
          className={`text-sm font-medium mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Xem trước:
        </h4>
        <div className="flex items-start">
          <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0">
            {formData.number || "?"}
          </span>
          <div
            className={isDarkMode ? "text-gray-300" : "text-gray-800"}
            dangerouslySetInnerHTML={{ __html: previewText }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${
          isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
        } flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

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
            sidebarData={sidebarData}
            documents={sidebarDocuments}
            openMain={openMain}
            setOpenMain={setOpenMain}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            setDocuments={setSidebarDocuments}
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop Header */}
          {windowWidth >= 770 && (
            <div className="sticky top-0 z-20 w-full">
              <UserHeader
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                title="Quản lý nội dung liên hệ"
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
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Quản lý nội dung liên hệ
                  </h1>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Quản lý nội dung hiển thị trong trang hướng dẫn liên hệ
                  </p>
                </div>

                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Thêm mục mới
                  </span>
                </button>
              </div>

              {/* Content List */}
              <div
                className={`${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                } rounded-lg shadow-lg border overflow-hidden`}
              >
                <div
                  className={`px-6 py-4 ${
                    isDarkMode
                      ? "bg-gray-700/50 border-b border-gray-700"
                      : "bg-gray-50 border-b border-gray-200"
                  }`}
                >
                  <h2
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    Danh sách nội dung
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {content.length} mục hướng dẫn
                  </p>
                </div>

                <div className="p-6">
                  {content.length === 0 ? (
                    <div className="text-center py-8">
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
                      <p className="mt-2 text-gray-500">
                        Chưa có nội dung nào được tạo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {content.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 ${
                            isDarkMode
                              ? "border-gray-600 bg-gray-700/30"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start flex-1">
                              <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-8 w-8 mr-4 flex-shrink-0 text-sm font-medium">
                                {item.number}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-base leading-relaxed ${
                                    isDarkMode
                                      ? "text-gray-300"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {item.text}
                                </p>
                                {item.links && item.links.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    <p
                                      className={`text-sm font-medium ${
                                        isDarkMode
                                          ? "text-gray-400"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      Liên kết:
                                    </p>
                                    {item.links.map((link, index) => (
                                      <div
                                        key={index}
                                        className={`text-sm ${
                                          isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        • {link.linkText} → {link.linkUrl}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEdit(item)}
                                className="inline-flex items-center p-2 rounded-md text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                                title="Chỉnh sửa"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  ></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteItemToConfirm(item);
                                  setShowDeleteModal(true);
                                }}
                                className="inline-flex items-center p-2 rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                title="Xóa"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  ></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
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
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${
                isDarkMode
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-white border border-gray-200"
              }`}
            >
              {/* Modal Header */}
              <div
                className={`px-6 py-4 border-b ${
                  isDarkMode
                    ? "bg-gray-700/50 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {editingItem ? "Chỉnh sửa mục" : "Thêm mục mới"}
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={resetForm}
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
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Số thứ tự
                    </label>
                    <input
                      type="number"
                      value={formData.number}
                      onChange={(e) =>
                        setFormData({ ...formData, number: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-800"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Nội dung
                    </label>
                    <textarea
                      value={formData.text}
                      onChange={(e) =>
                        setFormData({ ...formData, text: e.target.value })
                      }
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-800"
                      }`}
                      required
                      placeholder="Nhập nội dung hướng dẫn..."
                    />
                  </div>

                  {/* External Links Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Liên kết ngoài (tùy chọn)
                      </label>
                      <button
                        type="button"
                        onClick={addLink}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        + Thêm liên kết
                      </button>
                    </div>

                    {formData.links.map((link, index) => (
                      <div
                        key={index}
                        className="mb-3 p-3 border rounded-md bg-gray-50 dark:bg-gray-700/30"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            Liên kết {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="text-red-500 hover:text-red-700"
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
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Văn bản hiển thị"
                            value={link.linkText}
                            onChange={(e) =>
                              updateLink(index, "linkText", e.target.value)
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-white border-gray-300 text-gray-800"
                            }`}
                          />
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={link.linkUrl}
                            onChange={(e) =>
                              updateLink(index, "linkUrl", e.target.value)
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-white border-gray-300 text-gray-800"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {renderPreview()}
                </form>
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700/30 border-t border-gray-700"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  {editingItem ? "Cập nhật" : "Thêm mới"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-gray-500"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500"
                  }`}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteItemToConfirm && (
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
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-white border border-gray-200"
              }`}
            >
              {/* Modal Header */}
              <div
                className={`px-6 py-4 border-b ${
                  isDarkMode
                    ? "bg-gray-700/50 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Xác nhận xóa
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
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      className={`text-lg font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Xóa mục hướng dẫn
                    </h3>
                    <div className="mt-2">
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Bạn có chắc chắn muốn xóa mục này? Hành động này không
                        thể khôi phục.
                      </p>
                      <div
                        className={`mt-3 p-3 rounded-md ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start">
                          <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 flex-shrink-0 text-sm">
                            {deleteItemToConfirm.number}
                          </span>
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-300" : "text-gray-800"
                            }`}
                          >
                            {deleteItemToConfirm.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 sm:flex sm:flex-row-reverse ${
                  isDarkMode
                    ? "bg-gray-700/30 border-t border-gray-700"
                    : "bg-gray-50 border-t border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleDelete(deleteItemToConfirm.id)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-gray-500"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500"
                  }`}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default PricingContentManagement;
