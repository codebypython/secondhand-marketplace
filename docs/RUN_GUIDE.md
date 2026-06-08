# 🚀 Hướng Dẫn Vận Hành & Tối Ưu Lập Trình Mạng Client - Server

Tài liệu này cung cấp hướng dẫn chạy ứng dụng chi tiết, phân tích kiến trúc truyền thông mạng giữa Client (Next.js) và Server (FastAPI), cùng các scripts chạy nhanh tối ưu để đảm bảo chương trình chạy mượt mà, ổn định và có hiệu năng tốt nhất.

---

## 🏗️ 1. Kiến Trúc Truyền Thông Mạng (Client - Server)

Ứng dụng **Secondhand Marketplace** được thiết kế theo mô hình **Client-Server rời rạc**, sử dụng các giao thức và cơ chế mạng chuẩn để kết nối dữ liệu:

```mermaid
graph TD
    Client[Next.js Client <br> http://localhost:3000] <-->|Giao thức HTTP / REST API| Backend[FastAPI Server <br> http://localhost:8000]
    Backend <-->|SQLAlchemy ORM / TCP Port 5432| Postgres[(PostgreSQL Database)]
    Client -.->|REST Polling 5s| Backend
```

*   **Frontend Client (Port 3000):** Ứng dụng Next.js (React) đảm nhận việc render giao diện người dùng. Nó giao tiếp với Backend thông qua các lệnh gọi HTTP Request (`fetch`/`axios`).
*   **Backend Server (Port 8000):** FastAPI xử lý các logic nghiệp vụ, xác thực JWT, và cung cấp API RESTful. Máy chủ uvicorn sử dụng mô hình ASGI bất đồng bộ (Asynchronous) giúp xử lý hàng nghìn kết nối đồng thời một cách mượt mà.
*   **Database Server (Port 5432):** PostgreSQL quản lý lưu trữ dữ liệu. Backend giao tiếp với Database qua thư viện SQLAlchemy 2.0 bằng cơ chế Connection Pooling (Quản lý hồ bơi kết nối).

---

## ⚡ 2. Các Scripts Khởi Động Nhanh (Quick-Start Scripts)

Để đơn giản hóa việc triển khai và đảm bảo hệ thống tự động thiết lập chính xác các kết nối mạng, chúng tôi cung cấp các bộ script chạy nhanh dưới đây:

### Nhóm 1: Chạy Trên Docker (Khuyên Dùng - Ổn Định Nhất)
Chạy toàn bộ hệ thống (Frontend, Backend, Database) trong các container cô lập. Toàn bộ cấu hình mạng nội bộ giữa các container đã được Docker bridge network tự động tối ưu hóa.

*   **Trên Windows (PowerShell):**
    ```powershell
    # Tự động dựng container, chờ DB sẵn sàng, tự động chạy migrations và nạp dữ liệu mẫu
    .\start-docker.ps1
    ```
*   **Trên Linux / macOS / WSL (Bash):**
    ```bash
    chmod +x start-docker.sh
    ./start-docker.sh
    ```
*   **Cách tắt hệ thống Docker:**
    ```powershell
    # Trên Windows
    .\stop.ps1
    
    # Trên Linux/macOS
    docker compose down
    ```

### Nhóm 2: Chạy Cục Bộ (Local Development - Dành Cho Lập Trình Viên)
Phù hợp khi bạn muốn sửa đổi code liên tục và tận dụng tính năng Hot Reload nhanh chóng.

*   **Trên Windows (PowerShell):**
    ```powershell
    # Khởi động PostgreSQL dạng Docker, tự động setup .venv, cài thư viện và chạy song song Backend/Frontend
    .\start.ps1
    ```
*   **Trên Linux / macOS / WSL (Bash):**
    ```bash
    chmod +x start.sh stop.sh
    ./start.sh
    ```
*   **Dừng hệ thống cục bộ:**
    ```powershell
    # Trên Windows
    .\stop.ps1
    
    # Trên Linux/macOS
    ./stop.sh
    ```

### Nhóm 3: Chạy Nhiều Client Đồng Thời (Multi-Client Demo)
Rất hữu ích khi bạn muốn mở 2 hoặc nhiều giao diện web Next.js cùng lúc trên cùng một máy tính để thử nghiệm luồng nghiệp vụ tương tác trực tiếp (Ví dụ: Người mua dùng Client 3000 và Người bán dùng Client 3001).

*   **Khởi động nhanh 1 Server (cổng 8000) và 2 Client (cổng 3000 & 3001):**
    - **Windows (PowerShell):**
      ```powershell
      .\start-multi-client.ps1
      ```
    - **Linux / macOS / WSL (Bash):**
      ```bash
      chmod +x start-multi-client.sh
      ./start-multi-client.sh
      ```
*   **Mở thêm Client thứ 3, thứ 4,... (Tự động tìm cổng khả dụng trống tiếp theo: 3002, 3003...):**
    - **Windows (PowerShell):**
      ```powershell
      # Tự quét và chạy client mới ở cổng trống tiếp theo
      .\add-client.ps1
      
      # Hoặc chỉ định một cổng cụ thể
      .\add-client.ps1 -Port 3005
      ```
    - **Linux / macOS / WSL (Bash):**
      ```bash
      chmod +x add-client.sh
      # Tự quét và chạy client mới ở cổng trống tiếp theo
      ./add-client.sh
      
      # Hoặc chỉ định một cổng cụ thể
      ./add-client.sh 3005
      ```

---

## 🔄 3. Hướng Dẫn Cập Nhật Hệ Thống (System Update Guide)

Khi mã nguồn chương trình được cập nhật hoặc thay đổi (có thêm thư viện mới, thay đổi cấu trúc database/migrations, docker images mới...), hãy sử dụng công cụ cập nhật nhanh dưới đây để làm mới toàn bộ hệ thống cục bộ:

### A. Scripts Cập Nhật Tự Động (Quick Update Scripts)
Các scripts này sẽ tự động: cập nhật code từ Git (tùy chọn), nâng cấp thư viện Python & Node.js, kiểm tra các file cấu hình môi trường, rebuild container Docker, chạy database migrations và cập nhật dữ liệu mẫu.

*   **Trên Windows (PowerShell):**
    ```powershell
    # Chạy cập nhật mặc định (Backend, Frontend, local DB và Docker)
    .\update.ps1
    
    # Cập nhật kèm theo kéo code mới nhất từ Git và làm sạch môi trường (.venv, node_modules)
    .\update.ps1 -Pull -Clean
    
    # Khôi phục và nạp lại toàn bộ database/dữ liệu mẫu từ đầu (Reset Database & Re-seed)
    .\update.ps1 -ResetDb
    
    # Chỉ cập nhật môi trường cục bộ (Local Only) hoặc môi trường Docker (Docker Only)
    .\update.ps1 -LocalOnly
    .\update.ps1 -DockerOnly
    ```
*   **Trên Linux / macOS / WSL (Bash):**
    ```bash
    chmod +x update.sh
    
    # Chạy cập nhật mặc định
    ./update.sh
    
    # Kéo code mới nhất từ Git và xóa sạch cài lại dependencies
    ./update.sh --pull --clean
    
    # Khởi động lại database sạch và seed lại dữ liệu
    ./update.sh --reset-db
    
    # Chỉ cập nhật local hoặc docker
    ./update.sh --local-only
    ./update.sh --docker-only
    ```

### B. Các Lệnh Cập Nhật Chi Tiết Bằng Tay (Manual Update Commands)
Nếu bạn muốn tự chạy từng lệnh độc lập để kiểm soát quá trình:

1. **Cập nhật mã nguồn và dependencies:**
   ```bash
   git pull
   
   # Backend: Kích hoạt môi trường ảo & cài đặt các thư viện mới nhất
   source .venv/bin/activate  # Trên Windows dùng: .venv\Scripts\activate
   pip install --upgrade pip setuptools wheel
   pip install -U -e "backend[dev]"
   
   # Frontend: Nâng cấp node modules
   cd frontend
   npm install
   cd ..
   ```

2. **Cập nhật & Khởi động Docker containers:**
   ```bash
   # Dừng hệ thống cũ
   docker compose down
   # Rebuild và khởi động lại các container mới để cập nhật code thay đổi
   docker compose up -d --build
   ```

3. **Đồng bộ cấu trúc database mới nhất (Migrations):**
   *   **Môi trường cục bộ (SQLite):**
       ```bash
       # Do SQLite có một số giới hạn ALTER TABLE khi nâng cấp migrations cũ, 
       # cách an toàn nhất nếu gặp lỗi là dựng lại schema từ Model Metadata rồi stamp lên head:
       cd backend
       python -c "from app.core.config import get_settings; from app.db.session import build_engine; from app.db.base import Base; Base.metadata.create_all(build_engine(get_settings().database_url))"
       python -m alembic stamp head
       ```
   *   **Môi trường Docker (PostgreSQL):**
       ```bash
       docker compose exec -T backend alembic upgrade head
       ```

---

## ⚙️ 4. Thiết Lập Môi Trường (Environment Configurations)

Để Client và Server nói chuyện được với nhau qua mạng mà không bị lỗi, các file cấu hình môi trường sau cần được thiết lập đúng:

### A. Cấu Hình Backend (`backend/.env`)
```ini
# Kết nối database
DATABASE_URL=postgresql+psycopg://app:app@localhost:5432/secondhand_marketplace

# Khóa bí mật dùng để mã hóa mã JWT token bảo mật
JWT_SECRET_KEY=change-me-in-dev-please-use-at-least-32-bytes
ACCESS_TOKEN_EXPIRE_MINUTES=120

# [CỰC KỲ QUAN TRỌNG] Danh sách các domain Client được phép gọi API (tránh lỗi CORS)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

### B. Cấu Hình Frontend (`frontend/.env.local`)
```ini
# URL của Backend Server để Frontend thực hiện cuộc gọi API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🛠️ 5. Hướng Dẫn Chạy Thủ Công Từng Bước (Manual Setup Guide)

Trong trường hợp bạn không muốn sử dụng các script tự động, hãy làm theo các bước chi tiết sau:

### Bước 1: Khởi Động PostgreSQL
```bash
docker compose up -d postgres
```

### Bước 2: Cấu Hình Môi Trường & Thư Viện Backend
```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo môi trường ảo python (nếu chưa có)
python -m venv .venv
source .venv/bin/activate  # Trên Windows dùng: .venv\Scripts\activate

# Cài đặt các package và thư viện liên quan
pip install -e ".[dev]"
```

### Bước 3: Đồng Bộ Database & Seed Dữ Liệu
```bash
# Thực thi migrations tạo bảng dữ liệu
python -m alembic upgrade head

# Nạp dữ liệu mẫu (20 users, 60 listings, chat, đề xuất giá, hẹn gặp...)
python seed_data.py
```

### Bước 4: Chạy Backend Server
```bash
# Chạy server với tính năng tự động reload khi sửa code
python -m uvicorn app.main:app --reload --app-dir . --port 8000
```
> API Docs sẽ hoạt động tại: **`http://localhost:8000/docs`**

### Bước 5: Cấu Hình & Chạy Frontend Client
```bash
# Mở terminal mới, di chuyển vào thư mục frontend
cd frontend

# Cài đặt thư viện Node.js
npm install

# Khởi chạy Next.js development server
npm run dev -- --port 3000
```
> Giao diện người dùng hoạt động tại: **`http://localhost:3000`**

---

## 📡 6. Tối Ưu Hóa Mạng Để Đảm Bảo Hoạt Động Ổn Định

Để chương trình Client-Server hoạt động mượt mà, chịu tải tốt và không xảy ra các lỗi gián đoạn mạng đột ngột, các giải pháp lập trình mạng sau đã và đang được áp dụng:

### 1. Xử Lý CORS (Cross-Origin Resource Sharing)
*   **Vấn đề:** Trình duyệt sẽ chặn tất cả các cuộc gọi API từ `http://localhost:3000` đến `http://localhost:8000` nếu Server không cấp phép rõ ràng.
*   **Giải pháp:** Trong `backend/app/main.py`, chúng tôi sử dụng `CORSMiddleware` cấu hình các origin, cho phép các phương thức (`GET`, `POST`, `PUT`, `DELETE`...) và headers truyền tải dữ liệu an toàn.

### 2. Quản Lý Hồ Bơi Kết Nối (Database Connection Pooling)
*   **Vấn đề:** Mỗi yêu cầu HTTP mở một kết nối TCP mới tới PostgreSQL sẽ làm quá tải RAM của DB Server và gây trễ mạng nặng nề.
*   **Giải pháp:** Sử dụng cơ chế Pooling của SQLAlchemy. Chúng ta giới hạn số kết nối hoạt động đồng thời (ví dụ: `pool_size=20`) và cho phép vượt mức tạm thời (`max_overflow=10`). Các kết nối sẽ được tái sử dụng liên tục thay vì đóng mở liên tục.

### 3. Tối Ưu Hóa REST Polling & Hướng Tới WebSockets
*   **Hiện tại (REST Polling):** Trang chat hiển thị tin nhắn thời gian thực bằng cách gửi request `GET /api/v1/chat/conversations/{id}` mỗi **5 giây** (`setInterval`).
*   **Cách tối ưu hóa Client: (Giảm tải mạng)**
*   **Ngăn chặn dồn ứ Request (Request Accumulation):** Không dùng `setInterval` đơn thuần. Sử dụng đệ quy `setTimeout` chỉ kích hoạt vòng lặp tiếp theo sau khi request hiện tại đã trả về kết quả (thành công hoặc thất bại).
*   **Retry logic:** Khi mất kết nối mạng đột ngột, client không nên spam API liên tục. Áp dụng thuật toán **Exponential Backoff** (tăng dần thời gian chờ giữa các lần thử lại: 2s, 4s, 8s, 16s...) và hiển thị trạng thái "Đang kết nối lại..." để người dùng biết.
*   **Tương lai (WebSocket):** Nâng cấp module Chat sang giao thức `ws://` để thiết lập kết nối song hướng (Bi-directional TCP connection) giúp truyền tải tin nhắn lập tức và giảm 99% lượng băng thông thừa từ REST headers.

---

## 🔍 7. Giải Quyết Sự Cố Thường Gặp (Troubleshooting)

### Lỗi 1: Port 3000 hoặc 8000 đã bị chiếm dụng (`Port already in use`)
Một tiến trình chạy ẩn từ trước chưa được tắt hoàn toàn đang chiếm giữ cổng mạng.

*   **Cách xử lý trên Windows (PowerShell):**
    ```powershell
    # Tìm ID tiến trình (PID) đang dùng port 8000
    Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -Property OwningProcess
    
    # Tắt tiến trình đó đi (Thay thế <PID> bằng số cụ thể vừa tìm được)
    Stop-Process -Id <PID> -Force
    ```
*   **Cách xử lý trên Linux / macOS:**
    ```bash
    # Tìm và diệt tiến trình dùng port 8000
    lsof -i :8000
    kill -9 <PID>
    ```

### Lỗi 2: Lỗi CORS trên trình duyệt (`Access-Control-Allow-Origin missing`)
*   **Nguyên nhân:** Địa chỉ IP/Domain bạn dùng để truy cập Frontend không trùng khớp với danh sách được cấu hình trong `BACKEND_CORS_ORIGINS`.
*   **Cách khắc phục:** Cập nhật lại danh sách origin trong file `backend/.env`. Ví dụ: nếu bạn truy cập bằng IP mạng nội bộ để test trên điện thoại:
    ```ini
    BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","http://192.168.1.15:3000"]
    ```

### Lỗi 3: Database Connection Refused khi chạy trong Docker
*   **Nguyên nhân:** Container Backend cố gắng kết nối tới `localhost:5432` nhưng trong môi trường Docker mạng ảo, `localhost` trỏ vào chính container Backend chứ không phải container Postgres.
*   **Cách khắc phục:** Đảm bảo `DATABASE_URL` trong file `docker-compose.yml` sử dụng hostname là `postgres` (tên của service database trong file compose):
    ```yaml
    DATABASE_URL: postgresql+psycopg://app:app@postgres:5432/secondhand_marketplace
    ```

---

Chúc bạn lập trình và trải nghiệm hệ thống mượt mà! Nếu gặp bất kỳ vấn đề gì liên quan tới lỗi mạng hoặc cấu hình, hãy chạy `./stop.ps1` (Windows) hoặc `./stop.sh` (Linux) để reset toàn bộ môi trường và khởi động lại.
