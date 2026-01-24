import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const SETTINGS_DOC_ID = "global_settings";
const SETTINGS_COLLECTION = "app_settings";

/**
 * Lấy cài đặt ứng dụng từ Firestore
 * @returns {Promise<Object>} - Cài đặt ứng dụng
 */
export const getAppSettings = async () => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }

        // Trả về giá trị mặc định nếu chưa có
        return {
            studentPageEnabled: true, // Mặc định bật
            // Default question rate settings (percent)
            questionRates: {
                guest: 20,
                free: 50,
                paidPerCategoryDefault: 50,
                paidFullOrPaidCategoryPaid: 100,
            },
        };
    } catch (error) {
        console.error("Error fetching app settings:", error);
        return {
            studentPageEnabled: true,
            questionRates: {
                guest: 20,
                free: 50,
                paidPerCategoryDefault: 50,
                paidFullOrPaidCategoryPaid: 100,
            },
        };
    }
};

/**
 * Cập nhật cài đặt ứng dụng
 * @param {Object} settings - Cài đặt cần cập nhật
 * @returns {Promise<void>}
 */
export const updateAppSettings = async (settings) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error("Error updating app settings:", error);
        throw error;
    }
};

/**
 * Bật/tắt tính năng StudentPage
 * @param {boolean} enabled - true để bật, false để tắt
 * @returns {Promise<void>}
 */
export const setStudentPageEnabled = async (enabled) => {
    return updateAppSettings({ studentPageEnabled: enabled });
};

/**
 * Subscribe realtime cài đặt ứng dụng
 * @param {Function} callback - Callback khi có thay đổi
 * @returns {Function} - Unsubscribe function
 */
export const subscribeAppSettings = (callback) => {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);

    return onSnapshot(
        docRef,
        (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                // Trả về giá trị mặc định
                    callback({
                        studentPageEnabled: true,
                        questionRates: {
                            guest: 20,
                            free: 50,
                            paidPerCategoryDefault: 50,
                            paidFullOrPaidCategoryPaid: 100,
                        },
                    });
            }
        },
        (error) => {
            console.error("Error subscribing to app settings:", error);
            callback({
                studentPageEnabled: true,
                questionRates: {
                    guest: 20,
                    free: 50,
                    paidPerCategoryDefault: 50,
                    paidFullOrPaidCategoryPaid: 100,
                },
            });
        }
    );
};
