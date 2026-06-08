#!/bin/bash

# Dừng tất cả uvicorn và next dev đang chạy trên máy
echo "Đang dừng các tiến trình backend và frontend..."
pkill -f "uvicorn app.main:app" || true
pkill -f "next-dev" || true
pkill -f "next" || true
pkill -f "npm run dev" || true

# Tắt docker containers
if [ -f "docker-compose.yml" ]; then
    if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
        echo "Đang dừng các container Docker..."
        docker compose down
    else
        echo "Docker daemon không chạy. Bỏ qua việc dừng container."
    fi
fi

echo "Đã dừng tất cả dịch vụ."
