// studentInforService.js - CRUD cho collection student_infor
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
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
  const docRef = await addDoc(collection(db, STUDENT_INFOR_COLLECTION), payload);
  return { id: docRef.id, ...payload };
};

export const updateStudentInfor = async (id, data) => {
  const payload = { ...data };
  if (payload.dob) {
    try {
      const d = (payload.dob instanceof Date) ? payload.dob : new Date(payload.dob);
      if (!isNaN(d.getTime())) payload.dob = Timestamp.fromDate(d);
    } catch (e) {
      console.warn('updateStudentInfor: failed to convert dob to Timestamp', e);
    }
  }
  await updateDoc(doc(db, STUDENT_INFOR_COLLECTION, id), payload);
};

export const deleteStudentInfor = async (id) => {
  await deleteDoc(doc(db, STUDENT_INFOR_COLLECTION, id));
};
