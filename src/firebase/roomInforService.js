// roomInforService.js - CRUD cho collection room_infor
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);
const ROOM_INFOR_COLLECTION = 'room_infor';

export const getAllRoomInfor = async () => {
  const querySnapshot = await getDocs(collection(db, ROOM_INFOR_COLLECTION));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

export const subscribeRoomInfor = (onChange, onError) => {
  const colRef = collection(db, ROOM_INFOR_COLLECTION);
  const unsubscribe = onSnapshot(colRef, (querySnapshot) => {
    const data = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    if (typeof onChange === 'function') onChange(data);
  }, (err) => {
    if (typeof onError === 'function') onError(err);
    else console.error('subscribeRoomInfor error', err);
  });

  return unsubscribe;
};

export const addRoomInfor = async (data) => {
  const payload = { ...data };
  const docRef = await addDoc(collection(db, ROOM_INFOR_COLLECTION), payload);
  return { id: docRef.id, ...payload };
};

export const updateRoomInfor = async (id, data) => {
  await updateDoc(doc(db, ROOM_INFOR_COLLECTION, id), { ...data });
};

export const deleteRoomInfor = async (id) => {
  await deleteDoc(doc(db, ROOM_INFOR_COLLECTION, id));
};
