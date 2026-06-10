#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 MỞ THÊM 1 FRONTEND CLIENT MỚI"
echo "=========================================================="

PORT=$1
if [ -z "$PORT" ]; then
    PORT=3002
    # Find next free port
    while lsof -i :$PORT >/dev/null 2>&1; do
        PORT=$((PORT+1))
    done
fi

echo "Đang khởi động Next.js client tại cổng $PORT..."
cd frontend
PORT=$PORT npm run dev -- --hostname 0.0.0.0 --port $PORT &
cd ..

echo -e "\033[0;32mClient mới đang chạy tại: http://localhost:$PORT\033[0m"
wait
