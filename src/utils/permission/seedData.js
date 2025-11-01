import { seedDataToFirestore } from '../../firebase/firestoreService.js';
import { sidebarData, titlesData } from '../../data/data.jsx';
import codeProtect from './codeProtect.js';
import antiDebug from './antiDebug.js';
import sourceRemapper from './sourceRemapper.js';
const isProduction = process.env.NODE_ENV === 'production';
const runSeed = async () => {
  try {
    if (isProduction) {
      codeProtect.initialize();
      antiDebug.initialize();
      sourceRemapper.initialize();
    } else {
      console.log('Bắt đầu nạp dữ liệu vào Firestore...');
      console.log('Dữ liệu sidebar:', sidebarData);
      console.log('Dữ liệu tiêu đề:', titlesData);
    }
    const result = await seedDataToFirestore(sidebarData, titlesData);
    if (result) {
      if (!isProduction) {
        console.log('Đã nạp dữ liệu thành công!');
      }
    }
  } catch (error) {
    if (!isProduction) {
      console.error('Lỗi khi nạp dữ liệu:', error);
    }
  }
};
runSeed();
export default runSeed;