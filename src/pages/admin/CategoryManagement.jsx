import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/firebase";
import { useTheme } from "../../context/ThemeContext";
import {
  addCategory,
  updateCategory,
  deleteCategory,
} from "../../firebase/firestoreService";
import Sidebar from "../../components/Sidebar";
import { DocumentMobileHeader } from "../../components/MobileHeader";
import UserHeader from "../../components/UserHeader";
import ThemeColorPicker from "../../components/ThemeColorPicker";
import {
  useSafeAdminCheck,
  protectAdminRoute,
  loadCategoriesOptimized,
} from "../../utils/permission/adminHelper";

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useAuthState(auth);
  const { isDarkMode } = useTheme();
  // Đã có khai báo isAdmin ở nơi khác, không khai báo lại
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

  // Thêm trường chỉ admin xem được
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    title: "",
    logo: "",
    adminOnly: false, // checkbox: danh mục đề thi chỉ admin xem
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editCategory, setEditCategory] = useState({
    id: "",
    title: "",
    logo: "",
    adminOnly: false, // checkbox: danh mục đề thi chỉ admin xem
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isMovingToTop, setIsMovingToTop] = useState(false);
  const [movingSuccess, setMovingSuccess] = useState("");

  // Thêm state cho modal xác nhận ghim danh mục
  const [showPinModal, setShowPinModal] = useState(false);
  const [categoryToPin, setCategoryToPin] = useState(null);
  const [isPinning, setIsPinning] = useState(false);

  const academicLogos = [
    {
      id: "business",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      name: "Kinh doanh",
    },
    {
      id: "economics",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      name: "Kinh tế học",
    },
    {
      id: "accounting",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      name: "Kế toán",
    },
    {
      id: "finance",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      name: "Tài chính",
    },
    {
      id: "management",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      name: "Quản trị",
    },
    {
      id: "marketing",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
          />
        </svg>
      ),
      name: "Marketing",
    },
    {
      id: "law",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      ),
      name: "Luật",
    },
    {
      id: "technology",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      name: "Công nghệ",
    },
    {
      id: "science",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
      name: "Khoa học",
    },
    {
      id: "education",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
          />
        </svg>
      ),
      name: "Giáo dục",
    },
    {
      id: "language",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
      ),
      name: "Ngôn ngữ",
    },
    {
      id: "statistics",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
      name: "Thống kê",
    },
    {
      id: "mathematics",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8"
          />
        </svg>
      ),
      name: "Toán học",
    },
    {
      id: "international",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      name: "Quốc tế",
    },
    {
      id: "social",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      name: "Xã hội học",
    },
    {
      id: "political",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
          />
        </svg>
      ),
      name: "Chính trị",
    },
    {
      id: "history",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      name: "Lịch sử",
    },
  ];

  const handleInputChange = (e) => {
    setNewCategory({
      ...newCategory,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoSelect = (logoId) => {
    setNewCategory({
      ...newCategory,
      logo: logoId,
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!newCategory.title.trim()) {
      setFormError("Vui lòng nhập tên danh mục");
      return;
    }

    if (!newCategory.logo) {
      setFormError("Vui lòng chọn biểu tượng cho danh mục");
      return;
    }

    try {
      setIsSubmitting(true);

      const categoryData = {
        title: newCategory.title.trim(),
        logo: newCategory.logo,
        adminOnly: !!newCategory.adminOnly,
      };

      const addedCategory = await addCategory(categoryData);

      setCategories([...categories, addedCategory]);

      setSuccessMessage("Đã thêm danh mục thành công!");

      setTimeout(() => {
        setNewCategory({ title: "", logo: "" });
        setShowAddModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      console.error("Error adding category:", err);
      setFormError("Đã xảy ra lỗi khi thêm danh mục. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (category) => {
    setEditCategory({
      id: category.id,
      title: category.title,
      logo: category.logo || "",
      adminOnly: !!category.adminOnly,
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    setEditCategory({
      ...editCategory,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditLogoSelect = (logoId) => {
    setEditCategory({
      ...editCategory,
      logo: logoId,
    });
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!editCategory.title.trim()) {
      setFormError("Vui lòng nhập tên danh mục");
      return;
    }

    if (!editCategory.logo) {
      setFormError("Vui lòng chọn biểu tượng cho danh mục");
      return;
    }

    try {
      setIsEditSubmitting(true);

      const categoryData = {
        title: editCategory.title.trim(),
        logo: editCategory.logo,
        adminOnly: !!editCategory.adminOnly,
      };
      const updatedCategory = await updateCategory(
        editCategory.id,
        categoryData
      );

      setCategories((prevCategories) =>
        prevCategories.map((cat) =>
          cat.id === editCategory.id ? { ...cat, ...categoryData } : cat
        )
      );

      setSuccessMessage("Đã cập nhật danh mục thành công!");

      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      console.error("Error updating category:", err);
      setFormError(
        "Đã xảy ra lỗi khi cập nhật danh mục. Vui lòng thử lại sau."
      );
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteClick = (category) => {
    if (category.documentCount > 0) {
      setErrorMessage(
        `Không thể xóa danh mục "${category.title}" vì còn chứa ${category.documentCount} tài liệu. Vui lòng xóa tài liệu trước.`
      );

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      return;
    }

    setCategoryToDelete(category);
    setShowDeleteModal(true);
    setDeleteError("");
    setDeleteSuccess("");
    setIsDeleteConfirmed(false);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");

    try {
      await deleteCategory(categoryToDelete.id);

      setCategories((prevCategories) =>
        prevCategories.filter((cat) => cat.id !== categoryToDelete.id)
      );

      setDeleteSuccess(
        `Đã xóa danh mục "${categoryToDelete.title}" thành công!`
      );

      setTimeout(() => {
        setShowDeleteModal(false);
        setCategoryToDelete(null);
        setDeleteSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Error deleting category:", err);
      setDeleteError("Đã xảy ra lỗi khi xóa danh mục. Vui lòng thử lại sau.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Sửa lại hàm xử lý khi nhấn nút đưa lên đầu để hiển thị modal xác nhận
  const handlePinClick = (category) => {
    if (!category) return;

    // Kiểm tra xem danh mục này đã ở vị trí đầu tiên chưa
    // Tìm danh mục có stt = 1 thay vì dựa vào index của mảng hiển thị
    const topCategory = categories.find((cat) => cat.stt === 1);
    if (topCategory && topCategory.id === category.id) {
      setErrorMessage("Danh mục này đã ở vị trí đầu tiên");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // Hiển thị modal xác nhận thay vì xử lý trực tiếp
    setCategoryToPin(category);
    setShowPinModal(true);
  };

  // Hàm thực hiện việc đưa danh mục lên đầu sau khi xác nhận
  const confirmPinToTop = async () => {
    if (!categoryToPin) return;

    try {
      setIsPinning(true);

      // Cập nhật trạng thái loading
      setLoading(true);

      // Truy vấn để lấy danh sách đã sắp xếp
      const sortedCategories = [...categories].sort((a, b) => {
        const aStt = a.stt || Number.MAX_SAFE_INTEGER;
        const bStt = b.stt || Number.MAX_SAFE_INTEGER;
        return aStt - bStt;
      });

      // Cập nhật danh mục được chọn thành stt = 1
      await updateCategory(categoryToPin.id, {
        ...categoryToPin,
        stt: 1,
      });

      // Cập nhật các danh mục khác
      for (const cat of sortedCategories) {
        if (cat.id !== categoryToPin.id) {
          // Tăng stt của tất cả các danh mục khác lên 1
          const currentStt = cat.stt || 0;
          await updateCategory(cat.id, {
            ...cat,
            stt: currentStt + 1,
          });
        }
      }

      // Hiển thị thông báo thành công
      setMovingSuccess(
        `Đã ghim danh mục "${categoryToPin.title}" lên đầu tiên`
      );

      // Đóng modal xác nhận
      setShowPinModal(false);
      setCategoryToPin(null);

      // Tải lại danh sách danh mục
      await loadCategoriesOptimized(setLoading, setError, setCategories);

      // Tự động đóng thông báo sau 3 giây
      setTimeout(() => {
        setMovingSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Lỗi khi ghim danh mục lên đầu:", error);
      setErrorMessage(`Đã xảy ra lỗi khi ghim danh mục: ${error.message}`);
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    } finally {
      setIsPinning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sử dụng hook kiểm tra admin an toàn
  const { isAdmin, loading: roleLoading } = useSafeAdminCheck();

  // Áp dụng bảo vệ route
  protectAdminRoute(isAdmin, roleLoading, navigate);

  // Sử dụng hàm tối ưu để tải danh mục
  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) return;

    const loadCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await loadCategoriesOptimized(
          setLoading,
          setError,
          setCategories
        );

        // Đảm bảo tất cả danh mục đều có stt, nếu không có thì gán giá trị mặc định
        const withStt = fetchedCategories.map((cat, index) => ({
          ...cat,
          stt: cat.stt || (index + 1) * 10, // Nếu không có stt, gán giá trị mặc định với khoảng cách 10
        }));

        setCategories(withStt);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [isAdmin, roleLoading]);

  useEffect(() => {
    if (!roleLoading && !loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate, roleLoading]);

  const filteredCategories = categories.filter((category, index) => {
    const stt = (index + 1).toString();
    const title = category.title.toLowerCase();
    const query = searchQuery.toLowerCase();

    return title.includes(query) || stt.includes(query);
  });
  const renderCategoryIcon = (logoId) => {
    const logo = academicLogos.find((l) => l.id === logoId);

    if (logo) {
      return logo.icon;
    }

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    );
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
              : "sticky top-0 left-0 h-screen z-10"
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
                  Quản lý Danh Mục
                </h1>

                <div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-500 hover:bg-blue-600"
                    } text-white transition-colors`}
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
                    Thêm Danh Mục
                  </button>
                </div>
              </div>

              {/* Rest of the CategoryManagement content */}
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
                      Danh sách danh mục
                    </h3>
                    <p
                      className={`mt-1 text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {loading
                        ? "Đang tải..."
                        : `Hiển thị ${filteredCategories.length} / ${categories.length} danh mục trong hệ thống`}
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  ) : filteredCategories.length === 0 ? (
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
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        ></path>
                      </svg>
                      <p
                        className={`mt-2 text-sm font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Không tìm thấy danh mục nào
                      </p>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Thử thay đổi bộ lọc hoặc thêm danh mục mới
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile view - Changed to match desktop table layout */}
                      <div className="md:hidden">
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
                                className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode ? "text-gray-300" : "text-gray-500"
                                }`}
                              >
                                STT
                              </th>
                              <th
                                scope="col"
                                className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode ? "text-gray-300" : "text-gray-500"
                                }`}
                              >
                                Danh mục
                              </th>
                              <th
                                scope="col"
                                className={`px-3 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode ? "text-gray-300" : "text-gray-500"
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
                            {filteredCategories.map((category, index) => (
                              <tr
                                key={category.id}
                                className={
                                  isDarkMode
                                    ? "hover:bg-gray-700/30"
                                    : "hover:bg-gray-50"
                                }
                              >
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  <div
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center">
                                    <div
                                      className={`w-8 h-8 flex-shrink-0 mr-2 flex items-center justify-center rounded-md ${
                                        isDarkMode
                                          ? "bg-gray-600"
                                          : "bg-blue-100"
                                      }`}
                                    >
                                      <div
                                        className={`h-5 w-5 ${
                                          isDarkMode
                                            ? "text-blue-300"
                                            : "text-blue-600"
                                        }`}
                                      >
                                        {renderCategoryIcon(category.logo)}
                                      </div>
                                    </div>
                                    <div>
                                      <div
                                        className={`text-sm font-medium ${
                                          isDarkMode
                                            ? "text-white"
                                            : "text-gray-900"
                                        }`}
                                      >
                                        {category.title}
                                      </div>
                                      <div
                                        className={`text-xs ${
                                          isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {category.documentCount || 0} tài liệu
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handlePinClick(category)}
                                      disabled={
                                        isMovingToTop || category.stt === 1
                                      }
                                      className={`p-1.5 rounded-md ${
                                        isMovingToTop
                                          ? isDarkMode
                                            ? "text-gray-600 cursor-not-allowed"
                                            : "text-gray-400 cursor-not-allowed"
                                          : category.stt === 1
                                          ? isDarkMode
                                            ? "text-gray-600 cursor-not-allowed"
                                            : "text-gray-400 cursor-not-allowed"
                                          : isDarkMode
                                          ? "text-yellow-400 hover:bg-gray-700 hover:text-yellow-300"
                                          : "text-yellow-600 hover:bg-gray-100 hover:text-yellow-700"
                                      }`}
                                      title={
                                        category.stt === 1
                                          ? "Danh mục đã ở vị trí đầu tiên"
                                          : "Ghim danh mục lên đầu danh sách"
                                      }
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 11l7-7 7 7M5 19l7-7 7 7"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleEditClick(category)}
                                      className={`p-1.5 rounded-md ${
                                        isDarkMode
                                          ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                                          : "text-blue-600 hover:bg-gray-100 hover:text-blue-700"
                                      }`}
                                      title="Chỉnh sửa danh mục"
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
                                      onClick={() =>
                                        handleDeleteClick(category)
                                      }
                                      className={`p-1.5 rounded-md ${
                                        category.documentCount > 0
                                          ? isDarkMode
                                            ? "text-gray-600 cursor-not-allowed"
                                            : "text-gray-400 cursor-not-allowed"
                                          : isDarkMode
                                          ? "text-red-400 hover:bg-gray-700 hover:text-red-300"
                                          : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                                      }`}
                                      title={
                                        category.documentCount > 0
                                          ? "Không thể xóa danh mục có tài liệu"
                                          : "Xóa danh mục"
                                      }
                                      disabled={category.documentCount > 0}
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
                                Tên danh mục
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                Số tài liệu
                              </th>
                              <th
                                scope="col"
                                className={`sticky top-0 px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isDarkMode
                                    ? "text-gray-300 bg-gray-700/50"
                                    : "text-gray-500 bg-gray-50"
                                }`}
                              >
                                Đề thi (admin)
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
                            {filteredCategories.map((category, index) => (
                              <tr
                                key={category.id}
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
                                    {index + 1}
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
                                      <div
                                        className={`h-5 w-5 ${
                                          isDarkMode
                                            ? "text-blue-300"
                                            : "text-blue-600"
                                        }`}
                                      >
                                        {renderCategoryIcon(category.logo)}
                                      </div>
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
                                    {category.title}
                                  </div>
                                  <div
                                    className={`text-xs mt-1 md:hidden ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {category.documentCount || 0} tài liệu
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
                                    {category.documentCount || 0} tài liệu
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div
                                    className={`text-sm font-semibold ${
                                      isDarkMode
                                        ? "text-yellow-300"
                                        : "text-yellow-700"
                                    }`}
                                  >
                                    {category.adminOnly ? "Đề thi" : ""}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handlePinClick(category)}
                                      disabled={
                                        isMovingToTop || category.stt === 1
                                      }
                                      className={`inline-flex items-center p-1.5 rounded-md ${
                                        isMovingToTop
                                          ? isDarkMode
                                            ? "text-gray-600 cursor-not-allowed"
                                            : "text-gray-400 cursor-not-allowed"
                                          : category.stt === 1
                                          ? isDarkMode
                                            ? "text-gray-600 cursor-not-allowed"
                                            : "text-gray-400 cursor-not-allowed"
                                          : isDarkMode
                                          ? "text-yellow-400 hover:bg-gray-700 hover:text-yellow-300"
                                          : "text-yellow-600 hover:bg-gray-100 hover:text-yellow-700"
                                      }`}
                                      title={
                                        category.stt === 1
                                          ? "Danh mục đã ở vị trí đầu tiên"
                                          : "Ghim danh mục lên đầu danh sách"
                                      }
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 11l7-7 7 7M5 19l7-7 7 7"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleEditClick(category)}
                                      className={`inline-flex items-center p-1.5 rounded-md ${
                                        isDarkMode
                                          ? "text-blue-400 hover:bg-gray-700 hover:text-blue-300"
                                          : "text-blue-600 hover:bg-gray-100 hover:text-blue-700"
                                      }`}
                                      title="Chỉnh sửa danh mục"
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
                                      onClick={() =>
                                        category.documentCount > 0
                                          ? handleDeleteClick(category)
                                          : handleDeleteClick(category)
                                      }
                                      className={`inline-flex items-center p-1.5 rounded-md ${
                                        isDarkMode
                                          ? "text-gray-600 cursor-not-allowed"
                                          : "text-gray-400 cursor-not-allowed"
                                      }`}
                                      title="Xóa danh mục"
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
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Category Modal */}
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
                    Thêm danh mục mới
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
                <form onSubmit={handleAddCategory}>
                  {/* Name field */}
                  <div className="mb-5">
                    <label
                      htmlFor="title"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tên danh mục <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={newCategory.title}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập tên danh mục"
                    />
                  </div>
                  {/* Checkbox: danh mục đề thi chỉ admin xem */}
                  {isAdmin && (
                    <div className="mb-5">
                      <label
                        className={`flex items-center text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newCategory.adminOnly}
                          onChange={(e) =>
                            setNewCategory((prev) => ({
                              ...prev,
                              adminOnly: e.target.checked,
                            }))
                          }
                          className="mr-2"
                        />
                        Danh mục đề thi (chỉ admin xem)
                      </label>
                    </div>
                  )}

                  {/* Logo selection */}
                  <div className="mb-5">
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Biểu tượng <span className="text-red-500">*</span>
                    </label>

                    <div
                      className={`p-4 rounded-md mb-3 ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-56 overflow-y-auto">
                        {academicLogos.map((logo) => (
                          <button
                            key={logo.id}
                            type="button"
                            onClick={() => handleLogoSelect(logo.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                              newCategory.logo === logo.id
                                ? isDarkMode
                                  ? "bg-green-700 text-white ring-2 ring-green-500"
                                  : "bg-green-100 text-green-800 ring-2 ring-green-500"
                                : isDarkMode
                                ? "bg-gray-800 hover:bg-gray-600 text-white"
                                : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200"
                            }`}
                            title={logo.name}
                          >
                            <div className="mb-1">{logo.icon}</div>
                            <span className="text-xs truncate w-full text-center">
                              {logo.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {newCategory.logo ? (
                        <div className="flex items-center">
                          <span className="mr-2">Đã chọn:</span>
                          <span className="mr-2 text-gray-700 dark:text-gray-300">
                            {
                              academicLogos.find(
                                (l) => l.id === newCategory.logo
                              )?.icon
                            }
                          </span>
                          <span className="font-medium">
                            {
                              academicLogos.find(
                                (l) => l.id === newCategory.logo
                              )?.name
                            }
                          </span>
                        </div>
                      ) : (
                        "Vui lòng chọn một biểu tượng cho danh mục"
                      )}
                    </div>
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
                  onClick={handleAddCategory}
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
                      Thêm danh mục
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

      {/* Edit Category Modal */}
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
                    Chỉnh sửa danh mục
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
                <form onSubmit={handleUpdateCategory}>
                  {/* Name field */}
                  <div className="mb-5">
                    <label
                      htmlFor="edit-title"
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tên danh mục <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="edit-title"
                      value={editCategory.title}
                      onChange={handleEditInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      }`}
                      placeholder="Nhập tên danh mục"
                    />
                  </div>
                  {/* Checkbox: danh mục đề thi chỉ admin xem */}
                  {isAdmin && (
                    <div className="mb-5">
                      <label
                        className={`flex items-center text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={editCategory.adminOnly}
                          onChange={(e) =>
                            setEditCategory((prev) => ({
                              ...prev,
                              adminOnly: e.target.checked,
                            }))
                          }
                          className="mr-2"
                        />
                        Danh mục đề thi (chỉ admin xem)
                      </label>
                    </div>
                  )}

                  {/* Logo selection */}
                  <div className="mb-5">
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Biểu tượng <span className="text-red-500">*</span>
                    </label>

                    <div
                      className={`p-4 rounded-md mb-3 ${
                        isDarkMode
                          ? "bg-gray-700 border border-gray-600"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-56 overflow-y-auto">
                        {academicLogos.map((logo) => (
                          <button
                            key={logo.id}
                            type="button"
                            onClick={() => handleEditLogoSelect(logo.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                              editCategory.logo === logo.id
                                ? isDarkMode
                                  ? "bg-green-700 text-white ring-2 ring-green-500"
                                  : "bg-green-100 text-green-800 ring-2 ring-green-500"
                                : isDarkMode
                                ? "bg-gray-800 hover:bg-gray-600 text-white"
                                : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200"
                            }`}
                            title={logo.name}
                          >
                            <div className="mb-1">{logo.icon}</div>
                            <span className="text-xs truncate w-full text-center">
                              {logo.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {editCategory.logo ? (
                        <div className="flex items-center">
                          <span className="mr-2">Đã chọn:</span>
                          <span className="mr-2 text-gray-700 dark:text-gray-300">
                            {
                              academicLogos.find(
                                (l) => l.id === editCategory.logo
                              )?.icon
                            }
                          </span>
                          <span className="font-medium">
                            {
                              academicLogos.find(
                                (l) => l.id === editCategory.logo
                              )?.name
                            }
                          </span>
                        </div>
                      ) : (
                        "Vui lòng chọn một biểu tượng cho danh mục"
                      )}
                    </div>
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
                  onClick={handleUpdateCategory}
                  disabled={isEditSubmitting}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isEditSubmitting
                      ? "bg-blue-500 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-blue-700 hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  }`}
                >
                  {isEditSubmitting ? (
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
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      Cập nhật danh mục
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
                    Xác nhận xóa danh mục
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
                  <>
                    <div className="mb-5 flex items-center justify-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          isDarkMode ? "bg-red-900/30" : "bg-red-100"
                        } mx-auto`}
                      >
                        <svg
                          className={`h-6 w-6 ${
                            isDarkMode ? "text-red-400" : "text-red-600"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </div>
                    </div>

                    <p
                      className={`text-center text-sm mb-5 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Bạn có chắc chắn muốn xóa danh mục{" "}
                      <span className="font-semibold">
                        {categoryToDelete?.title}
                      </span>
                      ?
                      <br />
                      <span className="text-red-500 font-medium">
                        Tất cả tài liệu và câu hỏi trong danh mục này sẽ bị xóa.
                      </span>
                      <br />
                      Hành động này không thể hoàn tác.
                    </p>

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
                  </>
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
                    className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium sm:mt-0 sm:w-auto sm:text-sm ${
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
                      onClick={handleDeleteCategory}
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

      {/* Pin Confirmation Modal */}
      {showPinModal && (
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
                    Xác nhận ghim danh mục
                  </h3>
                  <button
                    type="button"
                    className={`rounded-md p-1 focus:outline-none ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setShowPinModal(false)}
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
                <div className="mb-5 flex items-center justify-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isDarkMode ? "bg-yellow-900/30" : "bg-yellow-100"
                    } mx-auto`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-6 w-6 ${
                        isDarkMode ? "text-yellow-400" : "text-yellow-600"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 11l7-7 7 7M5 19l7-7 7 7"
                      />
                    </svg>
                  </div>
                </div>

                <p
                  className={`text-center text-sm mb-5 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Bạn có muốn ghim danh mục{" "}
                  <span className="font-semibold">{categoryToPin?.title}</span>{" "}
                  lên đầu danh sách?
                  <br />
                  <span
                    className={`font-medium ${
                      isDarkMode ? "text-yellow-400" : "text-yellow-600"
                    }`}
                  >
                    Danh mục này sẽ luôn hiển thị ở vị trí đầu tiên.
                  </span>
                </p>
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
                  onClick={confirmPinToTop}
                  disabled={isPinning}
                  className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    isPinning
                      ? "bg-yellow-500 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-yellow-600 hover:bg-yellow-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500"
                      : "bg-yellow-500 hover:bg-yellow-600 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  }`}
                >
                  {isPinning ? (
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
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 11l7-7 7 7M5 19l7-7 7 7"
                        />
                      </svg>
                      Xác nhận ghim
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
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

      {/* ThemeColorPicker */}
      <ThemeColorPicker
        isOpen={isThemePickerOpen}
        onClose={() => setIsThemePickerOpen(false)}
      />

      {/* Add a toast/alert component to show the error message */}
      {errorMessage && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
            isDarkMode ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"
          } z-50 max-w-md`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.293-4.707a1 1 0 011.414 0L10 14.586l1.293-1.293a1 1 0 011.414 1.414L11.414 16l1.293 1.293a1 1 0 01-1.414 1.414L10 17.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 16l-1.293-1.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setErrorMessage("")}
                  className={`inline-flex rounded-md p-1.5 ${
                    isDarkMode
                      ? "text-red-300 hover:bg-red-800"
                      : "text-red-500 hover:bg-red-200"
                  } focus:outline-none`}
                >
                  <span className="sr-only">Đóng</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {movingSuccess && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
            isDarkMode
              ? "bg-green-900 text-green-200"
              : "bg-green-100 text-green-800"
          } z-50 max-w-md`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-500"
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
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{movingSuccess}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setMovingSuccess("")}
                  className={`inline-flex rounded-md p-1.5 ${
                    isDarkMode
                      ? "text-green-300 hover:bg-green-800"
                      : "text-green-500 hover:bg-green-200"
                  } focus:outline-none`}
                >
                  <span className="sr-only">Đóng</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
