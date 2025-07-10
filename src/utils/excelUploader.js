import * as XLSX from 'xlsx';
import { 
  collection, addDoc, getDocs, query, where, 
  doc, setDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { slugify } from './stringUtils';

/**
 * Process Excel file and upload data to Firestore
 * @param {File} file - The Excel file to process
 * @returns {Promise<Object>} - Upload statistics
 */
export const processExcelFile = async (file) => {
  try {
    // Read the Excel file
    const data = await readExcelFile(file);
    
    if (!data || !data.length) {
      throw new Error('No data found in Excel file');
    }
    
    // Validate required columns
    validateExcelColumns(data[0]);
    
    // Process and upload data
    const result = await uploadDataToFirestore(data);
    
    return result;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
};

/**
 * Read an Excel file and convert to JSON
 * @param {File} file - The Excel file
 * @returns {Promise<Array>} - Array of data rows
 */
const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '',  // Default value for empty cells
          raw: false   // Format dates and numbers
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate that Excel has the required columns
 * @param {Object} firstRow - First row of data
 */
const validateExcelColumns = (firstRow) => {
  const requiredColumns = [
    'STT', 'Câu hỏi', 'Trả lời', 'Ngành', 'Học phần'
  ];
  
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
};

/**
 * Upload data to Firestore, organized by category and document
 * @param {Array} data - Excel data
 * @returns {Promise<Object>} - Upload statistics
 */
const uploadDataToFirestore = async (data) => {
  // Group data by category (Ngành) and document (Học phần)
  const groupedData = groupDataByCategoryAndDocument(data);
  
  const stats = {
    categoriesAdded: 0,
    documentsAdded: 0,
    questionsAdded: 0,
    errors: []
  };
  
  // Get existing categories to avoid duplicates
  const categoriesSnapshot = await getDocs(collection(db, 'categories'));
  const existingCategories = {};
  categoriesSnapshot.forEach(doc => {
    existingCategories[doc.data().title] = doc.id;
  });
  
  // Process each category
  for (const categoryName in groupedData) {
    try {
      // Add or get category
      let categoryId;
      
      if (existingCategories[categoryName]) {
        categoryId = existingCategories[categoryName];
      } else {
        // Create new category
        const slug = slugify(categoryName);
        const categoryData = {
          title: categoryName,
          slug,
          logo: getCategoryLogo(categoryName),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const categoryRef = await addDoc(collection(db, 'categories'), categoryData);
        categoryId = categoryRef.id;
        existingCategories[categoryName] = categoryId;
        stats.categoriesAdded++;
      }
      
      // Get existing documents for this category
      const documentsSnapshot = await getDocs(
        query(collection(db, 'documents'), where('categoryId', '==', categoryId))
      );
      
      const existingDocuments = {};
      documentsSnapshot.forEach(doc => {
        existingDocuments[doc.data().title] = doc.id;
      });
      
      // Process each document in this category
      for (const documentName in groupedData[categoryName]) {
        try {
          // Add or get document
          let documentId;
          
          if (existingDocuments[documentName]) {
            documentId = existingDocuments[documentName];
          } else {
            // Create new document
            const slug = slugify(documentName);
            const documentData = {
              title: documentName,
              slug,
              categoryId,
              categoryLogo: getCategoryLogo(categoryName),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            const documentRef = await addDoc(collection(db, 'documents'), documentData);
            documentId = documentRef.id;
            stats.documentsAdded++;
          }
          
          // Add questions for this document - use batch for efficiency
          const questions = groupedData[categoryName][documentName];
          const batch = writeBatch(db);
          let batchCount = 0;
          
          for (const question of questions) {
            const questionRef = doc(collection(db, 'questions'));
            batch.set(questionRef, {
              stt: parseInt(question.STT) || 0,
              question: question['Câu hỏi'],
              answer: question['Trả lời'],
              documentId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            
            batchCount++;
            
            // Commit in batches of 500 (Firestore limit)
            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }
          
          // Commit any remaining documents
          if (batchCount > 0) {
            await batch.commit();
          }
          
          stats.questionsAdded += questions.length;
        } catch (error) {
          console.error(`Error processing document "${documentName}":`, error);
          stats.errors.push(`Error adding document "${documentName}": ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error processing category "${categoryName}":`, error);
      stats.errors.push(`Error adding category "${categoryName}": ${error.message}`);
    }
  }
  
  return stats;
};

/**
 * Group data by Category and Document
 * @param {Array} data - Excel data
 * @returns {Object} - Data grouped by category and document
 */
const groupDataByCategoryAndDocument = (data) => {
  const grouped = {};
  
  for (const row of data) {
    const category = row['Ngành'] || 'Không xác định';
    const document = row['Học phần'] || 'Không xác định';
    
    if (!grouped[category]) {
      grouped[category] = {};
    }
    
    if (!grouped[category][document]) {
      grouped[category][document] = [];
    }
    
    grouped[category][document].push(row);
  }
  
  return grouped;
};

/**
 * Get a logo identifier based on category name
 * @param {string} categoryName 
 * @returns {string} - Logo identifier
 */
const getCategoryLogo = (categoryName) => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('kinh tế')) return 'economics';
  if (name.includes('kế toán')) return 'accounting';
  if (name.includes('tài chính')) return 'finance';
  if (name.includes('quản trị')) return 'management';
  if (name.includes('marketing')) return 'marketing';
  if (name.includes('kinh doanh')) return 'business';
  if (name.includes('luật')) return 'law';
  if (name.includes('công nghệ')) return 'technology';
  if (name.includes('khoa học')) return 'science';
  if (name.includes('giáo dục')) return 'education';
  if (name.includes('ngôn ngữ')) return 'language';
  if (name.includes('quốc tế')) return 'international';
  
  // Default logo
  return 'education';
};
