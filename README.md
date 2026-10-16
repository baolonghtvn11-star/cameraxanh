# Camera Xanh · Eco-Vision AI

Website tĩnh bằng HTML, CSS và JavaScript, không cần cài thư viện để chạy ứng dụng. Mã nguồn hoàn chỉnh nằm trong `index.html`, `styles.css` và `app.js`.

## Chạy thử

Từ thư mục dự án, chạy `netlify dev --port 8889`, sau đó mở `http://localhost:8889`. Không cần bước biên dịch. Khi triển khai, thư mục gốc chứa `index.html` là thư mục xuất bản. Webcam cần HTTPS hoặc localhost.

## Kiểm tra trải nghiệm

1. Chọn **Trải nghiệm demo**, chạy mô phỏng ba bước. Thử **Dừng**, **Tiếp tục**, nút khởi động lại và **Chạy lại demo**. Một người đi qua sân trường, thả rác rồi rời đi. Khung theo dõi người và rác xuất hiện cùng cảnh báo hành vi xả rác được ghi rõ là mô phỏng. Dừng phải giữ nguyên vị trí; tiếp tục phải chạy từ đúng vị trí đó.
2. Chọn **Camera / ảnh thật**, bật webcam và cấp quyền. Kiểm tra hình ảnh, chọn camera thực tế nếu thiết bị có nhiều camera, sau đó dừng. Thử từ chối quyền để xem thông báo khắc phục ngay trên bảng kết quả.
3. Chọn **Tải ảnh lên** với ảnh JPG, PNG hoặc WebP hợp lệ dưới 20 MB. Ảnh chỉ hiển thị tại trình duyệt, không gửi đến máy chủ. Thử chọn lại cùng ảnh, ảnh hỏng và tệp không phải ảnh.
4. Khi có ảnh hoặc webcam, chọn **Ghi chú quan sát thủ công**. Nhật ký ghi rõ đây là thao tác của người dùng, không phải cảnh báo AI. **Xóa lịch sử** chỉ xóa nhật ký; bộ đếm vẫn thể hiện tổng thao tác của phiên. Tải lại trang đặt lại toàn bộ dữ liệu phiên, như cách hoạt động của phiên bản trước.
5. Mở **Điều kiện để nhận diện thật**. Kiểm tra các liên kết điều hướng, dùng phím Tab/Enter, kiểm tra trên điện thoại và máy tính bảng. Trình duyệt dùng cài đặt giảm chuyển động sẽ không cuộn có hiệu ứng.

## Phạm vi hiện tại

Mã nguồn gốc không có mô hình AI, API, backend hoặc cấu hình camera từ xa. Phiên bản này giữ webcam, tải ảnh, ghi nhận thủ công, nhật ký, xóa lịch sử, bộ đếm phiên và hướng dẫn tích hợp. Danh sách địa điểm camera mẫu được thay bằng danh sách thiết bị webcam thực tế vì các địa điểm cũ không có kết nối. Bộ đếm được đặt tên đúng với thao tác thực hiện; ghi chú không tăng số phát hiện AI.

Mô phỏng không chạy mô hình, không sinh độ tin cậy và không tăng số liệu nhận diện thật. Cảnh báo mô phỏng chỉ xuất hiện trong demo. Camera và ảnh thật không có kết quả nhận diện khi chưa kết nối mô hình. Nhận diện vật thể rác và kết luận hành vi xả rác là hai khả năng khác nhau, cần kiểm chứng riêng.

Để có nhận diện thật, cần cung cấp mô hình đã huấn luyện, API suy luận và cấu trúc trả về gồm loại vật thể, vị trí, độ tin cậy. Chưa thể kiểm tra độ chính xác, cảnh báo tự động hoặc webcam phần cứng từ môi trường phát triển này. Không có API hay mô hình cũ bị thay đổi. Phông chữ Times New Roman với Times và serif dự phòng, không tải phông bên ngoài; minh họa SVG nằm ngay trong HTML, không phụ thuộc dịch vụ ảnh.

## Kiểm tra đã thực hiện

Đã kiểm tra cú pháp JavaScript bằng `node --check app.js`, cấu trúc HTML, và các thao tác bằng Chromium/Playwright trên máy chủ Netlify Dev. Đã kiểm tra demo chạy/dừng/tiếp tục/khởi động lại, webcam giả lập bật/dừng, tải ảnh và ảnh hỏng, ghi chú/xóa nhật ký, mở hướng dẫn tích hợp, lỗi từ chối quyền camera và đặt lại phiên khi tải trang. Không ghi nhận lỗi JavaScript trong luồng kiểm tra. Đã kiểm tra không tràn ngang ở 320, 390, 768, 1024 và 1440 px và xem ảnh chụp giao diện máy tính/điện thoại. axe-core không báo vi phạm tự động ở 390 và 1440 px; kết quả này không thay thế đánh giá thủ công đầy đủ với trình đọc màn hình.
