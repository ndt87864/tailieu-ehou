# CHÍNH SÁCH QUYỀN RIÊNG TƯ - TAILIEU QUESTIONS EXTENSION

**Ngày hiệu lực:** 01/10/2025  
**Phiên bản:** 1.0.4  
**Liên hệ:** tailieuehou.id.vn

## 1. TỔNG QUAN

Extension Tailieu Questions được thiết kế để hỗ trợ học tập thông qua việc tìm kiếm và highlight đáp án câu hỏi trắc nghiệm. Chúng tôi cam kết bảo vệ quyền riêng tư và chỉ thu thập dữ liệu cần thiết cho chức năng hoạt động.

## 2. THÔNG TIN ĐƯỢC THU THẬP

### 2.1 Dữ liệu tự động thu thập
- **Nội dung câu hỏi:** Extension đọc text trên trang web để nhận diện câu hỏi trắc nghiệm
- **Cache tạm thời:** Lưu câu hỏi và đáp án đã tìm thấy để tăng tốc độ xử lý
- **Cài đặt extension:** Ghi nhớ tùy chọn người dùng (bật/tắt highlight, danh mục môn học)
- **Logs lỗi:** Thu thập thông tin lỗi để cải thiện extension (không chứa dữ liệu cá nhân)

### 2.2 Dữ liệu KHÔNG thu thập
- ❌ Thông tin cá nhân (họ tên, địa chỉ, số điện thoại)
- ❌ Lịch sử duyệt web đầy đủ
- ❌ Mật khẩu hay thông tin đăng nhập
- ❌ Thông tin tài chính
- ❌ Vị trí địa lý
- ❌ Thông tin liên lạc cá nhân

## 3. CÁCH SỬ DỤNG THÔNG TIN

### 3.1 Mục đích sử dụng
- **Tìm kiếm đáp án:** So sánh câu hỏi trên trang với cơ sở dữ liệu
- **Highlight đáp án:** Hiển thị đáp án đúng trên trang web
- **Cải thiện hiệu suất:** Cache dữ liệu để giảm thời gian tải
- **Phát triển sản phẩm:** Phân tích lỗi và cải thiện tính năng

### 3.2 Xử lý dữ liệu
- Dữ liệu được xử lý real-time trên máy người dùng
- Chỉ gửi câu hỏi (không có thông tin cá nhân) lên server để tìm đáp án
- Tất cả kết nối đều được mã hóa HTTPS
- Không lưu trữ dữ liệu cá nhân trên server

## 4. CHIA SẺ THÔNG TIN

### 4.1 Không chia sẻ với bên thứ ba
Chúng tôi **KHÔNG** bán, cho thuê hay chia sẻ dữ liệu người dùng với:
- Công ty quảng cáo
- Nhà phân tích dữ liệu  
- Mạng xã hội
- Bất kỳ bên thứ ba nào khác

### 4.2 Ngoại lệ pháp lý
Chỉ tiết lộ thông tin khi:
- Có yêu cầu từ cơ quan pháp luật có thẩm quyền
- Cần thiết để bảo vệ quyền lợi hợp pháp của chúng tôi
- Người dùng đồng ý rõ ràng

## 5. BẢO MẬT DỮ LIỆU

### 5.1 Biện pháp kỹ thuật
- **Mã hóa:** Tất cả dữ liệu truyền tải được mã hóa HTTPS
- **Lưu trữ cục bộ:** Cache chỉ lưu trên máy người dùng
- **API Security:** Sử dụng API key được mã hóa và rotate định kỳ
- **Input Validation:** Kiểm tra và làm sạch dữ liệu đầu vào

### 5.2 Biện pháp quản lý
- Chỉ nhân viên có thẩm quyền mới truy cập được hệ thống
- Audit log tất cả hoạt động trên server
- Backup dữ liệu định kỳ với mã hóa
- Kiểm tra bảo mật thường xuyên

## 6. QUYỀN CỦA NGƯỜI DÙNG

### 6.1 Quyền truy cập và kiểm soát
- **Xem dữ liệu:** Kiểm tra cache trong extension settings
- **Xóa dữ liệu:** Clear cache bất kỳ lúc nào
- **Tắt extension:** Dừng hoạt động mà không mất dữ liệu
- **Cập nhật cài đặt:** Thay đổi tùy chọn theo ý muốn

### 6.2 Cách thực hiện quyền
1. **Xóa cache:** Extension Settings → Clear Cache
2. **Xem dữ liệu:** Developer Tools → Application → Storage
3. **Tắt extension:** Chrome Extensions → Toggle Off
4. **Gỡ cài đặt:** Chrome Extensions → Remove

## 7. LƯU TRỮ DỮ LIỆU

### 7.1 Thời gian lưu trữ
- **Cache câu hỏi:** Tự động xóa sau 30 ngày không sử dụng
- **Cài đặt người dùng:** Lưu trữ đến khi gỡ extension
- **Logs lỗi:** Xóa sau 7 ngày
- **Dữ liệu server:** Không lưu trữ dữ liệu cá nhân

### 7.2 Vị trí lưu trữ
- **Máy người dùng:** Chrome Local Storage (mã hóa)
- **Server:** Chỉ cơ sở dữ liệu câu hỏi/đáp án (không có thông tin cá nhân)
- **Backup:** Firebase (mã hóa end-to-end)

## 8. COOKIES VÀ TRACKING

### 8.1 Không sử dụng cookies
Extension không:
- Đặt cookies trên trình duyệt
- Sử dụng tracking pixels
- Kết nối với Google Analytics
- Thu thập fingerprint trình duyệt

### 8.2 Local Storage
Chỉ sử dụng Chrome Local Storage để:
- Lưu cache câu hỏi đã tìm kiếm
- Ghi nhớ cài đặt người dùng
- Không tracking hành vi duyệt web

## 9. TRẺ EM VÀ QUYỀN RIÊNG TƯ

### 9.1 Tuân thủ COPPA
- Extension không cố ý thu thập thông tin từ trẻ em dưới 13 tuổi
- Nếu phát hiện có dữ liệu từ trẻ em, sẽ xóa ngay lập tức
- Khuyến khích cha mẹ giám sát việc sử dụng internet của trẻ

### 9.2 Môi trường giáo dục
Extension được thiết kế cho:
- Sinh viên đại học (18+)
- Học sinh trung học phổ thông (với sự giám sát)
- Môi trường học tập có kiểm soát

## 10. CẬP NHẬT CHÍNH SÁCH

### 10.1 Thông báo thay đổi
- Cập nhật chính sách sẽ được thông báo trong extension
- Phiên bản mới yêu cầu đồng ý lại
- Thông báo qua website chính thức
- Email thông báo (nếu người dùng đăng ký)

### 10.2 Lịch sử phiên bản
- **v1.0.4 (01/10/2025):** Phiên bản đầu tiên
- Các cập nhật tiếp theo sẽ được ghi lại ở đây

## 11. LIÊN HỆ

### 11.1 Thông tin liên hệ
- **Website:** https://tailieuehou.id.vn
- **GitHub:** https://github.com/ndt87864/ocrmanga
- **Email hỗ trợ:** Tạo issue trên GitHub repository

### 11.2 Báo cáo vấn đề bảo mật
Nếu phát hiện lỗ hổng bảo mật:
1. Tạo private issue trên GitHub
2. Mô tả chi tiết vấn đề
3. Chúng tôi sẽ phản hồi trong 24h
4. Fix lỗi và release bản vá trong 72h

## 12. TUÂN THỦ PHÁP LUẬT

Extension tuân thủ:
- **GDPR** (EU General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)  
- **COPPA** (Children's Online Privacy Protection Act)
- **Luật An ninh mạng Việt Nam**
- **Chrome Web Store Policies**

---

**Lưu ý quan trọng:** Chính sách này có thể được cập nhật để phản ánh các thay đổi trong tính năng extension hoặc yêu cầu pháp lý. Người dùng sẽ được thông báo trước mọi thay đổi quan trọng.

**Ngày cập nhật cuối:** 01/10/2025  
**Người chịu trách nhiệm:** Development Team - Tailieu Extension