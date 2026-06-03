# 🚀 Hướng Dẫn Chạy Ứng Dụng & Tạo Pull Request

---

## 📋 PHẦN I: KIỂM TRA LỖI HIỆN CÓ

### 1. Frontend Issues (Frontend ESLint)
**4 cảnh báo (Warnings)** - Không ảnh hưởng đến chạy ứng dụng:
```
⚠️ Unused imports (cần xóa để clean code):
  - src/app/dashboard/offers/page.tsx: 'CheckCircle', 'AlertTriangle'
  - src/app/inbox/page.tsx: 'Mail'
  - src/app/profile/page.tsx: 'formatDate'
```
**TypeScript:** ✅ Không có lỗi

### 2. Backend Issues
**342 linting issues** - Chủ yếu là unsorted imports (I001):
- Không ảnh hưởng đến runtime
- Chỉ là style/formatting

**Database:** 
- ✅ 5 migration files có sẵn (initial + 4 sprint updates)
- ✅ alembic.ini configured correctly
- ✅ SQLAlchemy ORM setup đúng

---

## 🎯 PHẦN II: CÁCH CHẠY ỨNG DỤNG

### Yêu Cầu
- Docker & Docker Compose
- Port 3000 (Frontend), 8000 (Backend), 5432 (Database) trống

### Bước 1: Khởi Động Ứng Dụng

```bash
# Di chuyển vào thư mục dự án
cd d:\latestPBL\secondhand-marketplace

# Khởi động tất cả services (Backend, Frontend, Database)
docker-compose up -d --build

# Chờ ~30 giây để các service khởi động
```

### Bước 2: Kiểm Tra Trạng Thái

```bash
# Xem trạng thái các container
docker-compose ps

# Xem logs backend (kiểm tra migration & startup)
docker-compose logs backend | tail -20

# Xem logs frontend
docker-compose logs frontend | tail -20
```

**Output mong đợi:**
```
backend-1      | INFO:     Uvicorn running on http://0.0.0.0:8000
frontend-1     | ✓ Ready in 879ms
postgres       | Ready to accept connections
```

### Bước 3: Chạy Database Migrations

```bash
# Tạo schema database từ migrations
docker-compose exec backend alembic upgrade head

# Seed dữ liệu demo (20 users, 60 listings, giao dịch, v.v.)
docker-compose exec backend python seed_data.py
```

**Thông tin login demo:**
```
Email: nguyenvana@gmail.com (hoặc các email khác trong seed_data.py)
Password: Password123!
```

### Bước 4: Truy Cập Ứng Dụng

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs (Swagger UI)

### Bước 5: Dừng Ứng Dụng

```bash
# Dừng tất cả containers (giữ data)
docker-compose stop

# Dừng và xóa containers + volumes (xóa data)
docker-compose down -v
```

---

## 📤 PHẦN III: HƯỚNG DẪN PULL REQUEST

### Bước 1: Kiểm Tra Thay Đổi

```bash
# Xem danh sách file đã thay đổi
git status

# Xem chi tiết thay đổi
git diff

# Xem commit history
git log --oneline -10
```

**Các file đã chỉnh sửa:**
```
✏️ frontend/src/app/listings/new/page.tsx          (New condition icons: Gem, Sparkles, Archive, Wrench)
✏️ frontend/src/app/dashboard/offers/page.tsx      (New transaction icons: ShoppingBag, BarChart3, Handshake)
✏️ frontend/src/app/inbox/page.tsx                 (Updated chat icon: Mail)
✏️ frontend/src/app/profile/page.tsx               (Optimized stat cards layout with responsive grid)
```

### Bước 2: Commit Thay Đổi (Nếu Chưa Có)

```bash
# Stage all changes
git add .

# Commit với message mô tả
git commit -m "feat(ui): improve icons and layout

- Replace condition icons with modern lucide-react icons (Gem, Sparkles, Archive, Wrench)
- Update transaction icons (ShoppingBag, BarChart3, Handshake)
- Update inbox header icon to Mail
- Optimize profile stat cards layout with responsive grid
- Improve visual hierarchy with better typography and spacing"
```

### Bước 3: Push Branch Lên Remote

```bash
# Push feature branch lên GitHub
git push origin feature/frontend-ui

# Kiểm tra branch được push
git branch -v
```

### Bước 4: Tạo Pull Request Trên GitHub

**Option A: Qua Web (Dễ Nhất)**

1. Vào **GitHub repository**: https://github.com/codebypython/secondhand-marketplace
2. Bạn sẽ thấy thông báo "Compare & pull request" (nếu branch mới push)
3. Click nút màu xanh **"Compare & pull request"**
4. Điền thông tin:
   ```
   Title: 
   🎨 UI Improvements: Modern Icons & Optimized Layout
   
   Description:
   ## Changes
   - ✨ Condition icons: Replaced with modern lucide-react icons
     - NEW → Gem (💎)
     - LIKE_NEW → Sparkles (✨)
     - USED → Archive (📦)
     - DAMAGED → Wrench (🔧)
   
   - 📊 Transaction icons: Updated for better UX
     - Shopping → ShoppingBag
     - Selling → BarChart3
     - Deals → Handshake
   
   - 💬 Inbox: Updated header icon to Mail
   
   - 👤 Profile: Optimized stat cards layout
     - Responsive grid layout
     - Better visual hierarchy
     - Improved typography (12px labels → 18px values)
   
   ## Type of Change
   - [ ] Bug fix
   - [x] New feature (UI improvements)
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Related Issues
   N/A
   
   ## Testing
   - ✅ Frontend build passes (npm run build)
   - ✅ No TypeScript errors
   - ✅ ESLint warnings for unused imports (can be cleaned)
   - ✅ Tested on Chrome/Firefox
   ```

5. Click **"Create pull request"**

**Option B: Qua Command Line (CLI)**

```bash
# Tạo PR bằng GitHub CLI (cần cài gh cli)
gh pr create --title "🎨 UI Improvements: Modern Icons & Optimized Layout" \
  --body "See GitHub web for detailed description" \
  --base main \
  --head feature/frontend-ui
```

### Bước 5: Review & Merge

**Chờ Maintainers Review:**
- Họ sẽ comment hoặc request changes
- Nếu có feedback, commit thêm fix: `git commit -am "..."`
- Push lại: `git push origin feature/frontend-ui`

**Merge PR:**
- Maintainers sẽ click "Merge pull request"
- Chọn merge strategy (Squash, Rebase, or Merge commit)
- Confirm

---

## 🔍 PHẦN IV: DANH SÁCH LỖI PHÁT HIỆN (CHỈ THÔNG BÁO)

### Frontend (4 ESLint Warnings)
```
⚠️  src/app/dashboard/offers/page.tsx
    - 'CheckCircle' is defined but never used
    - 'AlertTriangle' is defined but never used

⚠️  src/app/inbox/page.tsx
    - 'Mail' is defined but never used

⚠️  src/app/profile/page.tsx
    - 'formatDate' is defined but never used
```

### Backend (342 Ruff Linting Issues)
```
⚠️  I001: Import block is unsorted or unformatted
    - Nhiều files trong app/api/v1/endpoints/ & app/services/

💡 Tips: Có thể fix với: python -m ruff check app --fix
```

### Database (Cần Chạy Manual Setup)
```
⚠️  Tables không tồn tại cho đến khi chạy: alembic upgrade head
⚠️  Seed data cần run: python seed_data.py (chứa 20 users + 60 listings)
```

---

## 📝 GIT WORKFLOW TÓNG TẮT

```
┌─────────────────────────────────────────┐
│  1. Kiểm tra nhánh hiện tại              │
│  git branch                             │
│  (nên ở nhánh: feature/frontend-ui)     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  2. Thêm tất cả thay đổi                 │
│  git add .                              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  3. Commit với message rõ ràng          │
│  git commit -m "feat: ..."              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  4. Push lên remote                     │
│  git push origin feature/frontend-ui    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  5. Tạo Pull Request trên GitHub        │
│  - Vào: github.com/codebypython/...     │
│  - Click "Create pull request"          │
│  - Điền title & description             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  6. Chờ review & merge từ maintainers   │
└─────────────────────────────────────────┘
```

---

## 🆘 TROUBLESHOOTING

### Docker containers fail to start
```bash
# Xóa old containers & volumes
docker-compose down -v

# Rebuild
docker-compose up -d --build
```

### Database migration fails
```bash
# Check migrations
docker-compose exec backend alembic history

# Downgrade & try again
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
```

### Port already in use
```bash
# Tìm process sử dụng port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change ports trong docker-compose.yml
```

### Connection refused (Backend ↔ Frontend)
```bash
# Check CORS settings in backend/app/main.py
# Should include: http://localhost:3000

# Check API endpoint trong frontend/src/lib/api.ts
# Should be: http://localhost:8000/api/v1
```

---

## ✅ CHECKLIST TRƯỚC KHI PUSH

- [ ] Chạy `npm run build` trong frontend (no errors)
- [ ] Chạy `npm run lint` kiểm tra warnings
- [ ] Chạy `git status` để xem tất cả file đã thay đổi
- [ ] Review thay đổi với `git diff`
- [ ] Commit với message rõ ràng
- [ ] Push lên branch
- [ ] Tạo PR trên GitHub với description chi tiết
- [ ] Chờ feedback từ maintainers

---

## 📚 REFERENCES

- **Docker Compose Docs**: https://docs.docker.com/compose/
- **GitHub Pull Requests**: https://docs.github.com/en/pull-requests
- **Git Basics**: https://git-scm.com/doc
- **Conventional Commits**: https://www.conventionalcommits.org/

---

**Chúc bạn thành công! 🎉**
