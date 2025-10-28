// studentInforService.js - CRUD cho collection student_infor
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, query } from 'firebase/firestore';
import { db as dbPJ } from './firebase_pj';

const db = dbPJ;
const STUDENT_INFOR_COLLECTION = 'student_infor';

// --- Normalization helpers ---
const replaceUnicodeDashes = (s) =>
  s.replace(/[\u2012\u2013\u2014\u2212\u2010\u2011]/g, '-');

const normalizeWhitespace = (s) => s.replace(/\s+/g, ' ').trim();

// Normalize exam time strings so variants like "07h30–08h30", "7h30 - 8h30", "07:30 - 08:30" compare equal
const normalizeExamTime = (val) => {
  if (val === undefined || val === null) return '';
  try {
    let s = String(val || '');
    s = s.normalize('NFKC'); // normalize unicode composition
    s = replaceUnicodeDashes(s);
    // unify separators: replace colon with 'h' for consistency if present
    s = s.replace(/\s*:\s*/g, 'h');
    // remove spaces around hyphen, then ensure single hyphen between times
    s = s.replace(/\s*-\s*/g, '-');
    // remove all spaces (so '7h30-8h30')
    s = s.replace(/\s+/g, '');
    // remove leading zeros for hours like 07h -> 7h
    s = s.replace(/\b0+(\d)h/gi, '$1h');
    // lower case
    s = s.toLowerCase();
    return s;
  } catch (e) {
    return String(val || '').trim();
  }
};

// General string normalization for subject/room/session: collapse whitespace, normalize unicode, lowercase
const normalizeString = (val) => {
  if (val === undefined || val === null) return '';
  try {
    let s = String(val || '');
    s = s.normalize('NFKC');
    s = s.replace(/[\u2012\u2013\u2014\u2212\u2010\u2011]/g, '-');
    s = normalizeWhitespace(s);
    return s.toLowerCase();
  } catch (e) {
    return String(val || '').trim().toLowerCase();
  }
};

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

    // prepare normalized input values
    const inputSubject = subject ? normalizeString(subject) : '';
    const inputSession = examSession ? normalizeString(examSession) : '';
    const inputTime = examTime ? normalizeExamTime(examTime) : '';
    const inputRoom = examRoom ? normalizeString(examRoom) : '';
    // Nếu examRoom là một link (bắt đầu bằng http), tách ra để so sánh cả số phòng và link phòng
    let inputRoomLink = '';
    let inputRoomNumber = '';
    if (inputRoom.startsWith('http')) {
      inputRoomLink = inputRoom;
    } else if (inputRoom) {
      inputRoomNumber = inputRoom;
    }
    // normalize incoming examDate (support dd/mm/yyyy from CSV)
    const inputExamDate = examDate ? parseDateToYMD(examDate) : '';

    return docs.filter((d) => {
      // examDate: compare normalized ISO Y-M-D
      if (inputExamDate) {
        const dbDate = parseDateToYMD(d.examDate || '');
        if (dbDate !== inputExamDate) return false;
      }

      if (inputSubject) {
        const dbSubject = normalizeString(d.subject || '');
        if (dbSubject !== inputSubject) return false;
      }

      if (inputSession) {
        const dbSession = normalizeString(d.examSession || '');
        if (dbSession !== inputSession) return false;
      }

      if (inputTime) {
        const dbTime = normalizeExamTime(d.examTime || '');
        if (dbTime !== inputTime) return false;
      }

      // So sánh examRoom: nếu input là link thì match nếu db cũng là link giống vậy, nếu input là số thì match nếu db là số giống vậy
      if (inputRoomLink) {
        const dbRoom = normalizeString(d.examRoom || '');
        if (dbRoom !== inputRoomLink) return false;
      } else if (inputRoomNumber) {
        const dbRoom = normalizeString(d.examRoom || '');
        // Nếu dbRoom là link thì bỏ qua, chỉ so sánh số phòng
        if (dbRoom.startsWith('http')) return false;
        if (dbRoom !== inputRoomNumber) return false;
      }

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

    // If value already looks like YYYY-MM-DD, return normalized
    if (typeof val === 'string') {
      const s = val.trim();
      // dd/mm/yyyy or dd-mm-yyyy (common in CSV)
      const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (dm) {
        let day = parseInt(dm[1], 10);
        let month = parseInt(dm[2], 10);
        let year = parseInt(dm[3], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      // ISO-like or other parseable strings
      const maybe = new Date(s);
      if (!isNaN(maybe.getTime())) return maybe.toISOString().slice(0, 10);
      return s;
    }

    // fallback: try Date parsing for non-strings
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return String(val).trim();
  } catch (e) {
    return String(val || '').trim();
  }
};

// Update all student documents that match the criteria with provided updates object.
// Uses batched writes for efficiency.
export const updateStudentsByMatch = async (criteria = {}, updates = {}, options = {}) => {
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

    const force = options && options.force === true;

    // perform updates sequentially (could be batched if needed)
    let updated = 0;
    for (const s of matches) {
      try {
        // Clone payload per-student because we may modify it depending on options
        const perStudentPayload = { ...payload };

        if (!force && perStudentPayload.examLink) {
          // If payload contains examLink and we're not forcing, only apply the link to students that do not already have one.
          const existingLink = s.examLink;
          if (existingLink && String(existingLink).trim() !== "") {
            // remove examLink from this student's payload to avoid overwriting an existing link
            delete perStudentPayload.examLink;
          }
        }

        // If after removing examLink there's nothing left to update, skip.
        if (!perStudentPayload || Object.keys(perStudentPayload).length === 0) {
          continue;
        }

        // Only update the explicit payload fields to avoid overwriting other student data
        await updateDoc(doc(db, STUDENT_INFOR_COLLECTION, s.id), { ...perStudentPayload });
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
