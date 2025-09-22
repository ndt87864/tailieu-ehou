# Tailieu Questions Chrome Extension

Extension Chrome để hiển thị câu hỏi và đáp án từ API Tailieu.

## 🚀 Tính năng

- Hiển thị popup cho phép chọn danh mục và tài liệu
- Lấy danh sách câu hỏi và đáp án từ tài liệu được chọn
- Giao diện đẹp và dễ sử dụng
- Tích hợp với REST API của Tailieu

## 📦 Cài đặt

### 1. Chuẩn bị API Server

Trước tiên, đảm bảo API server đang chạy:

```bash
cd c:\tailieu\src
npm start
```

Server sẽ chạy tại: http://localhost:3001

### 2. Cài đặt Extension vào Chrome

1. **Mở Chrome và truy cập**: `chrome://extensions/`

2. **Bật Developer mode**: Click toggle "Developer mode" ở góc trên bên phải

3. **Load extension**:

   - Click nút "Load unpacked"
   - Chọn thư mục: `c:\tailieu\src\chrome-extension`
   - Click "Select Folder"

4. **Extension được cài đặt**: Bạn sẽ thấy extension xuất hiện trong danh sách

### 3. Tạo Icons (Tuỳ chọn)

Để extension có icon đẹp, tạo các file sau trong thư mục `icons/`:

- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

## 🎯 Sử dụng

1. **Mở Extension**: Click vào icon extension trên thanh công cụ Chrome

2. **Chọn danh mục**: Dropdown đầu tiên sẽ hiển thị các danh mục từ API

3. **Chọn tài liệu**: Sau khi chọn danh mục, dropdown thứ hai sẽ hiển thị các tài liệu

4. **Tải câu hỏi**: Click nút "Tải câu hỏi" để hiển thị danh sách câu hỏi và đáp án

## 🔧 API Endpoints sử dụng

- `GET /api/categories` - Lấy danh sách danh mục (id, title)
- `GET /api/documents` - Lấy danh sách tài liệu (id, title)
- `GET /api/questions` - Lấy danh sách câu hỏi (question, answer, documentId)

## 🛠️ Cấu hình

Để thay đổi URL API, sửa biến `API_BASE_URL` trong file `popup.js`:

```javascript
const API_BASE_URL = "http://localhost:3001/api";
```

## 🐛 Xử lý lỗi

### Lỗi kết nối API:

- Đảm bảo server API đang chạy tại http://localhost:3001
- Kiểm tra CORS settings trong server
- Mở DevTools (F12) để xem lỗi chi tiết

### Extension không load:

- Đảm bảo manifest.json hợp lệ
- Kiểm tra console trong chrome://extensions/ để xem lỗi
- Thử reload extension

### Không có dữ liệu:

- Kiểm tra kết nối mạng
- Đảm bảo Firestore có dữ liệu
- Kiểm tra API endpoints hoạt động bình thường

## 📝 Development

Để phát triển thêm:

1. **Sửa code**: Chỉnh sửa các file trong thư mục extension
2. **Reload extension**: Vào chrome://extensions/ và click nút reload
3. **Test**: Mở lại popup để test thay đổi

## 🔐 Permissions

Extension yêu cầu các permissions:

- `activeTab`: Để tương tác với tab hiện tại
- `storage`: Để lưu trữ cài đặt
- `host_permissions`: Để truy cập API localhost và domain chính
