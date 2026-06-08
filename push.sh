#!/bin/bash
set -e

# Thiết lập chế độ thoát khi có lỗi
trap 'echo "Có lỗi xảy ra, tiến trình dừng lại."; exit 1' ERR

echo "=========================================================="
echo "🚀 CHUẨN HÓA & ĐĂNG MÃ NGUỒN LÊN GITHUB (COMMIT CHUYÊN NGHIỆP)"
echo "=========================================================="

# Show git status
echo -e "\033[0;33mCurrent Git Status:\033[0m"
git status
echo ""

read -p "Bạn có muốn stage và commit toàn bộ thay đổi? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Hủy bỏ."
    exit 0
fi

NO_TEST=false
NO_PUSH=false

# Phân tích tham số đầu vào
for arg in "$@"
do
    if [ "$arg" == "--no-test" ]; then
        NO_TEST=true
    elif [ "$arg" == "--no-push" ]; then
        NO_PUSH=true
    fi
done

# Run tests and compilation checks
if [ "$NO_TEST" = false ]; then
    echo -e "\n[1/4] Running backend unit tests (Pytest)..."
    if [ -d ".venv" ]; then
        source .venv/bin/activate
        cd backend
        python3 -m pytest
        cd ..
        echo -e "\033[0;32m✅ Backend tests passed!\033[0m"
    else
        echo -e "\033[0;33m⚠️ Warning: .venv not found. Skipping backend tests.\033[0m"
    fi

    echo -e "\n[2/4] Running frontend compilation check (Next.js build)..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run build
    cd ..
    echo -e "\033[0;32m✅ Frontend compilation check passed!\033[0m"
else
    echo -e "\n[1/4] Skipping tests and build checks (--no-test active)."
fi

# Conventional Commits Prompt
echo -e "\n[3/4] Conventional Commits - Chọn loại thay đổi của bạn:"
echo "  1. feat:     Tính năng mới (A new feature)"
echo "  2. fix:      Sửa lỗi (A bug fix)"
echo "  3. docs:     Thay đổi tài liệu (Documentation only changes)"
echo "  4. refactor: Tái cấu trúc mã nguồn (A code change that neither fixes a bug nor adds a feature)"
echo "  5. style:    Định dạng code (Formatting, missing semi-colons, etc.)"
echo "  6. test:     Viết thêm hoặc cập nhật tests"
echo "  7. chore:    Các thay đổi phụ trợ khác (Build tools, package updates, etc.)"

read -p "Chọn số (1-7): " typeNum
type=""
case $typeNum in
    1) type="feat" ;;
    2) type="fix" ;;
    3) type="docs" ;;
    4) type="refactor" ;;
    5) type="style" ;;
    6) type="test" ;;
    7) type="chore" ;;
    *) type="" ;;
esac

if [ -z "$type" ]; then
    echo "Lỗi: Lựa chọn không hợp lệ."
    exit 1
fi

read -p "Nhập phạm vi thay đổi (Scope) [Bỏ qua nếu không có, VD: auth, wishlist]: " scope
read -p "Nhập mô tả thay đổi (Commit message) *: " msg

if [ -z "$msg" ]; then
    echo "Lỗi: Mô tả thay đổi không được để trống."
    exit 1
fi

# Construct commit message: "type(scope): message" or "type: message"
commitMsg="$type"
if [ ! -z "$scope" ]; then
    commitMsg="$commitMsg($scope)"
fi
commitMsg="$commitMsg: $msg"

echo -e "\nStaging and committing..."
git add .
git commit -m "$commitMsg"
echo -e "\033[0;32m✅ Committed successfully: '$commitMsg'\033[0m"

# Git push
if [ "$NO_PUSH" = false ]; then
    echo -e "\n[4/4] Pushing code to GitHub..."
    git push
    echo -e "\033[0;32m🎉 ĐÃ ĐĂNG MÃ NGUỒN LÊN GITHUB THÀNH CÔNG!\033[0m"
else
    echo -e "\n[4/4] Skipping git push (--no-push active)."
fi
