#!/bin/bash
set -e

# Thiết lập chế độ thoát khi có lỗi
trap 'echo "Có lỗi xảy ra, tiến trình dừng lại."; exit 1' ERR

echo "=========================================================="
echo "🔄 DỌN DẸP & RESET DATABASE (LOCAL DATABASE)"
echo "=========================================================="

# 1. Kích hoạt Virtual Environment Python
if [ ! -d ".venv" ]; then
    echo "Đang tạo môi trường ảo Python (.venv)..."
    python3 -m venv .venv
fi
source .venv/bin/activate

echo "Cài đặt/Kiểm tra thư viện backend..."
pip install -q -e "backend[dev]"

# Ensure .env exists
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
fi

NO_SEED=false
# Phân tích tham số đầu vào
for arg in "$@"
do
    if [ "$arg" == "--no-seed" ]; then
        NO_SEED=true
    fi
done

cd backend

echo -e "\n[1/3] Resetting database tables..."
python3 scripts/reset_db.py

echo -e "\n[2/3] Stamping database migration to HEAD..."
python3 -m alembic stamp head

if [ "$NO_SEED" = false ]; then
    echo -e "\n[3/3] Seeding fresh mock data..."
    python3 seed_data.py
fi

cd ..

echo -e "\n=========================================================="
echo "🎉 HOÀN TẤT RESET & CẬP NHẬT DATABASE THÀNH CÔNG!"
echo "=========================================================="
