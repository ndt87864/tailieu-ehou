// studentInforService.js - CRUD cho collection student_infor
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
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
  const docRef = await addDoc(collection(db, STUDENT_INFOR_COLLECTION), data);
  return { id: docRef.id, ...data };
};

export const updateStudentInfor = async (id, data) => {
  await updateDoc(doc(db, STUDENT_INFOR_COLLECTION, id), data);
};

export const deleteStudentInfor = async (id) => {
  await deleteDoc(doc(db, STUDENT_INFOR_COLLECTION, id));
};
