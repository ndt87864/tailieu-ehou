# CHROME WEB STORE - MẪU NỘI DUNG EXTENSION TAILIEU QUESTIONS

## 📝 MỤC ĐÍCH DUY NHẤT (Single Purpose)
Extension Tailieu Questions được thiết kế với mục đích duy nhất là hỗ trợ học tập cho sinh viên và học viên.

Chức năng chính:
- Tự động quét và nhận diện câu hỏi trắc nghiệm trên các trang web học tập
- Tìm kiếm đáp án chính xác từ cơ sở dữ liệu Tailieu đã được xây dựng sẵn  
- Highlight (tô sáng) đáp án đúng để người học có thể kiểm tra và học tập hiệu quả
- Lưu trữ câu hỏi và đáp án để sử dụng offline, giúp ôn tập

Mục tiêu giáo dục:
- Hỗ trợ sinh viên tự kiểm tra kiến thức đã học
- Giúp giáo viên nhanh chóng xác minh đáp án cho các bài tập
- Tăng hiệu quả học tập thông qua việc tra cứu nhanh chóng
- Không khuyến khích gian lận trong thi cử mà tập trung vào việc học tập và ôn luyện

Extension hoạt động hoàn toàn tự động, không cần can thiệp từ người dùng, giúp tối ưu hóa trải nghiệm học tập.

## 🔐 LÝ DO YÊU CẦU PERMISSIONS

### activeTab
Quyền activeTab được sử dụng để:
- Đọc nội dung câu hỏi trên trang web hiện tại mà người dùng đang truy cập
- Tự động quét và phân tích cấu trúc câu hỏi trắc nghiệm
- Chèn highlight (màu sắc tô sáng) vào đáp án đúng trên trang
- Hiển thị popup thông báo kết quả tìm kiếm cho người dùng
- Không truy cập vào các tab khác hay thông tin riêng tư của người dùng

Extension chỉ hoạt động khi người dùng chủ động kích hoạt và chỉ trên tab đang mở.

### storage  
Quyền storage được sử dụng để:
- Lưu trữ câu hỏi và đáp án đã tìm kiếm để sử dụng offline
- Ghi nhớ cài đặt người dùng (bật/tắt highlight, danh mục môn học)
- Cache (bộ nhớ đệm) dữ liệu để tăng tốc độ tìm kiếm lần sau
- Lưu lịch sử các câu hỏi đã xử lý để tránh tìm kiếm trùng lặp
- Không lưu trữ thông tin cá nhân hay dữ liệu nhạy cảm của người dùng

Tất cả dữ liệu được mã hóa và chỉ lưu trữ cục bộ trên máy của người dùng.

### scripting
Quyền scripting được sử dụng để:
- Chèn script phân tích câu hỏi vào trang web một cách an toàn
- Thực hiện highlight đáp án đúng bằng cách thay đổi CSS
- Tạo popup hiển thị kết quả tìm kiếm không làm gián đoạn trang gốc
- Xử lý tương tác người dùng với các element được highlight
- Đảm bảo extension hoạt động mượt mà trên nhiều loại website khác nhau

Script chỉ chạy khi cần thiết và tự động dọn dẹp sau khi hoàn thành.

### declarativeNetRequest
Quyền declarativeNetRequest được sử dụng để:
- Chặn các request không cần thiết để tăng tốc độ tải trang
- Xử lý vấn đề CORS khi gọi API Tailieu từ các domain khác nhau
- Đảm bảo kết nối an toàn với server cơ sở dữ liệu
- Tối ưu hóa băng thông mạng khi tải dữ liệu câu hỏi
- Không thu thập hay chặn dữ liệu cá nhân của người dùng

Chỉ áp dụng rule cho các request liên quan đến chức năng của extension.

### webRequest
Quyền webRequest được sử dụng để:
- Monitor (giám sát) các lỗi kết nối để thông báo cho người dùng
- Xử lý các vấn đề về SSL certificate khi truy cập API
- Detect (phát hiện) mixed content errors và tự động khắc phục
- Đảm bảo extension hoạt động ổn định trên mọi website
- Không can thiệp vào traffic mạng không liên quan đến extension

Chỉ lắng nghe các error events để cải thiện trải nghiệm người dùng.

### Host Permissions (Quyền từ phía máy chủ)
Extension cần truy cập các domain sau:
- localhost:5174/* - Server API local để phát triển và test
- tailieuehou.id.vn/* - Server chính chứa cơ sở dữ liệu câu hỏi
- *.firebaseapp.com/* - Database Firebase backup
- *.web.app/* - Static hosting cho tài nguyên  
- *.ehou.edu.vn/* - Website trường học chính thức
- dic.tienganh123.com/* - Từ điển hỗ trợ câu hỏi tiếng Anh

Tất cả requests đều được mã hóa HTTPS và chỉ truyền dữ liệu câu hỏi/đáp án.

## 💻 SỬ DỤNG MÃ TỪ XA

Có, extension sử dụng mã từ xa với lý do chính đáng:

1. **Cơ sở dữ liệu động:**
- Câu hỏi và đáp án được cập nhật liên tục từ server
- Đảm bảo người dùng luôn có phiên bản mới nhất
- Tránh việc phải update extension thường xuyên

2. **Tối ưu hóa hiệu suất:**
- Cơ sở dữ liệu quá lớn (hàng nghìn câu hỏi) không thể đóng gói trong extension
- Tải dữ liệu theo nhu cầu giúp tiết kiệm băng thông
- Cache thông minh giảm thiểu số lần gọi API

3. **Bảo mật và chống sao chép:**
- Thuật toán matching câu hỏi được bảo vệ trên server
- API key được mã hóa và rotate định kỳ
- Ngăn chặn việc copy toàn bộ database

4. **Đồng bộ đa thiết bị:**
- Lịch sử học tập có thể đồng bộ giữa các thiết bị
- Cài đặt cá nhân được lưu trên cloud

Tất cả mã từ xa đều được audit và tuân thủ chính sách bảo mật của Chrome.

## 🔒 SỬ DỤNG DỮ LIỆU

### ❌ KHÔNG THU THẬP:
- Thông tin nhận dạng cá nhân (họ tên, địa chỉ, số điện thoại)
- Thông tin sức khỏe 
- Thông tin thanh toán và tài chính
- Thông tin xác thực (mật khẩu, PIN)
- Thông tin liên lạc cá nhân (email riêng tư)
- Thông tin vị trí GPS
- Hoạt động cá nhân không liên quan học tập

### ✅ CÓ SỬ DỤNG:

#### Lịch sử duyệt web
**Mục đích:** Phân tích nội dung trang web để tìm câu hỏi trắc nghiệm
**Cách xử lý:** Chỉ đọc text trên trang hiện tại, không lưu trữ URL hay lịch sử duyệt web
**Chia sẻ:** Không chia sẻ với bên thứ ba

#### Nội dung trang web  
**Mục đích:** Nhận diện câu hỏi và chèn highlight đáp án đúng
**Cách xử lý:** Xử lý real-time, chỉ lưu cache câu hỏi đã tìm thấy
**Chia sẻ:** Không chia sẻ nội dung trang web với ai

## 📱 CHÍNH SÁCH QUYỀN RIÊNG TƯ

Extension Tailieu Questions cam kết bảo vệ quyền riêng tư người dùng:

### Thu thập dữ liệu tối thiểu
- Chỉ xử lý nội dung text liên quan đến câu hỏi học tập
- Không thu thập thông tin cá nhân hay nhạy cảm
- Không tracking hành vi duyệt web của người dùng

### Lưu trữ an toàn
- Dữ liệu cache chỉ lưu trên máy người dùng
- Mã hóa tất cả dữ liệu truyền tải
- Tự động xóa cache sau 30 ngày không sử dụng

### Không chia sẻ
- Không bán hay chia sẻ dữ liệu với bên thứ ba
- Không sử dụng cho mục đích quảng cáo
- Không kết nối với mạng xã hội

### Quyền kiểm soát
- Người dùng có thể xóa cache bất kỳ lúc nào
- Có thể tắt extension mà không mất dữ liệu
- Giao diện rõ ràng về việc extension đang hoạt động

## 📋 CHECKLIST SUBMIT

### Trước khi submit:
- ✅ Manifest.json đã cập nhật version mới
- ✅ Icons đầy đủ 16px, 48px, 128px  
- ✅ Screenshots chất lượng cao
- ✅ Mô tả chi tiết và chính xác
- ✅ Privacy Policy đầy đủ
- ✅ Test extension trên nhiều website
- ✅ Không có console errors
- ✅ Code đã được minify và optimize

### Sau khi submit:
- 🕐 Đợi review (1-3 ngày)
- 📧 Theo dõi email phản hồi từ Chrome Web Store
- 🔄 Sẵn sàng fix issues nếu có
- 📊 Monitor metrics sau khi publish

---
📞 **Liên hệ hỗ trợ:** Nếu có thắc mắc, tạo issue trên GitHub repository
🌐 **Website:** https://tailieuehou.id.vn
📝 **Cập nhật:** Phiên bản mới sẽ được release định kỳ mỗi tháng