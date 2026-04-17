# Quản Lý Danh Mục (Categories)

## Nhóm chức năng
Quản lý tin đăng (Listings) — Vai trò: **Khách (xem)** / **Người dùng (tạo)**

## Tên cụ thể của chức năng
Xem danh sách danh mục (`GET /api/v1/listings/categories`) và tạo danh mục mới (`POST /api/v1/listings/categories`)

## Cách mà nó nhận dữ liệu từ Client
- **GET:** Không cần authentication, không có params — trả về toàn bộ danh mục.
- **POST:** Bearer token + JSON body `{ name: string, parent_id?: UUID }`.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
- **GET:** `SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name ASC`.
- **POST:** `INSERT INTO categories(name, parent_id)`. Commit + refresh.

## Cách mà luồng Backend hoạt động
```
GET /listings/categories → list_categories() → SELECT * ORDER BY name
POST /listings/categories + Bearer + JSON → create_category() → INSERT → 201
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **REST collection:** GET trả về danh sách, POST tạo mới.
- **Self-referential relationship:** Category có `parent_id → categories.id` cho danh mục con.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Self-referential relationship:** `Category.parent` và `Category.children` — **Composite pattern** cho tree structure.
- **`SoftDeleteMixin`** trên Category — tái sử dụng mixin.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang tạo tin đăng load `api.listCategories()` → populate dropdown "Danh mục".
2. Trang chủ hiển thị category badge trên mỗi card sản phẩm.

## Lộ trình phát triển

### Giai đoạn 1 — UI & Hierarchy (Ngắn hạn)
- Hiển thị **tree view** danh mục (parent → children) trên sidebar.
- Thêm **icon/emoji** cho mỗi danh mục (📱, 👕, 🏡, ...).
- **Category page:** `/categories/{id}` — hiển thị tất cả sản phẩm trong danh mục.
- **Breadcrumb:** Trang chủ > Điện tử > Điện thoại.
- Đếm **số sản phẩm** trong mỗi danh mục.

### Giai đoạn 2 — Quản lý Nâng cao (Trung hạn)
- **Admin dashboard** quản lý danh mục: CRUD trực quan, drag & drop sắp xếp.
- Hỗ trợ **slug URL**: `/danh-muc/dien-tu/dien-thoai` thay vì UUID.
- **Danh mục nổi bật** — admin pin category lên trang chủ.
- Thêm **ảnh cover** cho mỗi danh mục.
- Không cho phép xóa danh mục đang có sản phẩm.

### Giai đoạn 3 — Dynamic & AI (Dài hạn)
- **Auto-suggest category** khi tạo tin đăng (dựa trên tiêu đề + mô tả).
- **Tag system** bổ sung cho category (VD: #vintage #freeship).
- **Category analytics:** thống kê sản phẩm, doanh thu, trend theo danh mục.
