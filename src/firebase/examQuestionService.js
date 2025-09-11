// Service truy vấn exam_questions
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
/**
 * Thêm mới một câu hỏi đề thi
 * @param {Object} questionData - Dữ liệu câu hỏi
 * @returns {Promise<string>} - ID của câu hỏi vừa thêm
 */
export const addExamQuestion = async (questionData) => {
  if (!questionData) throw new Error("Thiếu dữ liệu câu hỏi");
  const newQuestion = {
    ...questionData,
    stt: typeof questionData.stt === "number" ? questionData.stt : 1,
    createAt: serverTimestamp(),
    updateAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, COLLECTIONS.EXAM_QUESTIONS), newQuestion);
  return docRef.id;
};
import { db } from "./firebase";

export const COLLECTIONS = {
  EXAM_QUESTIONS: "exam_questions"
};

/**
 * Sửa câu hỏi đề thi
 * @param {string} id - ID câu hỏi
 * @param {Object} data - Dữ liệu cập nhật
 * @returns {Promise<void>}
 */
export const updateExamQuestion = async (id, data) => {
  if (!id || !data) throw new Error("Thiếu thông tin sửa câu hỏi");
  const dbInstance = getFirestore();
  const docRef = doc(dbInstance, COLLECTIONS.EXAM_QUESTIONS, id);
  await updateDoc(docRef, { ...data, updateAt: serverTimestamp() });
};

/**
 * Xóa câu hỏi đề thi
 * @param {string} id - ID câu hỏi
 * @returns {Promise<void>}
 */
export const deleteExamQuestion = async (id) => {
  if (!id) throw new Error("Thiếu ID câu hỏi để xóa");
  const dbInstance = getFirestore();
  const docRef = doc(dbInstance, COLLECTIONS.EXAM_QUESTIONS, id);
  await deleteDoc(docRef);
};

/**
 * Lấy tất cả câu hỏi đề thi
 * @returns {Promise<Array>} Mảng câu hỏi đề thi
 */
export const getAllExamQuestions = async () => {
  const q = query(collection(db, COLLECTIONS.EXAM_QUESTIONS), orderBy("stt"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
