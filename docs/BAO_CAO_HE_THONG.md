# BÁO CÁO PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG SECONDHAND MARKETPLACE

**Dự án:** Sàn giao dịch đồ cũ trực tuyến (Secondhand Marketplace)
**Công nghệ:** FastAPI (Backend), Next.js (Frontend), PostgreSQL (Database)
**Tiêu chuẩn:** Production-grade OOD/OOP & Modern Web Architecture

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Giới thiệu
Dự án Secondhand Marketplace là một nền tảng thương mại điện tử chuyên biệt dành cho việc mua bán đồ cũ. Hệ thống cho phép người dùng đăng tin, tìm kiếm, trả giá (Offers) và thực hiện các thỏa thuận mua bán (Deals) một cách an toàn và minh bạch.

### 1.2. Mục tiêu hệ thống
- Xây dựng một nền tảng ổn định, có khả năng mở rộng cao.
- Áp dụng triệt để các nguyên lý thiết kế hướng đối tượng (OOD) và lập trình hướng đối tượng (OOP).
- Đảm bảo tính toàn vẹn dữ liệu và bảo mật thông tin người dùng.
- Tối ưu hóa trải nghiệm người dùng (UX) trên cả môi trường web và di động.

---

## 2. KIẾN TRÚC HỆ THỐNG

Hệ thống được xây dựng theo mô hình **Client-Server** tách biệt hoàn toàn, giao tiếp thông qua **RESTful API**.

### 2.1. Backend (The Engine)
- **Framework:** FastAPI (Python).
- **ORM:** SQLAlchemy 2.0 (Declarative Mapping).
- **Validation:** Pydantic.
- **Security:** JWT (JSON Web Token), BCrypt hashing.

### 2.2. Frontend (The Interface)
- **Framework:** Next.js 14+ (App Router).
- **Language:** TypeScript.
- **Styling:** Vanilla CSS & Modern Design Tokens.

### 2.3. Cơ sở dữ liệu
- **Database:** PostgreSQL (hỗ trợ UUID, JSONB).
- **Migration:** Alembic.

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN & OOD)

Hệ thống áp dụng các kỹ thuật OOD nâng cao để tối ưu hóa việc quản lý mã nguồn và dữ liệu.

### 3.1. Các Mixins Cơ sở (Modular Mixins)
Nằm tại: `backend/app/models/mixins.py`
- **UUIDMixin:** Sử dụng UUID làm khóa chính thay cho Integer tự tăng để bảo mật ID.
- **TimestampMixin:** Tự động hóa việc ghi nhận `created_at` và `updated_at`.
- **SoftDeleteMixin:** Triển khai cơ chế xóa mềm (Soft Delete) giúp bảo toàn dữ liệu lịch sử.
- **VersionMixin:** Triển khai Optimistic Concurrency Control (OCC) để chống tranh chấp dữ liệu khi nhiều người dùng cùng thao tác.

### 3.2. Cấu trúc bảng và Quan hệ
- **User & Profile:** Quan hệ 1-1, tách biệt thông tin tài khoản và thông tin cá nhân.
- **Category:** Thiết kế tự tham chiếu (Self-referencing) để tạo cây danh mục đa cấp.
- **Listing (Tin đăng):** Trung tâm của hệ thống, liên kết với User (Owner) và Category.
- **Offer & Deal:** Quản lý quy trình giao dịch từ lúc trả giá đến khi hoàn thành thỏa thuận.

### 3.3. Ràng buộc dữ liệu (Encapsulation)
- Sử dụng **SQLAlchemy Enums** tại `backend/app/models/enums.py` để giới hạn các trạng thái hợp lệ.
- **CheckConstraints:** Đảm bảo giá sản phẩm (`price`) luôn lớn hơn hoặc bằng 0 ngay tại tầng DB.

---

## 4. CHI TIẾT TRIỂN KHAI BACKEND

### 4.1. Quy trình xử lý Request
1. **Middleware:** Kiểm tra CORS và các cài đặt bảo mật.
2. **Dependency Injection (DI):** 
   - `get_db_session`: Quản lý vòng đời kết nối database.
   - `get_current_user`: Xác thực JWT và trích xuất thông tin người dùng từ mạng.
3. **Schemas (Pydantic):** Chuyển đổi dữ liệu từ JSON sang Object và ngược lại, đồng thời kiểm tra tính hợp lệ của dữ liệu đầu vào.

### 4.2. Logic nghiệp vụ (Rich Domain Model)
Thay vì để logic ở Controller, dự án đưa logic vào trong các Entity:
- `Offer.accept()`: Kiểm tra điều kiện và tự động chuyển trạng thái Listing sang `RESERVED`.
- `Listing.is_available()`: Kiểm tra trạng thái bán và trạng thái xóa mềm.

### 4.3. Global Filter cho Soft Delete
Hệ thống sử dụng **Event Listeners** tại `backend/app/db/session.py` để tự động thêm filter `deleted_at IS NULL` vào mọi câu lệnh SELECT, đảm bảo dữ liệu đã xóa không bao giờ hiển thị ra ngoài trừ khi có yêu cầu đặc biệt.

---

## 5. CHI TIẾT TRIỂN KHAI FRONTEND

### 5.1. Quản lý trạng thái và Hydration
- **Auth Provider:** Quản lý trạng thái đăng nhập toàn cục (`token`, `user`).
- **Hydration Fix:** Sử dụng `mounted` state và `ClientOnly` component để khắc phục lỗi bất đồng bộ giữa Server và Client (đặc biệt với các hàm `timeAgo`).

### 5.2. Giao diện người dùng (UI/UX)
- **Trang Chủ:** Tích hợp bộ lọc và tìm kiếm động (Debounced search).
- **Location Picker:** Sử dụng Leaflet tích hợp API bản đồ để người dùng chọn vị trí giao dịch trực quan.
- **Responsive Design:** Hệ thống grid linh hoạt đảm bảo hiển thị tốt trên mọi thiết bị.

---

## 6. QUY TRÌNH GIAO DỊCH (TRANSACTION FLOW)

Hệ thống mô phỏng quy trình mua bán thực tế qua 4 bước:
1. **Offer:** Người mua gửi đề xuất giá.
2. **Response:** Người bán Chấp nhận, Từ chối hoặc Trả giá lại (Counter-offer).
3. **Deal:** Khi chấp nhận, một Deal được tạo ra, sản phẩm được giữ chỗ (`RESERVED`).
4. **Completion:** Sau khi giao dịch (Meetup hoặc Shipping), sản phẩm chuyển sang `SOLD`.

---

## 7. BẢO MẬT VÀ TỐI ƯU HÓA

### 7.1. Bảo mật mạng
- **JWT:** Mã hóa thông tin xác thực, không lưu session trên server (Stateless).
- **CORS:** Giới hạn danh sách domain được phép truy cập API.
- **Input Validation:** Ngăn chặn SQL Injection và XSS thông qua Pydantic và SQLAlchemy.

### 7.2. Tối ưu hiệu năng
- **Database Indexing:** Đánh chỉ mục cho các trường thường xuyên tìm kiếm.
- **Lazy Loading:** Chỉ tải các quan hệ dữ liệu cần thiết để giảm tải cho database.
- **Static Asset Optimization:** Sử dụng Next.js Image để tối ưu hóa dung lượng ảnh.

---

## 8. QUY TRÌNH PHÁT TRIỂN VÀ VẬN HÀNH (CI/CD)

- **Version Control:** Sử dụng Git với quy trình Branching rõ ràng.
- **CI/CD:** GitHub Actions tự động hóa việc chạy Lint (kiểm tra cú pháp) và Test khi có thay đổi code.
- **Deployment:** Hỗ trợ cả Docker (cho môi trường production) và chạy Script trực tiếp (cho môi trường development).

---

## 9. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### 9.1. Kết luận
Hệ thống đã hoàn thiện các chức năng lõi của một sàn giao dịch đồ cũ, tuân thủ các tiêu chuẩn thiết kế hướng đối tượng và lập trình mạng hiện đại. Mã nguồn sạch, dễ bảo trì và có độ ổn định cao.

### 9.2. Hướng phát triển tương lai
- Tích hợp thanh toán trực tuyến (VNPay/Momo).
- Phát triển ứng dụng di động Native (React Native).
- Áp dụng AI để gợi ý sản phẩm cá nhân hóa.

---
**Người lập báo cáo:** Antigravity AI Assistant
**Ngày lập:** 20-04-2026
