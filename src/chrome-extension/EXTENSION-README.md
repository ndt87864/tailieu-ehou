# Tailieu Questions Chrome Extension

## Mô tả

Chrome Extension giúp tự động tìm kiếm và highlight câu hỏi trên các trang web, so sánh với dữ liệu từ Tailieu API.

## Cấu hình API

### API Endpoints

Extension sẽ sử dụng các endpoints sau:

**Online Production (Ưu tiên):**

- Base URL: `https://tailieuehou.id.vn/api`
- Categories: `/categories.json`
- Documents: `/documents.json`
- Questions: `/questions.json`
- Documents by category: `/documents-{categoryId}.json`
- Questions by document: `/questions-{documentId}.json`

**Local Development:**

- Base URL: `http://localhost:5174/api`
- Dynamic endpoints (không cần .json)

### Logic chọn API

1. **Ưu tiên Online API**: Extension sẽ luôn sử dụng `https://tailieuehou.id.vn/api` trừ khi:
   - URL hiện tại chứa `localhost:5174` hoặc `127.0.0.1:5174`
2. **Xử lý Static Files**: Khi sử dụng online API:
   - Các endpoint sẽ được chuyển đổi thành static JSON files
   - Có fallback logic nếu file cụ thể không tồn tại
   - Timeout 15 giây với retry logic

## Tính năng chính

### 1. Auto-Detection

- Tự động phát hiện câu hỏi trên trang web
- So sánh với database câu hỏi từ extension
- Highlight câu hỏi tìm thấy với tooltip đáp án

### 2. Caching

- Cache categories, documents, questions trong Chrome storage
- Tự động restore selections khi mở lại
- Có thể clear cache thủ công

### 3. Visual Indicators

- Notification banner khi tìm thấy câu hỏi
- Floating indicator với nút "So sánh ngay"
- Progress indicators khi đang so sánh

## Build Process

### Development

```bash
node scripts/build-extension.js
```

### Production

```bash
node scripts/build-extension.js --production
```

Build script sẽ:

1. Thay thế API URLs cho production
2. Copy files vào `public/chrome-extension/`
3. Copy files vào `dist/chrome-extension/` (nếu tồn tại)

## Cài đặt và Sử dụng

### 1. Load Extension vào Chrome

1. Mở Chrome → Extensions → Developer mode
2. Click "Load unpacked"
3. Chọn thư mục `dist/chrome-extension/` hoặc `public/chrome-extension/`

### 2. Sử dụng Extension

1. Click vào icon extension trên toolbar
2. Chọn Category và Document
3. Extension sẽ tự động load câu hỏi và so sánh với trang hiện tại
4. Câu hỏi tìm thấy sẽ được highlight màu vàng với tooltip đáp án

### 3. Auto-Compare

- Extension tự động chạy khi trang web load
- Tự động re-check khi URL thay đổi (SPA support)
- Có debounce logic để tránh spam requests

## Permissions

Extension yêu cầu các permissions sau:

- `activeTab`: Truy cập tab hiện tại để đọc nội dung
- `storage`: Lưu cache dữ liệu
- `scripting`: Inject content script để highlight

## Host Permissions

- `http://localhost:5174/*`: Local development
- `https://tailieuehou.id.vn/*`: Production API
- `https://*.firebaseapp.com/*`: Firebase hosting
- `https://*.web.app/*`: Firebase hosting

## Troubleshooting

### Extension không load được dữ liệu

1. Kiểm tra network connection
2. Mở Developer Tools → Console để xem lỗi
3. Verify API endpoints hoạt động:
   - https://tailieuehou.id.vn/api/categories.json
   - https://tailieuehou.id.vn/api/documents.json

### Extension không tìm thấy câu hỏi

1. Đảm bảo đã chọn đúng Category và Document
2. Thử click "So sánh ngay" manual
3. Trang web có thể có cấu trúc HTML phức tạp

### Cache issues

- Click nút "Xóa cache" trong extension popup
- Hoặc clear extension storage: Chrome Settings → Privacy → Clear browsing data → Cookies and site data

## Development Notes

### API Response Format

```json
{
  "categories": [{ "id": "xxx", "title": "Category Name" }],
  "documents": [{ "id": "xxx", "title": "Document Name", "categoryId": "xxx" }],
  "questions": [
    {
      "question": "Question text",
      "answer": "Answer text",
      "documentId": "xxx"
    }
  ]
}
```

### Content Script Features

- Question detection với multiple algorithms
- Text highlighting without breaking HTML structure
- Answer tooltips on hover
- Auto-cleanup khi navigate pages
- SPA (Single Page Application) support

## Version History

- v1.0.0: Initial release với basic functionality
- Current: Enhanced API handling, better caching, auto-compare features
