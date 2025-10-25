// roomInforService.js - CRUD cho collection room_infor
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
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
  try {
    await updateDoc(doc(db, ROOM_INFOR_COLLECTION, id), { ...data });
  } catch (err) {
    // If the document does not exist, updateDoc throws an error "No document to update".
    // In that case, create the document instead so callers who expect the record to exist
    // (for example when IDs are derived elsewhere) still succeed.
    const msg = String(err?.message || "");
    if (msg.includes("No document to update") || (err && err.code === "not-found")) {
      try {
        await setDoc(doc(db, ROOM_INFOR_COLLECTION, id), { ...data });
        return;
      } catch (e) {
        console.error("updateRoomInfor: failed to create missing doc", id, e);
        throw e;
      }
    }
    throw err;
  }
};

export const deleteRoomInfor = async (id) => {
  await deleteDoc(doc(db, ROOM_INFOR_COLLECTION, id));
};
