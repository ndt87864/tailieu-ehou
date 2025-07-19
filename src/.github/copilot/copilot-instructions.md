# Hướng dẫn cho GitHub Copilot

## 📜 Nguyên tắc Vàng (Bắt buộc tuân thủ)

1.  **Thiết kế chi tiết là chân lý:** **TUÂN THỦ TUYỆT ĐỐI** tài liệu thiết kế chi tiết (detail design). **CẤM** tự ý sáng tạo, thay đổi logic, hoặc đi ra ngoài luồng thiết kế đã định sẵn. Mọi mã nguồn sinh ra phải phản ánh chính xác yêu cầu trong tài liệu.
2.  **CẤM HARD CODE:** **Nghiêm cấm tuyệt đối** việc hard code (nhúng dữ liệu tĩnh, cấu hình, chuỗi văn bản, đường dẫn, v.v. trực tiếp vào mã nguồn). Luôn sử dụng các tệp hằng số (`/constants`), biến môi trường (`.env`), hoặc các file cấu hình riêng biệt.
3.  **Kiến trúc phân lớp:** Luôn đảm bảo kiến trúc được phân tách thành các lớp rõ ràng (UI, Logic, API, v.v.). Tuân thủ nghiêm ngặt cấu trúc thư mục đã được định nghĩa bên dưới để duy trì sự phân lớp này.

---

## 💻 Ngôn ngữ và Môi trường

- **Ngôn ngữ chính:** Luôn luôn phản hồi, giải thích và tạo mã bằng **tiếng Việt**.
- **Framework:** Sử dụng **React** với **TypeScript**.
- **Công cụ xây dựng:** Sử dụng **Vite** cho môi trường phát triển và build dự án.

---

## 🔥 Cơ sở dữ liệu

- **Database:** Sử dụng **Firebase** làm cơ sở dữ liệu chính.
- **Dịch vụ Firebase:** Ưu tiên sử dụng **Firestore** cho việc lưu trữ dữ liệu và **Firebase Authentication** cho việc xác thực người dùng. Khi cần, hãy sử dụng các dịch vụ khác của Firebase như Storage, Functions.

---

## 📂 Cấu trúc dự án

Luôn tuân thủ nghiêm ngặt cấu trúc thư mục và tệp như sau để đảm bảo kiến trúc phân lớp:
/src
|-- /apis
| |-- index.ts
| |-- user.api.ts
|-- /assets
| |-- /images
| |-- /styles
| |-- index.css
|-- /components
| |-- /common
| |-- /layouts
| |-- MainLayout.tsx
| |-- index.ts
|-- /constants
| |-- index.ts
| |-- path.ts
|-- /contexts
| |-- app.context.ts
|-- /hooks
| |-- useQueryConfig.ts
|-- /layouts
| |-- MainLayout
| |-- MainLayout.tsx
|-- /pages
| |-- /Login
| |-- /ProductList
| |-- /Register
|-- /types
| |-- user.type.ts
| |-- utils.type.ts
|-- /utils
| |-- auth.ts
| |-- http.ts
| |-- index.ts
| |-- utils.ts
| |-- helper.js
|-- index.ts
|-- App.tsx
|-- main.tsx
|-- index.css

### **Giải thích cấu trúc:**

- **/apis:** Chứa các hàm gọi API đến Firebase.
- **/assets:** Chứa các tài nguyên tĩnh như hình ảnh, file CSS.
- **/components:** Chứa các React component có thể tái sử dụng.
  - **/common:** Các component chung, nhỏ lẻ (ví dụ: Button, Input).
  - **/layouts:** Các component định hình bố cục chính của trang.
- **/constants:** Chứa các hằng số của dự án.
- **/contexts:** Chứa các React Context để quản lý trạng thái toàn cục.
- **/hooks:** Chứa các custom hook.
- **/layouts:** Chứa các layout chính của ứng dụng.
- **/pages:** Chứa các component tương ứng với từng trang của ứng dụng.
- **/types:** Chứa các định nghĩa kiểu (interface, type) của TypeScript.
- **/utils:** Chứa các hàm tiện ích có thể tái sử dụng.

## Nguyên tắc viết mã

- **TypeScript:** Tận dụng tối đa các tính năng của TypeScript như `interface` và `type` để đảm bảo an toàn kiểu dữ liệu. Hạn chế sử dụng `any`.
- **React:**
  - Sử dụng **function components** và **React Hooks**.
  - Viết mã rõ ràng, dễ đọc và chia nhỏ các component một cách hợp lý.
- **Firebase:** Khi khởi tạo và sử dụng Firebase, hãy tạo một tệp cấu hình riêng để quản lý các khóa API và thông tin khởi tạo. Không đưa thông tin nhạy cảm trực tiếp vào mã nguồn.

Bằng cách cung cấp các hướng dẫn này, GitHub Copilot sẽ hiểu rõ hơn về bối cảnh dự án của bạn và đưa ra các gợi ý mã nguồn phù hợp và nhất quán hơn.
