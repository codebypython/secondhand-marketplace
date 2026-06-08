# 🗺️ Bản Đồ Tài Liệu Hệ Thống (System Documentation Map)

Thư mục này chứa toàn bộ tài liệu đặc tả, báo cáo kiểm toán, hướng dẫn vận hành và lịch sử phát triển của dự án **Secondhand Marketplace**.

Dưới đây là danh sách phân loại chi tiết mục đích, ý nghĩa và giai đoạn áp dụng của từng tài liệu:

---

## 📌 1. Tài Liệu Hướng Dẫn Vận Hành & Quy Trình Phát Triển

### 📑 [README.md](file:///d:/User/Workspace/secondhand-marketplace/README.md) (Tại thư mục gốc)
*   **Ý nghĩa:** Cổng thông tin chính giới thiệu dự án, kiến trúc thư mục tổng quát và các bước khởi động nhanh nhất cho lập trình viên mới tiếp cận.
*   **Giai đoạn áp dụng:** Bắt đầu dự án (Onboarding).

### 📑 [RUN_GUIDE.md](file:///d:/User/Workspace/secondhand-marketplace/docs/RUN_GUIDE.md)
*   **Ý nghĩa:** Hướng dẫn chi tiết vận hành hệ thống Client-Server, giải thích cách thức hoạt động của các Quick-Start scripts, cấu hình mạng CORS, database connection pool, REST polling, và cách xử lý sự cố chiếm dụng cổng (ports conflict).
*   **Giai đoạn áp dụng:** Hằng ngày khi khởi động, chạy demo, kiểm thử đa client hoặc sửa lỗi kết nối mạng.

### 📑 [SETUP_AND_PR_GUIDE.md](file:///d:/User/Workspace/secondhand-marketplace/docs/SETUP_AND_PR_GUIDE.md)
*   **Ý nghĩa:** Hướng dẫn cách thức cấu hình môi trường phát triển (Python/Node.js), các chuẩn viết code (Linting/Formatting với Black, Ruff), và quy trình đóng gói Pull Request chuẩn chỉnh trước khi tích hợp vào nhánh chính.
*   **Giai đoạn áp dụng:** Trong suốt quá trình code và trước khi tạo Pull Request để merge code.

---

## 📌 2. Tài Liệu Phân Tích Kỹ Thuật & Báo Cáo Kiểm Toán (System Audits)

### 📑 [technical_analysis_and_plan.md](file:///d:/User/Workspace/secondhand-marketplace/docs/technical_analysis_and_plan.md)
*   **Ý nghĩa:** Phân tích kiến trúc OOD/OOP & Cơ sở dữ liệu (Tính đóng gói, thừa kế mixins, đa hình soft-delete, trừu tượng hóa tầng service). Nhận diện các điểm thiếu sót ban đầu (như OCC, anti-cycle category, domain events, per-user message deletion) và đề xuất kế hoạch refactor.
*   **Giai đoạn áp dụng:** Nghiên cứu kiến trúc hệ thống và lập kế hoạch nâng cấp sản phẩm lên mức độ Production-Grade.

### 📑 [BAO_CAO_HE_THONG.md](file:///d:/User/Workspace/secondhand-marketplace/docs/BAO_CAO_HE_THONG.md) (hoặc [BAO_CAO_HE_THONG.md](file:///d:/User/Workspace/secondhand-marketplace/docs/BAO_CAO_HE_THONG.md))
*   **Ý nghĩa:** Báo cáo chi tiết cấu trúc hệ thống backend, danh sách endpoints, mô hình database và kiểm tra luồng API.
*   **Giai đoạn áp dụng:** Kiểm toán hệ thống & Báo cáo kết quả bài tập/dự án cho giảng viên.

### 📑 [CODE_INSPECTION_REPORT.md](file:///d:/User/Workspace/secondhand-marketplace/docs/CODE_INSPECTION_REPORT.md)
*   **Ý nghĩa:** Báo cáo rà soát chất lượng mã nguồn backend, đánh giá độ bao phủ kiểm thử (test coverage) và các điểm cần tối ưu hóa hiệu năng SQL.
*   **Giai đoạn áp dụng:** QA Audit & Tối ưu hóa hiệu năng cơ sở dữ liệu.

### 📑 [UI_UX_FIXES_REPORT.md](file:///d:/User/Workspace/secondhand-marketplace/docs/UI_UX_FIXES_REPORT.md)
*   **Ý nghĩa:** Tài liệu tổng hợp các điểm sửa đổi về mặt giao diện người dùng (UI/UX) ở Frontend Next.js như cấu trúc trang, sửa lỗi layout, dọn dẹp các demo page rác.
*   **Giai đoạn áp dụng:** Sau khi hoàn thiện tinh chỉnh giao diện Frontend.

### 📑 [RUN_LOG_AND_TROUBLESHOOTING.md](file:///d:/User/Workspace/secondhand-marketplace/docs/RUN_LOG_AND_TROUBLESHOOTING.md)
*   **Ý nghĩa:** Nhật ký vận hành hệ thống cùng các tình huống lỗi mạng/database thực tế và cách xử lý nhanh.
*   **Giai đoạn áp dụng:** Vận hành và bảo trì (Operations & Maintenance).

---

## 📌 3. Tài Liệu Lịch Sử Phát Triển Theo Giai Đoạn (Progress Documentation)

Nằm trong thư mục [docs/progress/](file:///d:/User/Workspace/secondhand-marketplace/docs/progress/):
*   `phase-0-foundation.md`: Thiết lập nền tảng dự án ban đầu.
*   `phase-1-auth-user.md`: Xây dựng module đăng ký, đăng nhập & Profile.
*   `phase-2-listings.md`: Xây dựng module đăng tin & phân mục sản phẩm.
*   `phase-3-transactions.md`: Xây dựng luồng thương lượng giá (Offer) & hoàn thành giao dịch (Deal).
*   `phase-4-social.md`: Xây dựng Q&A sản phẩm, follow, và viết review.
*   `phase-5-moderation.md`: Module báo cáo và chặn người dùng.
*   `phase-6-hardening.md`: Giai đoạn gia cố bảo mật và kiểm thử diện rộng.
*   **Ý nghĩa:** Lưu vết toàn bộ hành trình phát triển tính năng của đội ngũ kỹ sư.
*   **Giai đoạn áp dụng:** Khi cần xem lại nguồn gốc phát triển của từng cấu phần.
