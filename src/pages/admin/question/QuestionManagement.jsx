import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../firebase/firebase";
import { useUserRole } from "../../../context/UserRoleContext";
import { useTheme } from "../../../context/ThemeContext";
import {
  getAllQuestionsWithDocumentInfo,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getDocumentsWithQuestionCount,
  getAllCategoriesWithDocuments,
  getQuestionsByDocument,
} from "../../../firebase/firestoreService";
import Sidebar from "../../../components/Sidebar";
import { DocumentMobileHeader } from "../../../components/MobileHeader";
import UserHeader from "../../../components/UserHeader";
import ThemeColorPicker from "../../../components/ThemeColorPicker";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, ImageRun } from "docx";
import { saveAs } from "file-saver";
const IMGBB_API_KEY = "f051ba26b2f74b1480f701e485184185"; // API Key cho ImgBB
import AddQuestionModal from "./AddQuestionModal";
import EditQuestionModal from "./EditQuestionModal";
import DeleteQuestionModal from "./DeleteQuestionModal";
import FilterQuestionModal from "./FilterQuestionModal";
import BulkDeleteModal from "./BulkDeleteModal";
import QuestionTable from "./QuestionTable";
const QuestionManagement = () => {
  const [questions, setQuestions] = useState([]);
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

  const [selectedDocumentFilter, setSelectedDocumentFilter] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    answer: "",
    documentId: "",
    url_question: "",
    url_answer: "",
  });
  const [editQuestion, setEditQuestion] = useState({
    id: "",
    question: "",
    answer: "",
    documentId: "",
    url_question: "",
    url_answer: "",
  });
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterDocument, setFilterDocument] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryDocuments, setCategoryDocuments] = useState({});

  const [questionType, setQuestionType] = useState("text");
  const [excelFile, setExcelFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);
  const questionImageInputRef = useRef(null);
  const answerImageInputRef = useRef(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingExcel, setProcessingExcel] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);

  const [filterDuplicateQuestion, setFilterDuplicateQuestion] = useState(false);
  const [filterDuplicateAnswer, setFilterDuplicateAnswer] = useState(false);

  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [questionImage, setQuestionImage] = useState(null);
  const [answerImage, setAnswerImage] = useState(null);
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [answerImageUrl, setAnswerImageUrl] = useState("");
  const [imageError, setImageError] = useState("");

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
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const categoriesWithDocs = await getAllCategoriesWithDocuments();

        const sortedCategories = [...categoriesWithDocs].sort(
          (a, b) =>
            (a.stt || Number.MAX_SAFE_INTEGER) -
            (b.stt || Number.MAX_SAFE_INTEGER)
        );

        setAllCategories(sortedCategories);

        const docsMap = {};
        const allDocuments = [];

        sortedCategories.forEach((category) => {
          if (category.documents && category.documents.length > 0) {
            const sortedDocs = [...category.documents].sort(
              (a, b) =>
                (a.stt || Number.MAX_SAFE_INTEGER) -
                (b.stt || Number.MAX_SAFE_INTEGER)
            );

            docsMap[category.id] = sortedDocs;

            sortedDocs.forEach((doc) => {
              allDocuments.push({
                ...doc,
                categoryId: category.id,
                categoryTitle: category.title,
                categoryLogo: category.logo || null,
              });
            });
          }
        });

        setCategoryDocuments(docsMap);

        if (!sortedCategories || sortedCategories.length === 0) {
          setError("Không tìm thấy danh mục");
          setLoading(false);
          return;
        }

        const firstCategory = sortedCategories[0];

        if (!firstCategory.documents || firstCategory.documents.length === 0) {
          setError("Không tìm thấy tài liệu trong danh mục đầu tiên");
          setLoading(false);
          return;
        }

        const firstDocument = firstCategory.documents[0];

        try {
          const questionsData = await getQuestionsByDocument(firstDocument.id);

          const questionsWithInfo = questionsData.map((question) => ({
            ...question,
            documentTitle: firstDocument.title || "",
            documentId: firstDocument.id || "",
            categoryId: firstCategory.id || "",
            categoryTitle: firstCategory.title || "",
            categoryLogo: firstCategory.logo || null,
            url_question: question.url_question || "",
            url_answer: question.url_answer || "",
          }));

          const formattedCategories = [
            {
              id: firstCategory.id,
              title: firstCategory.title,
              logo: firstCategory.logo || null,
            },
          ];

          const formattedDocuments = {
            [firstCategory.id]: [firstDocument],
          };

          setSelectedDocumentFilter(firstDocument.id);
          setSelectedCategory(firstCategory.id);
          setSelectedDocument(firstDocument.id);
          setOpenMain(0);

          setSidebarData(formattedCategories);
          setSidebarDocuments(formattedDocuments);
          setQuestions(questionsWithInfo || []);
          setDocuments([firstDocument]);
          setFilterCategory([firstCategory.id]);
          setFilterDocument([firstDocument.id]);
        } catch (questionsError) {
          console.error("Error loading questions:", questionsError);
          setError(
            "Không thể tải danh sách câu hỏi: " + questionsError.message
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Không thể tải danh sách câu hỏi và tài liệu: " + err.message);
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

  const handleDocumentFilterChange = (e) => {
    setSelectedDocumentFilter(e.target.value);
  };

  const handleInputChange = (e) => {
    setNewQuestion({
      ...newQuestion,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditInputChange = (e) => {
    setEditQuestion({
      ...editQuestion,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");

    if (!file) {
      setExcelFile(null);
      return;
    }
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (fileExt !== "xlsx" && fileExt !== "xls") {
      setFileError("Chỉ chấp nhận file Excel (.xlsx, .xls)");
      setExcelFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError("Kích thước file không được vượt quá 5MB");
      setExcelFile(null);
      return;
    }

    setExcelFile(file);
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    setImageError("");
    if (!file) {
      if (type === "question") {
        setQuestionImage(null);
        setQuestionImageUrl("");
      } else {
        setAnswerImage(null);
        setAnswerImageUrl("");
      }
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Vui lòng chọn file ảnh (jpg, png, ...)");
      if (type === "question") {
        setQuestionImage(null);
        setQuestionImageUrl("");
      } else {
        setAnswerImage(null);
        setAnswerImageUrl("");
      }
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Kích thước ảnh không được vượt quá 5MB");
      if (type === "question") {
        setQuestionImage(null);
        setQuestionImageUrl("");
      } else {
        setAnswerImage(null);
        setAnswerImageUrl("");
      }
      return;
    }
    if (type === "question") {
      setQuestionImage(file);
      setQuestionImageUrl(URL.createObjectURL(file));
    } else {
      setAnswerImage(file);
      setAnswerImageUrl(URL.createObjectURL(file));
    }
  };

  const uploadImageToImgBB = async (file) => {
    if (!file) return "";
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("key", IMGBB_API_KEY);
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error(data.error?.message || "Tải ảnh thất bại");
      }
    } catch (err) {
      throw new Error("Lỗi khi tải ảnh lên ImgBB: " + err.message);
    }
  };

  const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "binary" });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });

          if (jsonData.length === 0) {
            reject(new Error("File Excel không chứa dữ liệu"));
            return;
          }

          const hasAtLeastTwoColumns = jsonData.some(
            (row) =>
              row.A &&
              row.B &&
              row.A.toString().trim() !== "" &&
              row.B.toString().trim() !== ""
          );

          if (!hasAtLeastTwoColumns) {
            reject(new Error("File Excel phải có ít nhất 2 cột dữ liệu"));
            return;
          }
          const validRows = jsonData.filter(
            (row) =>
              row.A &&
              row.B &&
              row.A.toString().trim() !== "" &&
              row.B.toString().trim() !== ""
          );

          if (validRows.length === 0) {
            reject(new Error("Không tìm thấy dữ liệu hợp lệ trong file Excel"));
            return;
          }

          resolve(validRows);
        } catch (error) {
          reject(new Error("Lỗi khi đọc file Excel: " + error.message));
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsBinaryString(file);
    });
  };

  const uploadQuestionsToFirestore = async (questions, documentId) => {
    setTotalRows(questions.length);
    setProcessedRows(0);
    setUploadProgress(0);

    try {
      for (let i = 0; i < questions.length; i++) {
        const row = questions[i];

        const questionData = {
          question: row.A.toString().trim(),
          answer: row.B.toString().trim(),
          documentId: documentId,
          url_question: "",
          url_answer: "",
        };

        try {
          await addQuestion(questionData);
        } catch (error) {
          console.error("Lỗi khi thêm câu hỏi:", error);
          if (error.message && error.message.includes("index")) {
            console.error(
              "Lỗi index Firebase: Cần tạo chỉ mục cho truy vấn documentId và stt.",
              "\nVui lòng truy cập:",
              "\nhttps://console.firebase.google.com/project/_/firestore/indexes",
              "\nHoặc nhấp vào URL trong lỗi để tạo index tự động"
            );
          }
          throw error;
        }

        setProcessedRows(i + 1);
        setUploadProgress(Math.round(((i + 1) / questions.length) * 100));
      }

      return questions.length;
    } catch (error) {
      throw new Error("Lỗi khi tải câu hỏi lên Firestore: " + error.message);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setFileError("");
    setImageError("");

    if (questionType === "text") {
      if (!newQuestion.question.trim()) {
        setFormError("Vui lòng nhập câu hỏi");
        return;
      }

      if (!newQuestion.answer.trim()) {
        setFormError("Vui lòng nhập câu trả lời");
        return;
      }

      try {
        setIsSubmitting(true);

        let url_question = "";
        let url_answer = "";

        if (questionImage) {
          url_question = await uploadImageToImgBB(questionImage);
        }
        if (answerImage) {
          url_answer = await uploadImageToImgBB(answerImage);
        }

        const questionData = {
          question: newQuestion.question.trim(),
          answer: newQuestion.answer.trim(),
          documentId: selectedDocumentFilter,
          url_question,
          url_answer,
        };

        const addedQuestion = await addQuestion(questionData);

        const document = documents.find(
          (doc) => doc.id === questionData.documentId
        );

        setQuestions((prevQuestions) => [
          ...prevQuestions,
          {
            ...addedQuestion,
            documentTitle: document?.title || "",
            documentId: document?.id || "",
            categoryId: document?.categoryId || "",
            categoryTitle: document?.categoryTitle || "",
            categoryLogo: document?.categoryLogo || null,
            url_question,
            url_answer,
          },
        ]);

        setNewQuestion({
          question: "",
          answer: "",
          documentId: "",
          url_question: "",
          url_answer: "",
        });
        setQuestionImage(null);
        setAnswerImage(null);
        setQuestionImageUrl("");
        setAnswerImageUrl("");
        if (questionImageInputRef.current)
          questionImageInputRef.current.value = "";
        if (answerImageInputRef.current) answerImageInputRef.current.value = "";

        setShowAddModal(false);
        setSuccessMessage("Đã thêm câu hỏi thành công!");

        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      } catch (error) {
        console.error("Error adding question:", error);
        setFormError("Lỗi khi thêm câu hỏi: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!excelFile) {
        setFileError("Vui lòng chọn file Excel");
        return;
      }

      try {
        setIsSubmitting(true);
        setProcessingExcel(true);
        const excelData = await processExcelFile(excelFile);
        const addedCount = await uploadQuestionsToFirestore(
          excelData,
          selectedDocumentFilter
        );

        setSuccessMessage(
          `Đã nhập thành công ${addedCount} câu hỏi từ file Excel!`
        );

        setTimeout(() => {
          setExcelFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setProcessingExcel(false);
          setShowAddModal(false);
          const refreshQuestions = async () => {
            try {
              const questionsData = await getAllQuestionsWithDocumentInfo();
              const filteredQuestions = questionsData.filter(
                (question) => question.documentId === selectedDocumentFilter
              );
              setQuestions(filteredQuestions || []);
            } catch (error) {
              console.error("Error refreshing questions:", error);
            }
          };

          refreshQuestions();
        }, 2000);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        setFormError(error.message || "Lỗi khi xử lý file Excel");
        setProcessingExcel(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setFormError("");
    setImageError("");

    if (!editQuestion.question.trim()) {
      setFormError("Vui lòng nhập câu hỏi");
      return;
    }

    if (!editQuestion.answer.trim()) {
      setFormError("Vui lòng nhập câu trả lời");
      return;
    }

    try {
      setIsSubmitting(true);

      let url_question = editQuestion.url_question;
      let url_answer = editQuestion.url_answer;

      if (questionImage) {
        url_question = await uploadImageToImgBB(questionImage);
      }
      if (answerImage) {
        url_answer = await uploadImageToImgBB(answerImage);
      }

      const questionData = {
        question: editQuestion.question.trim(),
        answer: editQuestion.answer.trim(),
        documentId: selectedDocumentFilter,
        url_question,
        url_answer,
      };

      await updateQuestion(editQuestion.id, questionData);

      const document = documents.find(
        (doc) => doc.id === questionData.documentId
      );

      setQuestions((prevQuestions) =>
        prevQuestions.map((question) =>
          question.id === editQuestion.id
            ? {
                ...question,
                ...questionData,
                documentTitle: document?.title || question.documentTitle,
                categoryId: document?.categoryId || question.categoryId,
                categoryTitle:
                  document?.categoryTitle || question.categoryTitle,
                categoryLogo: document?.categoryLogo || question.categoryLogo,
              }
            : question
        )
      );

      setShowEditModal(false);
      setQuestionImage(null);
      setAnswerImage(null);
      setQuestionImageUrl("");
      setAnswerImageUrl("");
      if (questionImageInputRef.current)
        questionImageInputRef.current.value = "";
      if (answerImageInputRef.current) answerImageInputRef.current.value = "";

      setSuccessMessage("Đã cập nhật câu hỏi thành công!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error updating question:", error);
      setFormError("Lỗi khi cập nhật câu hỏi: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError("");
      await deleteQuestion(questionToDelete.id);
      clearQuestionsCache();
      await reloadQuestions();
      setShowDeleteModal(false);
      setDeleteSuccess("Đã xóa câu hỏi thành công!");

      setTimeout(() => {
        setDeleteSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting question:", error);
      setDeleteError("Lỗi khi xóa câu hỏi: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (question) => {
    setEditQuestion({
      id: question.id,
      question: question.question,
      answer: question.answer,
      documentId: selectedDocumentFilter,
      url_question: question.url_question || "",
      url_answer: question.url_answer || "",
    });
    setQuestionImageUrl(question.url_question || "");
    setAnswerImageUrl(question.url_answer || "");
    setShowEditModal(true);
  };

  const openDeleteModal = (question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  };

  const normalize = (str) => str?.toLowerCase().trim();

  function groupDuplicates(arr, key) {
    const map = new Map();
    arr.forEach((item) => {
      const val = normalize(item[key]);
      if (!val) return;
      if (!map.has(val)) map.set(val, []);
      map.get(val).push(item);
    });
    return Array.from(map.values()).filter((group) => group.length > 1);
  }

  function groupDuplicatesBoth(arr) {
    const map = new Map();
    arr.forEach((item) => {
      const q = normalize(item.question);
      const a = normalize(item.answer);
      if (!q || !a) return;
      const key = q + "||" + a;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.values()).filter((group) => group.length > 1);
  }

  const getFilteredQuestions = () => {
    let filtered = questions;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (question) =>
          question.question?.toLowerCase().includes(query) ||
          question.answer?.toLowerCase().includes(query) ||
          question.documentTitle?.toLowerCase().includes(query)
      );
    }
    if (filterDuplicateQuestion && filterDuplicateAnswer) {
      const groups = groupDuplicatesBoth(filtered);
      let stt = 1;
      let result = [];
      groups.forEach((group) => {
        result = result.concat(group.map((q) => ({ ...q, _groupStt: stt })));
        stt++;
      });
      const groupedIds = new Set(result.map((q) => q.id));
      filtered.forEach((q) => {
        if (!groupedIds.has(q.id)) {
          result.push({ ...q, _groupStt: stt });
          stt++;
        }
      });
      return result;
    } else if (filterDuplicateQuestion) {
      const groups = groupDuplicates(filtered, "question");
      let stt = 1;
      let result = [];
      groups.forEach((group) => {
        result = result.concat(group.map((q) => ({ ...q, _groupStt: stt })));
        stt++;
      });
      const groupedIds = new Set(result.map((q) => q.id));
      filtered.forEach((q) => {
        if (!groupedIds.has(q.id)) {
          result.push({ ...q, _groupStt: stt });
          stt++;
        }
      });
      return result;
    } else if (filterDuplicateAnswer) {
      const groups = groupDuplicates(filtered, "answer");
      let stt = 1;
      let result = [];
      groups.forEach((group) => {
        result = result.concat(group.map((q) => ({ ...q, _groupStt: stt })));
        stt++;
      });
      const groupedIds = new Set(result.map((q) => q.id));
      filtered.forEach((q) => {
        if (!groupedIds.has(q.id)) {
          result.push({ ...q, _groupStt: stt });
          stt++;
        }
      });
      return result;
    }
    return filtered;
  };

  const filteredQuestions = getFilteredQuestions();

  const handleApplyFilter = async () => {
    // Support both single and multiple categories/documents
    const categoriesToFilter = Array.isArray(filterCategory) ? filterCategory : (filterCategory ? [filterCategory] : []);
    const documentsToFilter = Array.isArray(filterDocument) ? filterDocument : (filterDocument ? [filterDocument] : []);
    
    if (categoriesToFilter.length === 0 || documentsToFilter.length === 0) return;
    
    try {
      setLoading(true);
      
      // Get questions from all selected documents
      let allQuestionsData = [];
      let allDocumentDetails = [];
      
      for (const docId of documentsToFilter) {
        try {
          const questionsData = await getQuestionsByDocument(docId);
          
          // Find which category this document belongs to
          let documentDetails = null;
          let documentCategoryId = null;
          
          for (const categoryId of categoriesToFilter) {
            if (categoryDocuments[categoryId]) {
              documentDetails = categoryDocuments[categoryId].find(
                (doc) => doc.id === docId
              );
              if (documentDetails) {
                documentCategoryId = categoryId;
                break;
              }
            }
          }
          
          if (!documentDetails) {
            // Fallback if document not found in selected categories
            documentDetails = {
              id: docId,
              title: "Unknown Document",
              categoryId: categoriesToFilter[0],
            };
            documentCategoryId = categoriesToFilter[0];
          }
          
          allDocumentDetails.push(documentDetails);
          
          // Add document info to each question
          const questionsWithDocInfo = questionsData.map((question) => ({
            ...question,
            documentTitle: documentDetails.title || "",
            documentId: documentDetails.id || "",
            categoryId: documentCategoryId || "",
            categoryTitle: allCategories.find(cat => cat.id === documentCategoryId)?.title || "",
            categoryLogo: allCategories.find(cat => cat.id === documentCategoryId)?.logo || null,
            url_question: question.url_question || "",
            url_answer: question.url_answer || "",
          }));
          
          allQuestionsData = [...allQuestionsData, ...questionsWithDocInfo];
        } catch (docError) {
          console.error(`Error loading questions for document ${docId}:`, docError);
        }
      }
      
      setQuestions(allQuestionsData || []);
      
      // Set the first document and category as primary selection for compatibility
      if (documentsToFilter.length > 0) {
        setSelectedDocumentFilter(documentsToFilter[0]);
        setSelectedDocument(documentsToFilter[0]);
      }
      
      if (categoriesToFilter.length > 0) {
        setSelectedCategory(categoriesToFilter[0]);
      }
      
      setDocuments(allDocumentDetails);
      setShowFilterModal(false);
      setLoading(false);
    } catch (error) {
      console.error("Error applying filter:", error);
      setError("Không thể áp dụng bộ lọc: " + error.message);
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredQuestions.map((q) => q.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    setDeleteError("");
    let errorCount = 0;
    try {
      setIsDeleting(true);
      for (const id of selectedRows) {
        try {
          await deleteQuestion(id);
        } catch (err) {
          errorCount++;
          console.error("Lỗi khi xóa câu hỏi:", err);
        }
      }
      clearQuestionsCache();
      await reloadQuestions();
      setSelectedRows([]);
      if (errorCount === 0) {
        setDeleteSuccess("Đã xóa tất cả các câu hỏi đã chọn!");
      } else {
        setDeleteError(
          `Có ${errorCount} câu hỏi không xóa được. Vui lòng thử lại.`
        );
      }
      setTimeout(() => {
        setDeleteSuccess("");
        setDeleteError("");
      }, 3000);
      setShowBulkDeleteModal(false);
    } catch (error) {
      setDeleteError("Lỗi khi xóa hàng loạt: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearQuestionsCache = () => {
    if (!selectedDocumentFilter) return;
    const cacheKey = `questions_${selectedDocumentFilter}`;
    try {
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(`${cacheKey}_meta`);
    } catch (e) {
      // Không cần báo lỗi nếu cache không tồn tại
    }
  };

  const reloadQuestions = async () => {
    if (!selectedDocumentFilter) return;
    setLoading(true);
    try {
      const questionsData = await getQuestionsByDocument(
        selectedDocumentFilter
      );
      let documentDetails = null;
      if (
        categoryDocuments &&
        selectedCategory &&
        categoryDocuments[selectedCategory]
      ) {
        documentDetails = categoryDocuments[selectedCategory].find(
          (doc) => doc.id === selectedDocumentFilter
        );
      }
      const categoryDetails = allCategories.find(
        (cat) => cat.id === selectedCategory
      ) || { id: selectedCategory, title: "Unknown Category" };
      const questionsWithInfo = questionsData.map((question) => ({
        ...question,
        documentTitle: documentDetails?.title || "",
        documentId: documentDetails?.id || "",
        categoryId: categoryDetails.id || "",
        categoryTitle: categoryDetails.title || "",
        categoryLogo: categoryDetails.logo || null,
        url_question: question.url_question || "",
        url_answer: question.url_answer || "",
      }));
      setQuestions(questionsWithInfo || []);
    } catch (err) {
      setError("Không thể tải lại danh sách câu hỏi: " + err.message);
    }
    setLoading(false);
  };

  // Lấy documentTitle hiện tại
  const currentDocumentTitle =
    documents.find((doc) => doc.id === selectedDocumentFilter)?.title ||
    "DanhSachCauHoi";

  // Hàm xuất Excel chỉ gồm 3 cột, tên file theo documentTitle
  const handleExportExcel = () => {
    const data = filteredQuestions.map((q, idx) => ({
      STT: idx + 1,
      "Câu hỏi": q.question,
      "Đáp án": q.answer,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, `${currentDocumentTitle}.xlsx`);
  };

  // Hàm xuất Word (docx) dạng "Câu X: ...", tiêu đề và tên file theo documentTitle
  const handleExportWord = async () => {
    async function fetchImageBuffer(url) {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return buffer;
      } catch {
        return null;
      }
    }

    const paragraphs = [];
    for (let idx = 0; idx < filteredQuestions.length; idx++) {
      const q = filteredQuestions[idx];
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${idx + 1}: ${q.question}`, bold: true }),
          ],
        })
      );

      // Ảnh minh họa cho câu hỏi
      if (q.url_question) {
        const imgBuffer = await fetchImageBuffer(q.url_question);
        if (imgBuffer) {
          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 320, height: 180 },
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      }

      // Đáp án
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: q.answer })],
        })
      );

      // Ảnh đáp án
      if (q.url_answer) {
        const imgBuffer = await fetchImageBuffer(q.url_answer);
        if (imgBuffer) {
          paragraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 320, height: 180 },
                }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      } else {
        paragraphs.push(
          new Paragraph({
            children: [],
            spacing: { after: 200 },
          })
        );
      }
    }

    const docx = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: currentDocumentTitle,
                  bold: true,
                  size: 32,
                }),
              ],
              spacing: { after: 400 },
            }),
            ...paragraphs,
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${currentDocumentTitle}.docx`);
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-slate-100"
      }`}
    >
      {windowWidth < 770 && (
        <DocumentMobileHeader
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
                user={user}
                isDarkMode={isDarkMode}
                setIsThemePickerOpen={setIsThemePickerOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              />
            </div>
          )}

          {isThemePickerOpen && (
            <ThemeColorPicker onClose={() => setIsThemePickerOpen(false)} />
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
                <h1 className="text-2xl font-bold mb-4 md:mb-0">
                  Quản lý Bộ Câu Hỏi
                </h1>

                <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                  <button
                    className={`px-4 py-2 rounded-md ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-500 hover:bg-blue-600"
                    } text-white transition-colors`}
                    onClick={() => setShowAddModal(true)}
                  >
                    <span className="flex items-center justify-center">
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
                      Thêm Câu Hỏi Mới
                    </span>
                  </button>
                  {/* Nút xuất Excel */}
                  <button
                    className={`px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors`}
                    onClick={handleExportExcel}
                    title="Tải xuống Excel"
                  >
                    Excel
                  </button>
                  {/* Nút xuất Word */}
                  <button
                    className={`px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors`}
                    onClick={handleExportWord}
                    title="Tải xuống Word"
                  >
                    Word
                  </button>
                </div>
              </div>

              {successMessage && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                  {successMessage}
                </div>
              )}

              {deleteSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                  {deleteSuccess}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                  <div className="flex-1">
                    <label
                      htmlFor="search"
                      className="block text-sm font-medium mb-1"
                    >
                      Tìm kiếm câu hỏi
                    </label>
                    <input
                      type="text"
                      id="search"
                      className={`w-full rounded-md ${
                        isDarkMode
                          ? "bg-gray-700 text-white border-gray-600"
                          : "bg-white text-gray-900 border-gray-300"
                      } border px-3 py-2`}
                      placeholder="Tìm theo câu hỏi, câu trả lời hoặc tên tài liệu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="w-full md:w-64">
                    <label className="block text-sm font-medium mb-1">
                      Bộ câu hỏi
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFilterModal(true)}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-md ${
                        isDarkMode
                          ? "bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                          : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
                      } border transition-colors`}
                    >
                      <span>
                        {documents.length > 0
                          ? documents.find(
                              (doc) => doc.id === selectedDocumentFilter
                            )?.title || "Chọn bộ câu hỏi"
                          : "Chọn bộ câu hỏi"}
                      </span>
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <label className="block text-sm font-medium mb-1">
                    Lọc trùng
                  </label>
                  <div className="flex flex-row space-x-4 p-3 rounded-md border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 border-gray-200">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={filterDuplicateQuestion}
                        onChange={(e) =>
                          setFilterDuplicateQuestion(e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm">
                        Câu hỏi trùng/gần giống
                      </span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={filterDuplicateAnswer}
                        onChange={(e) =>
                          setFilterDuplicateAnswer(e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm">
                        Câu trả lời trùng/gần giống
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <QuestionTable
                loading={loading}
                filteredQuestions={filteredQuestions}
                isDarkMode={isDarkMode}
                selectedRows={selectedRows}
                handleSelectAll={handleSelectAll}
                handleDeleteSelected={handleDeleteSelected}
                isDeleting={isDeleting}
                handleSelectRow={handleSelectRow}
                openEditModal={openEditModal}
                openDeleteModal={openDeleteModal}
                setSelectedRows={setSelectedRows}
              />
            </div>
          </main>
        </div>
      </div>

      {showAddModal && (
        <AddQuestionModal
          showAddModal={showAddModal}
          isDarkMode={isDarkMode}
          formError={formError}
          imageError={imageError}
          handleAddQuestion={handleAddQuestion}
          questionType={questionType}
          setQuestionType={setQuestionType}
          documents={documents}
          allCategories={allCategories}
          categoryDocuments={categoryDocuments}
          selectedDocumentFilter={selectedDocumentFilter}
          setSelectedDocumentFilter={setSelectedDocumentFilter}
          newQuestion={newQuestion}
          handleInputChange={handleInputChange}
          questionImageInputRef={questionImageInputRef}
          questionImage={questionImage}
          questionImageUrl={questionImageUrl}
          setQuestionImage={setQuestionImage}
          setQuestionImageUrl={setQuestionImageUrl}
          answerImageInputRef={answerImageInputRef}
          answerImage={answerImage}
          answerImageUrl={answerImageUrl}
          setAnswerImage={setAnswerImage}
          setAnswerImageUrl={setAnswerImageUrl}
          handleImageChange={handleImageChange}
          fileInputRef={fileInputRef}
          excelFile={excelFile}
          setExcelFile={setExcelFile}
          fileError={fileError}
          handleFileChange={handleFileChange}
          processingExcel={processingExcel}
          uploadProgress={uploadProgress}
          processedRows={processedRows}
          totalRows={totalRows}
          isSubmitting={isSubmitting}
          setShowAddModal={setShowAddModal}
        />
      )}

      {showEditModal && (
        <EditQuestionModal
          showEditModal={showEditModal}
          isDarkMode={isDarkMode}
          formError={formError}
          imageError={imageError}
          handleUpdateQuestion={handleUpdateQuestion}
          documents={documents}
          allCategories={allCategories}
          categoryDocuments={categoryDocuments}
          selectedDocumentFilter={selectedDocumentFilter}
          setSelectedDocumentFilter={setSelectedDocumentFilter}
          editQuestion={editQuestion}
          handleEditInputChange={handleEditInputChange}
          questionImageInputRef={questionImageInputRef}
          questionImage={questionImage}
          questionImageUrl={questionImageUrl}
          setQuestionImage={setQuestionImage}
          setQuestionImageUrl={setQuestionImageUrl}
          answerImageInputRef={answerImageInputRef}
          answerImage={answerImage}
          answerImageUrl={answerImageUrl}
          setAnswerImage={setAnswerImage}
          setAnswerImageUrl={setAnswerImageUrl}
          handleImageChange={handleImageChange}
          setShowEditModal={setShowEditModal}
          isSubmitting={isSubmitting}
        />
      )}

      {showDeleteModal && (
        <DeleteQuestionModal
          showDeleteModal={showDeleteModal}
          isDarkMode={isDarkMode}
          deleteError={deleteError}
          questionToDelete={questionToDelete}
          isDeleteConfirmed={isDeleteConfirmed}
          setIsDeleteConfirmed={setIsDeleteConfirmed}
          setShowDeleteModal={setShowDeleteModal}
          isDeleting={isDeleting}
          handleDeleteQuestion={handleDeleteQuestion}
        />
      )}

      {showFilterModal && (
        <FilterQuestionModal
          showFilterModal={showFilterModal}
          isDarkMode={isDarkMode}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterDocument={filterDocument}
          setFilterDocument={setFilterDocument}
          allCategories={allCategories}
          categoryDocuments={categoryDocuments}
          handleApplyFilter={handleApplyFilter}
          setShowFilterModal={setShowFilterModal}
        />
      )}

      {showBulkDeleteModal && (
        <BulkDeleteModal
          showBulkDeleteModal={showBulkDeleteModal}
          isDarkMode={isDarkMode}
          deleteError={deleteError}
          selectedRows={selectedRows}
          isDeleteConfirmed={isDeleteConfirmed}
          setIsDeleteConfirmed={setIsDeleteConfirmed}
          setShowBulkDeleteModal={setShowBulkDeleteModal}
          isDeleting={isDeleting}
          confirmBulkDelete={confirmBulkDelete}
        />
      )}
    </div>
  );
};

export default QuestionManagement;
