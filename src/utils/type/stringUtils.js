/**
 * String Utilities Module
 * Cung cấp các hàm tiện ích để xử lý chuỗi
 */

/**
 * Chuyển đổi chuỗi sang dạng slug (URL-friendly)
 * @param {string} str - Chuỗi cần chuyển đổi
 * @param {string} separator - Ký tự phân cách, mặc định là gạch dưới "_"
 * @returns {string} - Chuỗi đã được chuyển đổi thành dạng slug
 */
export const slugify = (str, separator = '_') => {
  if (!str) return '';
  
  return String(str)
    .normalize('NFD') // tách các ký tự có dấu thành các ký tự không dấu và dấu
    .replace(/[\u0300-\u036f]/g, '') // loại bỏ các dấu
    .toLowerCase()
    .trim()
    .replace(/[^\w-]+/g, separator) // thay thế các ký tự không phải chữ, số hoặc dấu gạch ngang
    .replace(/--+/g, separator) // thay thế nhiều dấu gạch ngang liên tiếp
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); // loại bỏ dấu phân cách ở đầu và cuối
};

/**
 * Chuyển đổi chuỗi sang định dạng CamelCase
 * @param {string} str - Chuỗi cần chuyển đổi
 * @returns {string} - Chuỗi đã được chuyển đổi thành dạng camelCase
 */
export const camelCase = (str) => {
  if (!str) return '';
  
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (match, char) => char.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
};

/**
 * Cắt ngắn chuỗi và thêm dấu "..." vào cuối nếu chuỗi dài hơn độ dài chỉ định
 * @param {string} str - Chuỗi cần cắt
 * @param {number} maxLength - Độ dài tối đa, mặc định là 100
 * @param {string} suffix - Chuỗi thêm vào cuối, mặc định là "..."
 * @returns {string} - Chuỗi đã được cắt ngắn
 */
export const truncate = (str, maxLength = 100, suffix = '...') => {
  if (!str) return '';
  
  if (str.length <= maxLength) return str;
  
  return str.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Loại bỏ các ký tự HTML từ chuỗi
 * @param {string} html - Chuỗi HTML cần xử lý
 * @returns {string} - Chuỗi đã loại bỏ các thẻ HTML
 */
export const stripHtml = (html) => {
  if (!html) return '';
  
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Chuyển đổi chuỗi sang định dạng Title Case (viết hoa chữ cái đầu của mỗi từ)
 * @param {string} str - Chuỗi cần chuyển đổi
 * @returns {string} - Chuỗi đã được chuyển đổi thành Title Case
 */
export const titleCase = (str) => {
  if (!str) return '';
  
  return String(str)
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Tạo ID ngẫu nhiên với độ dài chỉ định
 * @param {number} length - Độ dài của ID, mặc định là 8
 * @returns {string} - ID ngẫu nhiên
 */
export const generateRandomId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

export default {
  slugify,
  camelCase,
  truncate,
  stripHtml,
  titleCase,
  generateRandomId
};
