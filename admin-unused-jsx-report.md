# Các file JSX admin thừa hoặc đã bị thay thế

Dựa trên cấu trúc và logic hiện tại của các trang admin trong `src/pages/admin/`, các file component sau trong `src/components/admin/` có thể đã thừa hoặc không còn được sử dụng thực tế (đã bị thay thế bằng logic trực tiếp trong page hoặc component khác):

- `AdminSidebar.jsx` (đã thay bằng Sidebar chung)
- `AdminHeader.jsx` (header admin dùng UserHeader chung)
- `AdminMobileHeader.jsx` (dùng DocumentMobileHeader hoặc header chung)
- `FooterManagement.jsx` (component này bị thay bằng page `pages/admin/FooterManagement.jsx`)
- `UserManagementContent.jsx` (logic quản lý user đã chuyển sang page `AdminUserManagement.jsx`)

**Có thể xóa các file này nếu không còn import ở nơi khác:**

- `src/components/admin/AdminSidebar.jsx`
- `src/components/admin/AdminHeader.jsx`
- `src/components/admin/AdminMobileHeader.jsx`
- `src/components/admin/FooterManagement.jsx`
- `src/components/admin/UserManagementContent.jsx`

**Lưu ý:**

- `UserAddForm.jsx` và `ExcelUploader.jsx` vẫn có thể được dùng làm form con, nên chỉ xóa nếu chắc chắn không còn import ở đâu.
- Nên kiểm tra lại các import trong toàn bộ workspace trước khi xóa để tránh lỗi.

---

## Đề xuất hành động

- Xóa các file trên để dọn dẹp codebase.
- Nếu cần giữ lại cho tham khảo, có thể di chuyển sang thư mục `archive/` hoặc backup trước khi xóa.
