# 🔧 Chrome Extension Fix - HƯỚNG DẪN SỬA LỖI API

## ❌ Vấn đề hiện tại

Chrome Extension không gọi được API sau khi deploy vì:

1. Extension không được include trong dist/
2. API endpoint detection chưa chính xác

## ✅ Giải pháp ngay lập tức

### 1. Cài đặt Chrome Extension thủ công

**Tải extension từ:**

```
c:\tailieu\public\chrome-extension\
```

**Load vào Chrome:**

1. Mở Chrome → Extensions → Developer mode ON
2. Click "Load unpacked"
3. Chọn folder: `c:\tailieu\public\chrome-extension\`

### 2. Test API endpoints

**Kiểm tra các URL sau:**

```
✅ https://tailieuehou.id.vn/api/health.json
✅ https://tailieuehou.id.vn/api/categories.json
✅ https://tailieuehou.id.vn/api/documents.json
✅ https://tailieuehou.id.vn/api/questions.json
```

### 3. Extension sẽ tự động detect environment

**Logic hoạt động:**

- Nếu đang ở `tailieuehou.id.vn` → dùng production API
- Nếu đang ở localhost → dùng development API
- Extension đã được update với production URLs

## 🎯 Kết quả mong đợi

Sau khi load extension thủ công:

1. **Vào trang**: https://tailieuehou.id.vn
2. **Click extension icon**
3. **Chọn Category và Document**
4. **Extension sẽ load questions từ API**
5. **Highlight answers trên trang**

## 🔄 Next Steps (Tự động hóa)

Để extension được include tự động trong tương lai:

```bash
# Fix build script để copy extension vào dist
npm run build
npm run deploy
```

## ✅ TEST NGAY

1. Load extension thủ công từ `public/chrome-extension/`
2. Vào https://tailieuehou.id.vn
3. Test extension functionality
4. API endpoints đã sẵn sàng và hoạt động!
