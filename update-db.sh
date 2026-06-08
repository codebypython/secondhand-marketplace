#!/bin/bash
set -e

# Thiết lập chế độ thoát khi có lỗi
trap 'echo "Có lỗi xảy ra, tiến trình dừng lại."; exit 1' ERR

echo "=========================================================="
echo "🔄 DỌN DẸP & CẬP NHẬT DATABASE (SECONDHAND MARKETPLACE)"
echo "=========================================================="

# 1. Kích hoạt Virtual Environment Python
if [ ! -d ".venv" ]; then
    echo "Đang tạo môi trường ảo Python (.venv)..."
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q --upgrade pip setuptools wheel
pip install -q -e "backend[dev]"

DOCKER_MODE=false
NO_SEED=false

# Phân tích tham số đầu vào
for arg in "$@"
do
    if [ "$arg" == "--docker" ]; then
        DOCKER_MODE=true
    elif [ "$arg" == "--no-seed" ]; then
        NO_SEED=true
    fi
done

if [ "$DOCKER_MODE" = true ]; then
    echo -e "\n[1/3] Resetting PostgreSQL Database in Docker..."
    
    if ! command -v docker >/dev/null 2>&1 || ! docker ps >/dev/null 2>&1; then
        echo "Lỗi: Docker Daemon chưa chạy. Vui lòng bật Docker để reset PostgreSQL DB."
        exit 1
    fi
    
    echo "Stopping and deleting database volumes..."
    docker compose down -v postgres
    docker compose up -d postgres
    
    echo "Waiting for database container (PostgreSQL) to be ready..."
    pg_ready=false
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U app -d secondhand_marketplace > /dev/null 2>&1; then
            pg_ready=true
            break
        fi
        sleep 2
    done
    
    if [ "$pg_ready" = true ]; then
        echo -e "\n[2/3] Running migrations inside Docker..."
        docker compose exec -T backend alembic upgrade head
        
        if [ "$NO_SEED" = false ]; then
            echo -e "\n[3/3] Seeding fresh data inside Docker..."
            docker compose exec -T backend python seed_data.py
        fi
    else
        echo "Lỗi: Không thể kết nối PostgreSQL."
        exit 1
    fi
else
    echo -e "\n[1/3] Resetting Local SQLite Database..."
    DB_FILE="backend/alembic-dev.db"
    
    if [ -f "$DB_FILE" ]; then
        echo "Deleting old SQLite database file ($DB_FILE)..."
        rm -f "$DB_FILE"
    fi
    
    echo -e "\n[2/3] Generating database schema & stamping migration head..."
    cd backend
    python3 -c "from app.core.config import get_settings; from app.db.session import build_engine; from app.db.base import Base; Base.metadata.create_all(build_engine(get_settings().database_url))"
    python3 -m alembic stamp head
    
    if [ "$NO_SEED" = false ]; then
        echo -e "\n[3/3] Seeding fresh mock data..."
        python3 seed_data.py
    fi
    cd ..
fi

echo -e "\n=========================================================="
echo "🎉 HOÀN TẤT RESET & CẬP NHẬT DATABASE THÀNH CÔNG!"
echo "=========================================================="
