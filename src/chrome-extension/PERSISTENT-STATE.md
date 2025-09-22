# 🚀 Tính năng Persistent State - Chrome Extension

## 📋 Tổng quan

Extension đã được nâng cấp với tính năng **lưu trạng thái** để hỗ trợ làm việc với bộ câu hỏi chia nhiều trang một cách hiệu quả.

## ✨ Tính năng mới

### 1. **Auto-Save Selections**

- **Category selection**: Tự động lưu danh mục đã chọn
- **Document selection**: Tự động lưu tài liệu đã chọn
- **Questions data**: Lưu toàn bộ câu hỏi đã load

### 2. **Auto-Restore khi mở Extension**

- Tự động khôi phục category và document đã chọn
- Hiển thị lại questions từ cache
- Buttons sẵn sàng để sử dụng ngay

### 3. **Multi-Page Support**

- Questions persist giữa các trang web
- Tự động hiển thị indicator khi có cached questions
- So sánh ngay lập tức mà không cần load lại

### 4. **Smart Caching**

- Cache categories, documents, questions
- Merge intelligent để tránh duplicate
- Auto-sync với content script

## 🎯 Use Case: Bộ câu hỏi chia nhiều trang

### Scenario: 10 câu hỏi chia làm 2 trang

#### **Trang 1 (5 câu đầu):**

1. Mở extension → Chọn Category → Document → Load Questions ✅
2. Click "So sánh với trang" → Extension highlight matching questions ✅
3. **Data được tự động lưu cache** 📋

#### **Trang 2 (5 câu cuối):**

1. Chuyển sang trang 2
2. **Indicator tự động xuất hiện**: "📚 10 câu hỏi sẵn sàng" với nút "So sánh ngay" ✨
3. Click "So sánh ngay" → Extension ngay lập tức so sánh và highlight ⚡
4. **Không cần chọn lại Category/Document** 🚀

## 🖥️ User Interface

### **Popup Indicators:**

- **"📋 Sử dụng dữ liệu đã lưu"** - khi load từ cache
- **Nút "Xóa cache"** - để reset lại từ đầu
- **Auto-filled selections** - category/document được chọn sẵn

### **Page Indicators:**

- **Floating indicator** góc phải màn hình: "📚 X câu hỏi sẵn sàng"
- **"So sánh ngay"** button - thực hiện comparison ngay lập tức
- **"✕"** button - ẩn indicator
- **Auto-hide** sau 8 giây

## ⚙️ Cache Management

### **Cache Keys:**

- `tailieu_categories` - Danh sách categories
- `tailieu_documents` - Danh sách documents
- `tailieu_questions` - Câu hỏi hiện tại
- `tailieu_selected_category` - Category ID đã chọn
- `tailieu_selected_document` - Document ID đã chọn

### **Cache Lifecycle:**

- **Save**: Mỗi khi user chọn category/document hoặc load questions
- **Load**: Khi mở popup hoặc load content script
- **Clear**: Click nút "Xóa cache" hoặc chọn category/document mới
- **Sync**: Auto-sync questions với content script

## 🔄 Workflow mới

### **Lần đầu sử dụng:**

1. Mở extension
2. Chọn Category → Document → Load Questions
3. So sánh với trang hiện tại
4. **Extension tự động lưu tất cả**

### **Các lần sau (trên cùng bộ đề):**

1. Chuyển trang mới
2. **Indicator tự động hiện** với số câu hỏi available
3. Click "So sánh ngay" hoặc mở popup (đã filled sẵn)
4. **Immediate comparison** - không delay

### **Bắt đầu bộ đề mới:**

1. Click "Xóa cache" trong popup
2. Chọn Category/Document mới
3. Cache mới được tạo cho bộ đề mới

## 🚀 Lợi ích

- ⚡ **Tốc độ**: Không cần chọn lại selections
- 🎯 **Hiệu quả**: So sánh ngay lập tức trên mọi trang
- 🧠 **Thông minh**: Tự động detect và restore state
- 💡 **User-friendly**: UI indicators rõ ràng và trực quan
- 🔄 **Reliable**: Cache persistent qua browser sessions

## 🛠️ Technical Features

- **Debounce protection**: Tránh spam comparisons
- **Error handling**: Graceful fallback khi cache fails
- **Memory efficient**: Smart merge và cleanup
- **Cross-tab sync**: Questions available trên mọi tab
