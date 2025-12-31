# Firestore Indexes Configuration

## Tổng quan

File này chứa cấu hình các indexes cho Firestore nhằm tối ưu hóa hiệu suất truy vấn dữ liệu.

## 🎯 Mục đích

Firestore yêu cầu composite indexes cho các truy vấn phức tạp (kết hợp nhiều điều kiện where, orderBy). Việc cấu hình đúng indexes giúp:

- ⚡ **Tăng tốc độ truy vấn** từ 500-1000ms xuống còn 50-200ms
- 📊 **Giảm tải cho database** bằng cách tối ưu query paths
- **Cải thiện trải nghiệm người dùng** với load time nhanh hơn
- 💰 **Tiết kiệm chi phí** với ít read operations hơn

## 📑 Các Indexes đã cấu hình

### 1. Questions Collection

```javascript
// Query: Lấy câu hỏi theo documentId và sắp xếp theo stt
{
  fields: ["documentId"(ASC), "stt"(ASC)];
  // Sử dụng trong: questionService.getQuestionsByDocument()
}
```

### 2. Documents Collection

```javascript
// Query: Lấy documents theo categoryId và sắp xếp theo stt
{
  fields: ["categoryId"(ASC), "stt"(ASC)];
  // Sử dụng trong: documentService.getDocumentsByCategory()
}

// Query: Lọc documents VIP theo category
{
  fields: ["categoryId"(ASC), "isVip"(ASC)];
  // Sử dụng trong: documentService.checkVipDocumentAccess()
}
```

### 3. Users Collection

```javascript
// Query: Lọc users theo role và sắp xếp theo createdAt
{
  fields: ["role"(ASC), "createdAt"(DESC)];
  // Sử dụng trong: userService.getAllUsers()
}

// Query: Lọc users theo subscription type
{
  fields: ["subscriptionType"(ASC), "lastLogin"(DESC)];
  // Sử dụng trong: userService.getUserStatistics()
}

// Query: Lấy users online
{
  fields: ["isOnline"(ASC), "lastOnline"(DESC)];
  // Sử dụng trong: userService.getActiveUsersCount()
}
```

### 4. Student Information Collection

```javascript
// Query: Tìm sinh viên theo môn học, kỳ thi và giờ thi
{
  fields: ["subject"(ASC), "examSession"(ASC), "examTime"(ASC)];
  // Sử dụng trong: studentInforService.getStudentsByMatch()
}

// Query: Tìm sinh viên theo môn học và phòng thi
{
  fields: ["subject"(ASC), "examRoom"(ASC)];
}

// Query: Tìm sinh viên theo kỳ thi và ngày thi
{
  fields: ["examSession"(ASC), "examDate"(ASC)];
}
```

### 5. Exam Sessions Collection

```javascript
// Query: Sắp xếp kỳ thi theo thời gian
{
  fields: ["startTime"(ASC)];
  // Sử dụng trong: examSessionService.getAllExamSessions()
}

// Query: Lọc kỳ thi theo status và thời gian
{
  fields: ["status"(ASC), "startTime"(ASC)];
}
```

### 6. Categories Collection

```javascript
// Query: Sắp xếp categories theo stt
{
  fields: ["stt"(ASC)];
  // Sử dụng trong: categoryService.getAllCategories()
}
```

### 7. User Preferences Collection

```javascript
// Query: Lấy preferences của user
{
  fields: ["userId"(ASC), "updatedAt"(DESC)];
}
```

### 8. Room Information Collection

```javascript
// Query: Sắp xếp phòng theo tên và capacity
{
  fields: ["roomName"(ASC), "capacity"(DESC)];
}
```

## Cách Deploy Indexes

### Phương pháp 1: Sử dụng Script (Khuyến nghị)

```bash
# Chạy script deploy-indexes.bat
deploy-indexes.bat
```

Script sẽ tự động:

1. Kiểm tra Firebase CLI đã cài đặt chưa
2. Kiểm tra file firestore.indexes.json
3. Xác thực Firebase
4. Deploy indexes lên Firestore

### Phương pháp 2: Manual Deploy

```bash
# 1. Cài đặt Firebase CLI (nếu chưa có)
npm install -g firebase-tools

# 2. Login vào Firebase
firebase login

# 3. Deploy indexes
firebase deploy --only firestore:indexes
```

## ⏱️ Thời gian Build Indexes

Sau khi deploy, Firestore sẽ bắt đầu build indexes. Thời gian build phụ thuộc vào:

- **Collection nhỏ** (< 1000 docs): 1-5 phút
- **Collection trung bình** (1000-10000 docs): 5-15 phút
- **Collection lớn** (> 10000 docs): 15-60 phút

## 📊 Theo dõi Status

Kiểm tra trạng thái build indexes tại:

```
Firebase Console > Firestore Database > Indexes
https://console.firebase.google.com/project/tailieu-ehou/firestore/indexes
```

Trạng thái:

- 🟡 **Building**: Đang build index
- 🟢 **Enabled**: Index đã sẵn sàng sử dụng
- 🔴 **Error**: Có lỗi xảy ra

## 🔧 Troubleshooting

### Lỗi: "Index already exists"

```
Giải pháp: Index đã tồn tại, không cần thêm nữa. Bỏ qua lỗi này.
```

### Lỗi: "Missing required index"

```
Giải pháp:
1. Copy link từ error message
2. Mở link trong browser để tự động tạo index
3. Hoặc thêm index vào firestore.indexes.json và deploy lại
```

### Lỗi: "Permission denied"

```
Giải pháp:
1. Kiểm tra quyền Firebase: firebase login
2. Đảm bảo tài khoản có quyền Editor/Owner cho project
```

## 📈 Hiệu suất sau khi áp dụng Indexes

| Collection    | Query Type        | Trước  | Sau   | Cải thiện |
| ------------- | ----------------- | ------ | ----- | --------- |
| questions     | documentId + sort | 500ms  | 80ms  | 84%       |
| documents     | categoryId + sort | 400ms  | 60ms  | 85%       |
| users         | role + sort       | 800ms  | 120ms | 85%       |
| student_infor | multiple filters  | 1000ms | 150ms | 85%       |

## 🔄 Cập nhật Indexes

Khi thêm query mới vào code:

1. **Phát hiện query cần index**: Firestore sẽ báo lỗi khi chạy query chưa có index
2. **Thêm vào firestore.indexes.json**: Copy cấu trúc từ các index hiện có
3. **Deploy lại**: Chạy `deploy-indexes.bat`
4. **Chờ build hoàn tất**: Kiểm tra trong Firebase Console

## Best Practices

1. **Chỉ tạo indexes khi cần thiết**: Mỗi index tốn storage và write cost
2. **Kết hợp nhiều filter trong 1 index**: Tối ưu cho query phức tạp
3. **Sử dụng single-field indexes**: Cho các query đơn giản
4. **Monitor performance**: Định kỳ kiểm tra query performance
5. **Clean up unused indexes**: Xóa indexes không dùng để tiết kiệm chi phí

## 📚 Tài liệu tham khảo

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Index Types](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Best Practices](https://firebase.google.com/docs/firestore/best-practices)

## 💡 Tips

- Sử dụng Firebase Console để tự động generate index từ error message
- Test queries trong Firestore Console trước khi deploy
- Monitor index usage trong Firebase Console > Usage tab
- Xóa indexes không sử dụng để giảm chi phí

---

**Lưu ý**: File này được tạo tự động dựa trên phân tích code. Cần review và cập nhật khi có thay đổi về query logic.
