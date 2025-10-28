// studentInforService.js - CRUD cho collection student_infor
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, query } from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);
const STUDENT_INFOR_COLLECTION = 'student_infor';

export const getAllStudentInfor = async () => {
  const querySnapshot = await getDocs(collection(db, STUDENT_INFOR_COLLECTION));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

// Subscribe to realtime updates for student_infor collection.
// onChange will be called with an array of documents ({id, ...data}).
// Returns an unsubscribe function.
export const subscribeStudentInfor = (onChange, onError) => {
  const colRef = collection(db, STUDENT_INFOR_COLLECTION);
  const unsubscribe = onSnapshot(colRef, (querySnapshot) => {
    const data = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    if (typeof onChange === 'function') onChange(data);
  }, (err) => {
    if (typeof onError === 'function') onError(err);
    else console.error('subscribeStudentInfor error', err);
  });

  return unsubscribe;
};

export const addStudentInfor = async (data) => {
  const payload = { ...data };
  // Convert dob to Firestore Timestamp if it's a parseable date string or Date
  if (payload.dob) {
    try {
      const d = (payload.dob instanceof Date) ? payload.dob : new Date(payload.dob);
      if (!isNaN(d.getTime())) payload.dob = Timestamp.fromDate(d);
    } catch (e) {
      // leave as-is if conversion fails
      console.warn('addStudentInfor: failed to convert dob to Timestamp', e);
    }
  }
  // Convert examDate to Firestore Timestamp if provided and parseable
  if (payload.examDate) {
    try {
      const ed = (payload.examDate instanceof Date) ? payload.examDate : new Date(payload.examDate);
      if (!isNaN(ed.getTime())) payload.examDate = Timestamp.fromDate(ed);
    } catch (e) {
      console.warn('addStudentInfor: failed to convert examDate to Timestamp', e);
    }
  }
  const docRef = await addDoc(collection(db, STUDENT_INFOR_COLLECTION), payload);
  return { id: docRef.id, ...payload };
};

export const updateStudentInfor = async (id, data) => {
  const payload = { ...data };
  try {
    // Debug log
    console.log('[updateStudentInfor] id:', id, 'payload:', payload);
    if (payload.dob) {
      try {
        const d = (payload.dob instanceof Date) ? payload.dob : new Date(payload.dob);
        if (!isNaN(d.getTime())) payload.dob = Timestamp.fromDate(d);
      } catch (e) {
        console.warn('updateStudentInfor: failed to convert dob to Timestamp', e);
      }
    }
    if (payload.examDate) {
      try {
        const ed = (payload.examDate instanceof Date) ? payload.examDate : new Date(payload.examDate);
        if (!isNaN(ed.getTime())) payload.examDate = Timestamp.fromDate(ed);
      } catch (e) {
        console.warn('updateStudentInfor: failed to convert examDate to Timestamp', e);
      }
    }
    await updateDoc(doc(db, STUDENT_INFOR_COLLECTION, id), payload);
    console.log('[updateStudentInfor] SUCCESS for id:', id);
  } catch (err) {
    console.error('[updateStudentInfor] ERROR for id:', id, err);
    throw err;
  }
};

export const deleteStudentInfor = async (id) => {
  await deleteDoc(doc(db, STUDENT_INFOR_COLLECTION, id));
};
 
// Bulk delete: delete up to 10 student records at once
export const bulkDeleteStudentInfor = async (ids = []) => {
  if (!Array.isArray(ids)) throw new Error("Input must be an array of IDs");
  const toDelete = ids.slice(0, 10); // Only delete up to 10 records
  const promises = toDelete.map(id => deleteDoc(doc(db, STUDENT_INFOR_COLLECTION, id)));
  await Promise.all(promises);
  return toDelete.length;
};

// Get student documents that match provided criteria.
// criteria: { subject, examSession, examTime, examRoom, examDate? }
export const getStudentsByMatch = async (criteria = {}) => {
  try {
    const { subject, examSession, examTime, examRoom, examDate } = criteria;
    // Build a simple query by filtering client-side since compound queries require indexes.
    // For now, fetch all and filter — acceptable for moderate dataset sizes.
    const qSnap = await getDocs(collection(db, STUDENT_INFOR_COLLECTION));
    const docs = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const norm = (v) => (v === undefined || v === null ? '' : String(v).trim());

    return docs.filter((d) => {
      if (examDate && norm(parseDateToYMD(d.examDate || '')) !== norm(examDate)) return false;
      if (subject && norm(d.subject || '') !== norm(subject)) return false;
      if (examSession && norm(d.examSession || '') !== norm(examSession)) return false;
      // BỎ điều kiện kiểm tra examTime để luôn đồng bộ dù sinh viên có trường thời gian rỗng hay không
      if (examRoom && norm(d.examRoom || '') !== norm(examRoom)) return false;
      return true;
    });
  } catch (err) {
    console.error('getStudentsByMatch error', err);
    return [];
  }
};

// Helper to normalize date fields saved as Timestamp or string to YYYY-MM-DD
const parseDateToYMD = (val) => {
  try {
    if (!val) return '';
    // Firestore Timestamp
    if (val && typeof val === 'object' && typeof val.toDate === 'function') {
      const d = val.toDate();
      return d.toISOString().slice(0, 10);
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return String(val).trim();
  } catch (e) {
    return String(val || '').trim();
  }
};

// Update all student documents that match the criteria with provided updates object.
// Uses batched writes for efficiency.
export const updateStudentsByMatch = async (criteria = {}, updates = {}) => {
  try {
    if (!criteria || Object.keys(criteria).length === 0) return { updated: 0 };
    const matches = await getStudentsByMatch(criteria);
    if (!matches || matches.length === 0) return { updated: 0 };

    // Only apply relevant fields
    const allowed = ['subject', 'examDate', 'examSession', 'examTime', 'examRoom', 'examLink'];
    const payload = {};
    Object.keys(updates || {}).forEach((k) => {
      if (allowed.includes(k)) payload[k] = updates[k];
    });

    if (Object.keys(payload).length === 0) return { updated: 0 };

    // perform updates sequentially (could be batched if needed)
    let updated = 0;
    for (const s of matches) {
      try {
        // Only update the explicit payload fields to avoid overwriting other student data
        await updateDoc(doc(db, STUDENT_INFOR_COLLECTION, s.id), { ...payload });
        updated++;
      } catch (e) {
        console.warn('updateStudentsByMatch: failed to update', s.id, e);
      }
    }

    return { updated };
  } catch (err) {
    console.error('updateStudentsByMatch error', err);
    return { updated: 0 };
  }
};
