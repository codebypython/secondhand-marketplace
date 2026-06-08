#!/bin/bash
set -e

# Script chạy nhanh ứng dụng secondhand-marketplace cục bộ (không chạy backend/frontend qua Docker)

# Thiết lập chế độ thoát khi có lỗi
trap 'echo "Có lỗi xảy ra, tiến trình dừng lại."; exit 1' ERR

echo "=========================================================="
echo "🚀 KHỞI ĐỘNG LOCAL DEVELOPMENT (CLIENT-SERVER)"
echo "=========================================================="

# 1. Tạo & Kích hoạt Virtual Environment Python
if [ ! -d ".venv" ]; then
    echo "Đang tạo môi trường ảo Python (.venv)..."
    python3 -m venv .venv
fi
source .venv/bin/activate

# 2. Cài đặt các thư viện backend
echo "Đang cài đặt thư viện backend..."
pip install -e "backend[dev]"

# 3. Tạo các file cấu hình môi trường từ file ví dụ
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "Đã tạo backend/.env từ file mẫu."
fi
if [ ! -f "frontend/.env.local" ] && [ -f "frontend/.env.example" ]; then
    cp frontend/.env.example frontend/.env.local
    echo "Đã tạo frontend/.env.local từ file mẫu."
fi

# 4. Khởi động PostgreSQL từ docker-compose
if [[ " $* " != *" --no-docker "* ]]; then
    echo "Khởi động container PostgreSQL..."
    docker compose up -d postgres
    echo "Đang chờ PostgreSQL sẵn sàng..."
    pg_ready=false
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U app -d secondhand_marketplace > /dev/null 2>&1; then
            pg_ready=true
            break
        fi
        sleep 2
    done
    if [ "$pg_ready" = false ]; then
        echo "Lỗi: Không kết nối được PostgreSQL."
        exit 1
    fi
    echo "PostgreSQL đã sẵn sàng!"
fi

# 5. Chạy database migration
if [[ " $* " != *" --no-migrate "* ]]; then
    echo "Đang chạy migrations (Alembic)..."
    cd backend
    python3 -m alembic upgrade head
    cd ..
fi

# Detect LAN IP address for multi-client demo
LOCAL_IP="127.0.0.1"
if command -v hostname >/dev/null 2>&1; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
elif command -v ip >/dev/null 2>&1; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="127.0.0.1"
fi

if [ "$LOCAL_IP" != "127.0.0.1" ]; then
    echo -e "\033[0;32mDetected LAN IP: $LOCAL_IP\033[0m"
    ENV_FILE="frontend/.env.local"
    if [ -f "$ENV_FILE" ]; then
        if sed --version >/dev/null 2>&1; then
            sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1|g" "$ENV_FILE"
        else
            sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$LOCAL_IP:8000/api/v1|g" "$ENV_FILE"
        fi
        echo -e "\033[0;36mUpdated frontend/.env.local NEXT_PUBLIC_API_URL to http://$LOCAL_IP:8000/api/v1\033[0m"
    fi
fi

# 6. Khởi động Backend Server
echo "Đang khởi động Backend API Server (Uvicorn)..."
python3 -m uvicorn app.main:app --reload --app-dir backend --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 7. Khởi động Frontend Client
if [[ " $* " != *" --no-frontend "* ]]; then
    echo "Đang cài đặt và khởi động Frontend Client (Next.js)..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run dev -- --hostname 0.0.0.0 --port 3000 &
    FRONTEND_PID=$!
    cd ..
fi

echo -e "\n=========================================================="
echo "🎉 HỆ THỐNG ĐÃ KHỞI ĐỘNG THÀNH CÔNG (CỤC BỘ)!"
echo "----------------------------------------------------------"
echo "• Backend API:  http://localhost:8000 (hoặc http://$LOCAL_IP:8000)"
echo "• Swagger Docs: http://localhost:8000/docs (hoặc http://$LOCAL_IP:8000/docs)"
if [[ " $* " != *" --no-frontend "* ]]; then
    echo "• Frontend:     http://localhost:3000 (hoặc http://$LOCAL_IP:3000)"
    echo -e "\033[0;32m👉 Để truy cập từ thiết bị khác trong cùng mạng LAN: http://$LOCAL_IP:3000\033[0m"
fi
echo "----------------------------------------------------------"
echo "Để tắt toàn bộ tiến trình chạy ngầm, hãy gõ: kill $BACKEND_PID $FRONTEND_PID 2>/dev/null hoặc chạy ./stop.sh"
echo "=========================================================="

# Đợi các tiến trình con kết thúc
wait
