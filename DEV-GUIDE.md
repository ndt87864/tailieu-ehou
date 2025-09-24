# Hướng dẫn khởi động Development Environment

## Khởi động nhanh

### Cách 1: Sử dụng script tự động (Windows)

```bash
start-dev.bat
```

### Cách 2: Sử dụng npm script

```bash
npm run dev:all
```

### Cách 3: Khởi động riêng biệt

```bash
# Terminal 1 - Web server
npm run dev

# Terminal 2 - API server
npm run dev:api
```

## Thông tin Server

- **Web Application**: http://localhost:5173
- **API Server**: http://localhost:5174

## API Endpoints

### Categories

- `GET http://localhost:5174/api/categories` - Lấy tất cả categories

### Documents

- `GET http://localhost:5174/api/documents` - Lấy tất cả documents
- `GET http://localhost:5174/api/documents?categoryId=xxx` - Lấy documents theo category

### Questions

- `GET http://localhost:5174/api/questions` - Lấy tất cả questions
- `GET http://localhost:5174/api/questions?documentId=xxx` - Lấy questions theo document

### Health Check

- `GET http://localhost:5174/health` - Kiểm tra trạng thái server

## Chrome Extension

Chrome Extension đã được cập nhật để sử dụng API server mới trên port 5174.

### Test API

- Trang test API: http://localhost:5174/test
- Health check: http://localhost:5174/health

## Ghi chú

- Web server chạy trên port 5173 (Vite default)
- API server chạy trên port 5174
- Cả hai server khởi động đồng thời khi chạy `npm run dev:all`
- Sử dụng concurrently để quản lý multiple processes
