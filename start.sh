#!/bin/bash
set -e

# Thiết lập chế độ thoát khi có lỗi
trap 'echo "Có lỗi xảy ra, tiến trình dừng lại."; exit 1' ERR

echo "=========================================================="
echo "🚀 KHỞI ĐỘNG LOCAL DEVELOPMENT (CLIENT-SERVER)"
echo "=========================================================="

API_PORT=8000
WEB_PORT1=3000
WEB_PORT2=3001

# 1. Kích hoạt Virtual Environment Python
if [ ! -d ".venv" ]; then
    echo "Đang tạo môi trường ảo Python (.venv)..."
    python3 -m venv .venv
fi
source .venv/bin/activate

echo "Đang cài đặt thư viện backend..."
pip install -q -e "backend[dev]"

# 2. Tạo các file cấu hình môi trường từ file ví dụ
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "Đã tạo backend/.env từ file mẫu."
fi
if [ ! -f "frontend/.env.local" ] && [ -f "frontend/.env.example" ]; then
    cp frontend/.env.example frontend/.env.local
    echo "Đã tạo frontend/.env.local từ file mẫu."
fi

# 3. Detect LAN IP address
LOCAL_IP="127.0.0.1"
if command -v ip >/dev/null 2>&1; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$LOCAL_IP" ] && command -v hostname >/dev/null 2>&1; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="127.0.0.1"
fi

if [ "$LOCAL_IP" != "127.0.0.1" ]; then
    echo -e "\033[0;32mDetected LAN IP: $LOCAL_IP\033[0m"
    ENV_FILE="frontend/.env.local"
    if [ -f "$ENV_FILE" ]; then
        if sed --version >/dev/null 2>&1; then
            sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$LOCAL_IP:$API_PORT/api/v1|g" "$ENV_FILE"
        else
            sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$LOCAL_IP:$API_PORT/api/v1|g" "$ENV_FILE"
        fi
        echo -e "\033[0;36mUpdated frontend/.env.local NEXT_PUBLIC_API_URL to http://$LOCAL_IP:$API_PORT/api/v1\033[0m"
    fi
    BACKEND_ENV_FILE="backend/.env"
    if [ -f "$BACKEND_ENV_FILE" ]; then
        CORS_VAL="[\"http://localhost:3000\",\"http://127.0.0.1:3000\",\"http://$LOCAL_IP:3000\",\"http://$LOCAL_IP:3001\"]"
        if sed --version >/dev/null 2>&1; then
            sed -i "s|BACKEND_CORS_ORIGINS=.*|BACKEND_CORS_ORIGINS=$CORS_VAL|g" "$BACKEND_ENV_FILE"
        else
            sed -i '' "s|BACKEND_CORS_ORIGINS=.*|BACKEND_CORS_ORIGINS=$CORS_VAL|g" "$BACKEND_ENV_FILE"
        fi
        echo -e "\033[0;36mUpdated backend/.env BACKEND_CORS_ORIGINS to include LAN IP\033[0m"
    fi
fi

# 4. Khởi động Backend Server
echo "Đang khởi động Backend API Server (Uvicorn)..."
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port $API_PORT &
BACKEND_PID=$!
cd ..

# 5. Khởi động Frontend Clients
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Đang cài đặt thư viện Frontend..."
    npm install
fi

echo "Đang khởi động Frontend Client ở cổng $WEB_PORT1..."
PORT=$WEB_PORT1 npm run dev -- --hostname 0.0.0.0 --port $WEB_PORT1 &
CLIENT1_PID=$!
cd ..

echo -e "\n=========================================================="
echo "🎉 HỆ THỐNG ĐÃ KHỞI ĐỘNG THÀNH CÔNG!"
echo "----------------------------------------------------------"
echo "• Backend API:  http://localhost:$API_PORT/docs (hoặc http://$LOCAL_IP:$API_PORT/docs)"
echo "• Frontend URL: http://localhost:$WEB_PORT1 (hoặc http://$LOCAL_IP:$WEB_PORT1)"
echo -e "\033[0;32m👉 Truy cập LAN: http://$LOCAL_IP:$WEB_PORT1\033[0m"
echo -e "\033[0;32m👉 iOS/iPhone (Bảo mật HTTPS): Chạy 'npx ngrok http $WEB_PORT1' để lấy link HTTPS.\033[0m"
echo -e "\033[0;36m👉 Demo 2 tài khoản: Mở 1 tab thường và 1 tab ẩn danh truy cập Frontend URL.\033[0m"
echo "----------------------------------------------------------"
echo "Để tắt toàn bộ tiến trình chạy ngầm, hãy chạy ./stop.sh"
echo "=========================================================="

# Đợi các tiến trình con kết thúc
wait
