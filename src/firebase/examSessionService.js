import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db as dbPJ } from './firebase_pj.js';

export const COLLECTIONS = {
  EXAM_SESSIONS: 'exam_sessions',
};

export const getAllExamSessions = async () => {
  try {
    const q = query(
      collection(dbPJ, COLLECTIONS.EXAM_SESSIONS),
      orderBy('startTime', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('getAllExamSessions error', error);
    return [];
  }
};

export const getExamSessionById = async (id) => {
  try {
    const ref = doc(dbPJ, COLLECTIONS.EXAM_SESSIONS, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('getExamSessionById error', error);
    return null;
  }
};

export const addExamSession = async (data) => {
  try {
    const payload = {
      ...data,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(dbPJ, COLLECTIONS.EXAM_SESSIONS), payload);
    return { id: ref.id, ...payload };
  } catch (error) {
    console.error('addExamSession error', error);
    throw error;
  }
};

export const updateExamSession = async (id, data) => {
  try {
    const ref = doc(dbPJ, COLLECTIONS.EXAM_SESSIONS, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('updateExamSession error', error);
    throw error;
  }
};

export const deleteExamSession = async (id) => {
  try {
    await deleteDoc(doc(dbPJ, COLLECTIONS.EXAM_SESSIONS, id));
    return true;
  } catch (error) {
    console.error('deleteExamSession error', error);
    throw error;
  }
};

export const getExamSessionsByPage = async (page = 1, pageSize = 20, lastDoc = null) => {
  try {
    let q = query(
      collection(dbPJ, COLLECTIONS.EXAM_SESSIONS),
      orderBy('startTime', 'asc'),
      limit(pageSize)
    );
    // Note: paging using lastDoc (DocumentSnapshot) can be implemented by callers.
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('getExamSessionsByPage error', error);
    return [];
  }
};

export default {
  COLLECTIONS,
  getAllExamSessions,
  getExamSessionById,
  addExamSession,
  updateExamSession,
  deleteExamSession,
  getExamSessionsByPage,
};
