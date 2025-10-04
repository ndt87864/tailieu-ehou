import { db } from './firebase.js';
import { collection, query, where, orderBy, limit, startAfter, getDocs, getDoc, doc } from 'firebase/firestore';

/**
 * Service tối ưu hóa cho Firestore
 */
class OptimizedFirestoreService {
  /**
   * Lấy dữ liệu theo phân trang
   * @param {string} collectionName - Tên collection
   * @param {Object} options - Các tùy chọn truy vấn
   * @returns {Promise<Array>} - Mảng dữ liệu
   */
  async getPaginatedData(collectionName, options = {}) {
    const {
      filters = [],
      orderByField = 'createdAt',
      orderDirection = 'desc',
      pageSize = 10,
      lastVisible = null,
      includeFields = []
    } = options;
    
    try {
      // Xây dựng truy vấn cơ bản
      let q = collection(db, collectionName);
      
      // Thêm các điều kiện lọc
      if (filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }
      
      // Thêm sắp xếp
      q = query(q, orderBy(orderByField, orderDirection));
      
      // Thêm phân trang
      q = query(q, limit(pageSize));
      
      // Nếu có lastVisible, thực hiện phân trang tiếp theo
      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }
      
      // Thực hiện truy vấn
      const snapshot = await getDocs(q);
      
      // Trả về dữ liệu đã lọc các trường không cần thiết
      return {
        data: snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Nếu có danh sách trường cần lấy, chỉ lấy các trường đó
          if (includeFields.length > 0) {
            const filteredData = {};
            includeFields.forEach(field => {
              if (data[field] !== undefined) {
                filteredData[field] = data[field];
              }
            });
            return {
              id: doc.id,
              ...filteredData
            };
          }
          
          return {
            id: doc.id,
            ...data
          };
        }),
        lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      throw error;
    }
  }
  
  /**
   * Lấy dữ liệu một document với cache
   * @param {string} collectionName - Tên collection
   * @param {string} docId - ID của document
   * @returns {Promise<Object>} - Dữ liệu document
   */
  async getDocumentWithCache(collectionName, docId) {
    const cacheKey = `${collectionName}_${docId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // Kiểm tra xem cache có hết hạn chưa (15 phút)
      if (Date.now() - timestamp < 15 * 60 * 1000) {
        return data;
      }
    }
    
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = {
          id: docSnap.id,
          ...docSnap.data()
        };
        
        // Lưu vào cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }
}

export default new OptimizedFirestoreService();
