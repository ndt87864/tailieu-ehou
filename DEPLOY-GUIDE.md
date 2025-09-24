# 🚀 Hướng dẫn Deploy với API Extensions

## ✅ Tình trạng hiện tại

### 🔧 Development Environment

- **Web Server**: http://localhost:5173 (Vite)
- **API Server**: http://localhost:5174 (Express.js)
- **Khởi động đồng thời**: `npm run dev:all`

### 🌐 Production Environment

- **Web + Static API**: https://tailieuehou.id.vn
- **API Endpoints**: https://tailieuehou.id.vn/api/*
- **Chrome Extension**: Tự động detect environment

## 📋 API Endpoints

### Development (Dynamic)

```
http://localhost:5174/api/categories
http://localhost:5174/api/documents
http://localhost:5174/api/documents?categoryId=xxx
http://localhost:5174/api/questions
http://localhost:5174/api/questions?documentId=xxx
http://localhost:5174/health
```

### Production (Static JSON)

```
https://tailieuehou.id.vn/api/categories.json
https://tailieuehou.id.vn/api/documents.json
https://tailieuehou.id.vn/api/documents-{categoryId}.json
https://tailieuehou.id.vn/api/questions.json
https://tailieuehou.id.vn/api/questions-{documentId}.json
https://tailieuehou.id.vn/api/health.json
```

## 🛠️ Build Process

### 1. Automatic Build

```bash
npm run build
```

**Bước thực hiện:**

1. Clear cache và tạo version mới
2. Build Chrome Extension (production config)
3. Generate Static API files từ Firestore
4. Build React app với Vite
5. Copy tất cả vào `dist/`

### 2. Deploy

```bash
npm run deploy        # Deploy hosting only
npm run deploy:all     # Deploy full (hosting + functions)
```

## 🔌 Chrome Extension

### Auto Environment Detection

Extension tự động chọn API endpoint:

- **Local**: `http://localhost:5174/api`
- **Production**: `https://tailieuehou.id.vn/api`

### Permissions

```json
{
  "host_permissions": [
    "http://localhost:5174/*",
    "https://tailieuehou.id.vn/*",
    "https://*.firebaseapp.com/*",
    "https://*.web.app/*"
  ]
}
```

## 🎯 Câu trả lời chính

**"Extensions có chạy cùng link với web không?"**

✅ **CÓ** - Sau khi build và deploy:

1. **Web app**: `https://tailieuehou.id.vn`
2. **API endpoints**: `https://tailieuehou.id.vn/api/*`
3. **Chrome Extension**: Tự động connect đến cùng domain

## 🚀 Quick Commands

```bash
# Development - Chạy cả web và API
npm run dev:all

# Build production với static API
npm run build

# Deploy lên Firebase Hosting
npm run deploy

# Kiểm tra API đã được generate
ls dist/api/
```

## 📁 Generated API Files

Sau khi build, folder `dist/api/` sẽ chứa:

```
categories.json          # Tất cả categories
documents.json           # Tất cả documents
documents-{id}.json      # Documents theo category
questions.json           # Sample questions (1000 items)
questions-{id}.json      # Questions theo document (top 20 docs)
health.json              # Health check
index.json               # API directory
```

## 🔧 Troubleshooting

### Nếu Firebase Functions không deploy được (Blaze plan required):

✅ **Giải pháp hiện tại**: Sử dụng Static JSON files

- Tự động generate từ Firestore
- Serve như static assets
- Không cần Firebase Functions
- Hoạt động với Spark (free) plan

### Test API sau deploy:

```
https://tailieuehou.id.vn/api/health.json
https://tailieuehou.id.vn/api/categories.json
```

## 🎉 Kết luận

**Extensions ĐÃ tích hợp cùng link với web thành công!**

- Same origin: `tailieuehou.id.vn`
- Auto-detect environment
- Static API files cho production
- Dynamic API server cho development
