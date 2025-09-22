# ✅ API Parameters - Lọc dữ liệu theo điều kiện

## 🔧 Các API endpoint đã được cập nhật:

### 1. Categories API

```
GET /api/categories
```

- Trả về: `{ categories: [{ id, title }] }`
- Không có tham số - luôn trả về tất cả categories

### 2. Documents API

```
GET /api/documents                    # Tất cả documents
GET /api/documents?categoryId=xxx     # Documents theo category
```

- Trả về: `{ documents: [{ id, title, categoryId }] }`
- **Tham số**: `categoryId` (optional) - Lọc documents theo category

### 3. Questions API

```
GET /api/questions                    # Tất cả questions
GET /api/questions?documentId=xxx     # Questions theo document
```

- Trả về: `{ questions: [{ question, answer, documentId }] }`
- **Tham số**: `documentId` (optional) - Lọc questions theo document

## 🎯 Chrome Extension Flow:

1. **Load Categories** → Hiển thị dropdown danh mục
2. **Chọn Category** → Load documents với `?categoryId=xxx`
3. **Chọn Document** → Load questions với `?documentId=xxx`
4. **Hiển thị** câu hỏi và đáp án của document được chọn

## 📡 Test API với curl:

```bash
# Lấy tất cả categories
curl "http://localhost:3001/api/categories"

# Lấy tất cả documents
curl "http://localhost:3001/api/documents"

# Lấy documents của category cụ thể
curl "http://localhost:3001/api/documents?categoryId=abc123"

# Lấy tất cả questions
curl "http://localhost:3001/api/questions"

# Lấy questions của document cụ thể
curl "http://localhost:3001/api/questions?documentId=def456"
```

## 🚀 Lợi ích:

- ⚡ **Hiệu suất tốt hơn**: Chỉ tải dữ liệu cần thiết
- 🎯 **Lọc chính xác**: Documents theo category, Questions theo document
- 📱 **UX tốt hơn**: Extension load nhanh và smooth
- 🔧 **Flexible**: Có thể dùng với hoặc không có parameters

## 🛠️ Extension Workflow:

1. Mở extension → Load categories
2. Chọn category → Load documents của category đó
3. Chọn document → Load questions của document đó
4. Xem danh sách câu hỏi được lọc chính xác

**Giờ API đã tối ưu và extension hoạt động hiệu quả hơn!** ⚡
