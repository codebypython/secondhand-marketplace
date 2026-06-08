# ⚙️ Hướng Dẫn Cấu Hình Môi Trường (.env) & Các Lệnh Phát Triển

Tài liệu này cung cấp mô tả chi tiết cho từng biến môi trường trong dự án Secondhand Marketplace và giải thích ý nghĩa của các câu lệnh phát triển cốt lõi mà lập trình viên cần sử dụng trong quá trình làm việc.

---

## 🔑 1. Chi Tiết Các File Cấu Hình Môi Trường (.env)

Hệ thống sử dụng hai file cấu hình chính để thiết lập liên kết mạng giữa Client và Server.

### A. Cấu Hình Backend (`backend/.env`)
File này cấu hình kết nối database, khóa bảo mật xác thực JWT, và chính sách CORS (Cross-Origin Resource Sharing).

1.  **`DATABASE_URL`**
    *   **Giá trị mẫu:** `postgresql+psycopg://postgres:app@localhost:5432/secondhand_marketplace` hoặc `sqlite:///alembic-dev.db`
    *   **Ý nghĩa:** Chuỗi kết nối cơ sở dữ liệu. Nó chỉ rõ:
        *   `postgresql+psycopg`: Driver kết nối cơ sở dữ liệu PostgreSQL (`psycopg` v3).
        *   `postgres:app`: Tên đăng nhập (`postgres`) và mật khẩu (`app`).
        *   `localhost:5432`: Máy chủ database (chạy cục bộ) và cổng mạng TCP mặc định của Postgres.
        *   `secondhand_marketplace`: Tên database chứa dữ liệu.
        *   `sqlite:///alembic-dev.db`: Dùng SQLite lưu trữ trực tiếp vào file file `alembic-dev.db` cục bộ (sử dụng khi phát triển nhanh không qua Docker).
    *   **Khi nào cần chỉnh sửa:** Thay đổi khi bạn đổi mật khẩu cơ sở dữ liệu, cổng chạy Postgres, hoặc chuyển sang dùng SQLite.

2.  **`JWT_SECRET_KEY`**
    *   **Giá trị mẫu:** `change-me-in-dev-please-use-at-least-32-bytes`
    *   **Ý nghĩa:** Khóa bí mật dùng để mã hóa và ký tên (signature) cho mã JWT Access Token khi người dùng đăng nhập. Khóa này đảm bảo client không thể làm giả token để truy cập trái phép.
    *   **Khi nào cần chỉnh sửa:** Cực kỳ quan trọng cần thay đổi sang một chuỗi ngẫu nhiên, dài và bảo mật khi đưa ứng dụng lên môi trường Production.

3.  **`ACCESS_TOKEN_EXPIRE_MINUTES`**
    *   **Giá trị mẫu:** `120`
    *   **Ý nghĩa:** Thời gian hết hạn của Access Token (tính bằng phút). Hết thời gian này, người dùng sẽ bị đăng xuất tự động và bắt buộc phải đăng nhập lại để đảm bảo an toàn.
    *   **Khi nào cần chỉnh sửa:** Thay đổi tùy thuộc vào yêu cầu bảo mật của sản phẩm (ví dụ: giảm xuống 30 phút để tăng độ bảo mật hoặc tăng lên nếu muốn người dùng duy trì đăng nhập lâu hơn).

4.  **`BACKEND_CORS_ORIGINS`**
    *   **Giá trị mẫu:** `["http://localhost:3000","http://127.0.0.1:3000"]`
    *   **Ý nghĩa:** Danh sách các domain của Frontend Client được phép gọi API gửi dữ liệu đến Server. Nếu Frontend chạy ở một port khác (ví dụ: 3001) hoặc domain khác mà không khai báo ở đây, trình duyệt sẽ báo lỗi CORS và chặn mọi yêu cầu API.
    *   **Khi nào cần chỉnh sửa:** Thêm IP LAN hoặc domain staging/production khi cấu hình ứng dụng chạy trên mạng nội bộ hoặc deploy lên cloud.

---

### B. Cấu Hình Frontend (`frontend/.env.local`)
File này cấu hình địa chỉ của Backend Server để Client Next.js gửi API request.

1.  **`NEXT_PUBLIC_API_URL`**
    *   **Giá trị mẫu:** `http://localhost:8000/api/v1` hoặc `http://192.168.1.15:8000/api/v1`
    *   **Ý nghĩa:** Địa chỉ URL gốc của FastAPI Server. Tiếp đầu ngữ `NEXT_PUBLIC_` cho phép Next.js xuất biến này ra cả phía Client-side (trình duyệt) thay vì chỉ giữ ở Server-side.
    *   **Khi nào cần chỉnh sửa:** Thay đổi khi IP của máy chủ Backend thay đổi (khi dùng chung Wifi, đổi mạng DHCP). Các script khởi chạy tự động của hệ thống sẽ tự động quét và ghi đè giá trị này để đảm bảo điện thoại hoặc máy tính khác trong mạng LAN có thể kết nối được.

---

## 🛠️ 2. Ý Nghĩa & Mục Đích Sử Dụng Các Câu Lệnh Phát Triển

### A. Nhóm Lệnh Backend (Python & SQLAlchemy)

1.  **`pip install -e ".[dev]"`**
    *   **Ý nghĩa:** Cài đặt các package của ứng dụng ở chế độ Editable (`-e`). Mọi chỉnh sửa mã nguồn sẽ được áp dụng ngay lập tức mà không cần cài đặt lại. Hỗ trợ cài thêm các thư viện phục vụ phát triển (`dev` extras như pytest, black, ruff).
    *   **Mục đích:** Sử dụng khi thiết lập môi trường ảo lần đầu hoặc khi ứng dụng bổ sung thư viện mới trong `pyproject.toml`.

2.  **`alembic revision --autogenerate -m "Tên migration"`**
    *   **Ý nghĩa:** Tự động đối chiếu sự khác biệt giữa các Model Python (`app/models/`) và cấu trúc bảng hiện tại trong database, từ đó tự động sinh ra file migration cập nhật database.
    *   **Mục đích:** Sử dụng khi bạn thêm/sửa/xóa bất kỳ thuộc tính nào trong các model SQLAlchemy và muốn áp dụng thay đổi đó vào database.

3.  **`alembic upgrade head`**
    *   **Ý nghĩa:** Chạy tất cả các file migration chưa được áp dụng để đưa cơ sở dữ liệu lên phiên bản mới nhất (`head`).
    *   **Mục đích:** Đồng bộ hóa cấu trúc bảng database của bạn sau khi kéo code mới từ git hoặc sau khi tự tạo migration mới.

4.  **`python seed_data.py`**
    *   **Ý nghĩa:** Nạp dữ liệu mẫu (Mock data) gồm hàng chục người dùng, tin đăng, cuộc hội thoại chat, lịch hẹn gặp, và review vào database.
    *   **Mục đích:** Dùng để tạo nhanh dữ liệu thực tế giúp lập trình viên kiểm thử tính năng trên UI mà không cần đăng ký tài khoản và nhập thủ công từng sản phẩm.

5.  **`python -m pytest`** (hoặc `pytest`)
    *   **Ý nghĩa:** Chạy toàn bộ các bài test tự động được viết trong thư mục `tests/`.
    *   **Mục đích:** Xác nhận chất lượng mã nguồn, đảm bảo các tính năng cốt lõi (Auth, Listing, Transaction, Soft Delete) không bị hỏng sau khi refactor code.

6.  **`uvicorn app.main:app --reload --port 8000`**
    *   **Ý nghĩa:** Khởi chạy máy chủ phát triển ASGI (Uvicorn). Tham số `--reload` giúp máy chủ tự động khởi động lại ngay khi phát hiện có thay đổi trong các file `.py`.
    *   **Mục đích:** Chạy Server ở môi trường Local để phát triển và nhận API request.

---

### B. Nhóm Lệnh Frontend (Node.js & Next.js)

1.  **`npm install`**
    *   **Ý nghĩa:** Tải và cài đặt tất cả các package và thư viện JavaScript được định nghĩa trong `package.json` vào thư mục `node_modules`.
    *   **Mục đích:** Khởi tạo môi trường lần đầu hoặc chạy sau khi kéo code từ git để cập nhật các thư viện mới.

2.  **`npm run dev`**
    *   **Ý nghĩa:** Khởi động máy chủ Next.js ở chế độ phát triển (Development), hỗ trợ Hot Reload và Fast Refresh.
    *   **Mục đích:** Mở giao diện ứng dụng cục bộ để phát triển tính năng UI/UX.

3.  **`npm run build`**
    *   **Ý nghĩa:** Biên dịch, tối ưu hóa mã nguồn, nén dung lượng, và sinh ra các trang tĩnh (Static site generation - SSG) phục vụ cho môi trường chạy Production.
    *   **Mục đích:** Kiểm tra lỗi biên dịch TypeScript/ESLint và chuẩn bị đóng gói deploy ứng dụng lên máy chủ thực tế.
