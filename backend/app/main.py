import time
import socket
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import SessionFactory, get_db_session
import app.events  # noqa: F401 — register domain event handlers at startup
from app.core.tracker import track_request, active_clients, blocked_ips, server_start_time, total_api_requests


def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.254.254.254', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP


def create_app(session_factory=SessionFactory) -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        description="Production-leaning social marketplace backend",
    )
    from fastapi.staticfiles import StaticFiles
    import os
    os.makedirs("static/uploads", exist_ok=True)
    app.mount("/static", StaticFiles(directory="static"), name="static")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware to track and block client connections dynamically
    @app.middleware("http")
    async def client_tracker_middleware(request: Request, call_next):
        path = request.url.path
        # Allow bypass for dashboard resources to prevent locking administration out
        if path in ["/", "/dashboard/stats", "/dashboard/block", "/dashboard/unblock", "/dashboard/activities", "/dashboard/errors"] or path.startswith("/static"):
            return await call_next(request)
            
        client_ip = request.client.host if request.client else "unknown"
        if client_ip in blocked_ips:
            from app.core.tracker import log_system_error
            log_system_error(
                ip=client_ip,
                method=request.method,
                path=request.url.path,
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Blocked client attempted access",
                source="IP Blocker"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": f"IP {client_ip} has been blocked by the Administrator."}
            )
            
        # Track active request
        track_request(request)
        try:
            response = await call_next(request)
            # Log any warning/error status codes returned normally (e.g. 404, 401)
            if response.status_code >= 400:
                from app.core.tracker import log_system_error
                log_system_error(
                    ip=client_ip,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    detail=f"HTTP Response Status {response.status_code}",
                    source="API Response"
                )
            return response
        except Exception as exc:
            raise exc

    # Exception Handlers
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException
    from app.core.tracker import log_system_error

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        client_ip = request.client.host if request.client else "unknown"
        errors_detail = exc.errors()
        log_system_error(
            ip=client_ip,
            method=request.method,
            path=request.url.path,
            status_code=422,
            detail=str(errors_detail),
            source="FastAPI Validator"
        )
        return JSONResponse(
            status_code=422,
            content={"detail": errors_detail}
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        client_ip = request.client.host if request.client else "unknown"
        log_system_error(
            ip=client_ip,
            method=request.method,
            path=request.url.path,
            status_code=exc.status_code,
            detail=str(exc.detail),
            source="FastAPI HTTP"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        import traceback
        client_ip = request.client.host if request.client else "unknown"
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        tb = traceback.format_exc()
        print("=" * 60)
        print(f"[INTERNAL ERROR] {error_msg}\n{tb}")
        print("=" * 60)
        
        log_system_error(
            ip=client_ip,
            method=request.method,
            path=request.url.path,
            status_code=500,
            detail=f"{error_msg}\n{tb}",
            source="Server Internal"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

    def get_session_override():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = get_session_override
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", response_class=HTMLResponse)
    def root() -> str:
        lan_ip = get_lan_ip()
        html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bảng Điều Khiển Server - Secondhand Marketplace</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --success: #10b981;
            --warning: #fbbf24;
            --danger: #ef4444;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background: radial-gradient(circle at top right, #1e1b4b, var(--bg-color));
            color: var(--text-main);
            min-height: 100vh;
            padding: 2rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 1.5rem;
        }

        h1 {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(to right, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--success);
            padding: 0.5rem 1rem;
            border-radius: 99px;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .pulse {
            width: 8px;
            height: 8px;
            background-color: var(--success);
            border-radius: 50%;
            animation: pulse-animation 1.5s infinite;
        }

        @keyframes pulse-animation {
            0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 2rem;
        }

        @media (max-width: 1024px) {
            .grid { grid-template-columns: 1fr; }
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            margin-bottom: 2rem;
        }
        .card:last-child {
            margin-bottom: 0;
        }

        .card-title {
            font-size: 1.15rem;
            font-weight: 600;
            margin-bottom: 1.25rem;
            border-left: 4px solid var(--primary);
            padding-left: 0.75rem;
            color: var(--text-main);
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border);
        }
        .stat-item:last-child { border-bottom: none; }
        .stat-label { color: var(--text-muted); }
        .stat-value { font-weight: 600; }

        .link-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1rem;
        }

        .link-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            padding: 0.75rem 1rem;
            border-radius: 10px;
            text-decoration: none;
            color: var(--text-main);
            transition: all 0.2s;
        }
        .link-item:hover {
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.3);
            transform: translateY(-2px);
        }
        .link-url {
            color: var(--primary);
            font-weight: 600;
            font-size: 0.9rem;
        }

        .warning-card {
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 1rem;
            border-radius: 12px;
            margin-top: 1.5rem;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .warning-card strong { color: var(--danger); }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.5rem;
        }

        th, td {
            text-align: left;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
        }
        th {
            color: var(--text-muted);
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
        }
        td { font-size: 0.9rem; }

        .btn {
            background: var(--danger);
            color: #fff;
            border: none;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn:hover { background: #dc2626; transform: scale(1.05); }
        .btn-unblock { background: var(--success); }
        .btn-unblock:hover { background: #059669; }

        .badge-blocked {
            background: rgba(239, 68, 68, 0.15);
            color: var(--danger);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .badge-active {
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-warning {
            background: rgba(245, 158, 11, 0.15);
            color: var(--warning);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .badge-danger {
            background: rgba(239, 68, 68, 0.15);
            color: #fb7185;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .client-ua {
            max-width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--text-muted);
            font-size: 0.8rem;
        }

        .error-detail-cell {
            max-width: 250px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: monospace;
            font-size: 0.8rem;
            cursor: pointer;
            color: var(--text-muted);
            transition: color 0.2s;
        }
        .error-detail-cell:hover {
            color: var(--primary);
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>Secondhand Marketplace Server</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">Bảng điều khiển quản lý và hướng dẫn kết nối hệ thống</p>
            </div>
            <div class="status-badge">
                <span class="pulse"></span>
                <span>ONLINE</span>
            </div>
        </header>

        <div class="grid">
            <!-- Left Column: Server Status & Instructions -->
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div class="card">
                    <h2 class="card-title">Trạng Thái Server</h2>
                    <div class="stat-item">
                        <span class="stat-label">Thời gian chạy (Uptime)</span>
                        <span class="stat-value" id="uptime">0s</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tổng số API requests</span>
                        <span class="stat-value" id="totalRequests">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Số IP đang bị chặn</span>
                        <span class="stat-value" id="blockedCount">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">IP LAN máy chủ</span>
                        <span class="stat-value" id="lanIp">127.0.0.1</span>
                    </div>
                </div>

                <div class="card">
                    <h2 class="card-title">Hướng Dẫn Truy Cập Trình Duyệt</h2>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">Click vào các đường dẫn dưới đây để mở giao diện kiểm thử:</p>
                    
                    <div class="link-list">
                        <a href="http://localhost:3000" target="_blank" class="link-item">
                            <span>Client 1 (Cổng 3000)</span>
                            <span class="link-url">http://localhost:3000</span>
                        </a>
                        <a href="http://localhost:3001" target="_blank" class="link-item">
                            <span>Client 2 (Cổng 3001)</span>
                            <span class="link-url">http://localhost:3001</span>
                        </a>
                        <a href="http://localhost:8000/docs" target="_blank" class="link-item">
                            <span>API Docs (Swagger UI)</span>
                            <span class="link-url">http://localhost:8000/docs</span>
                        </a>
                    </div>

                    <div id="lanLinksSection" style="margin-top: 1rem;">
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 600;">📱 Kết nối từ thiết bị khác trong mạng LAN:</p>
                        <div class="link-list" id="lanLinks"></div>
                    </div>

                    <div class="warning-card">
                        ⚠️ <strong>LƯU Ý QUAN TRỌNG:</strong> Không gõ địa chỉ <code>0.0.0.0:8000</code> trực tiếp vào trình duyệt! Địa chỉ này chỉ dùng để server liên kết mạng. Sử dụng <strong>localhost</strong> hoặc <strong>IP LAN</strong> phía trên để truy cập.
                    </div>
                </div>
            </div>

            <!-- Right Column: Connected Clients, Activities, Error Diagnostics -->
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div class="card">
                    <h2 class="card-title">Quản Lý Client Đang Kết Nối</h2>
                    <div style="overflow-x: auto; max-height: 250px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>IP Address</th>
                                    <th>Thiết bị</th>
                                    <th>Số requests</th>
                                    <th>API gần nhất</th>
                                    <th>Hoạt động</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody id="clientTableBody">
                                <tr>
                                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Đang tải danh sách kết nối...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <h2 class="card-title" style="border-left-color: var(--primary);">Nhật Ký Hoạt Động Hệ Thống</h2>
                    <div style="overflow-x: auto; max-height: 300px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Tài khoản</th>
                                    <th>Hành động</th>
                                    <th>Đối tượng</th>
                                    <th>Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody id="activityTableBody">
                                <tr>
                                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Đang tải danh sách hoạt động...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <h2 class="card-title" style="border-left-color: var(--danger);">Nhật Ký Lỗi & Sự Cố Hệ Thống (Diagnostics)</h2>
                    <div style="overflow-x: auto; max-height: 300px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>IP Client</th>
                                    <th>API / Endpoint</th>
                                    <th>Phân loại</th>
                                    <th>Mã</th>
                                    <th>Chi tiết lỗi</th>
                                </tr>
                            </thead>
                            <tbody id="errorTableBody">
                                <tr>
                                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Đang tải nhật ký lỗi...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal for showing full details -->
    <div id="detailModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 1000; justify-content: center; align-items: center; padding: 2rem;">
        <div class="card" style="width: 100%; max-width: 700px; margin-bottom: 0;">
            <h2 class="card-title" id="modalTitle">Chi tiết Lỗi</h2>
            <pre id="modalContent" style="white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.85rem; max-height: 400px; overflow-y: auto; color: #fca5a5; border: 1px solid var(--border);"></pre>
            <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                <button class="btn" style="background: var(--primary);" onclick="closeModal()">Đóng</button>
            </div>
        </div>
    </div>

    <script>
        let globalActivities = [];
        let globalErrors = [];

        function formatUptime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return `${h}h ${m}m ${s}s`;
        }

        async function toggleBlock(ip, isBlocked) {
            const endpoint = isBlocked ? '/dashboard/unblock' : '/dashboard/block';
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip })
                });
                const data = await res.json();
                updateStats();
            } catch (err) {
                console.error("Failed to toggle block status:", err);
            }
        }

        function showDetail(title, content) {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalContent').textContent = content;
            document.getElementById('detailModal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('detailModal').style.display = 'none';
        }

        function showActivityDetail(index) {
            const act = globalActivities[index];
            if (act) {
                showDetail(`Chi tiết hoạt động (${act.verb})`, JSON.stringify(act.details, null, 2));
            }
        }

        function showErrorDetail(index) {
            const err = globalErrors[index];
            if (err) {
                showDetail(`Chi tiết lỗi / Diagnostics (${err.status_code})`, `Thời gian: ${err.timestamp}\nIP: ${err.ip}\nAPI: ${err.method} ${err.path}\nNguồn: ${err.source}\nMã lỗi: ${err.status_code}\n\nChi tiết lỗi:\n${err.detail}`);
            }
        }

        async function updateStats() {
            try {
                const res = await fetch('/dashboard/stats');
                const data = await res.json();
                
                document.getElementById('uptime').textContent = formatUptime(data.uptime);
                document.getElementById('totalRequests').textContent = data.total_requests;
                document.getElementById('blockedCount').textContent = data.blocked_count;
                document.getElementById('lanIp').textContent = data.lan_ip;

                const lanLinks = document.getElementById('lanLinks');
                if (data.lan_ip && data.lan_ip !== '127.0.0.1') {
                    lanLinks.innerHTML = `
                        <a href="http://${data.lan_ip}:3000" target="_blank" class="link-item">
                            <span>Client 1 qua LAN</span>
                            <span class="link-url">http://${data.lan_ip}:3000</span>
                        </a>
                        <a href="http://${data.lan_ip}:3001" target="_blank" class="link-item">
                            <span>Client 2 qua LAN</span>
                            <span class="link-url">http://${data.lan_ip}:3001</span>
                        </a>
                    `;
                    document.getElementById('lanLinksSection').style.display = 'block';
                } else {
                    document.getElementById('lanLinksSection').style.display = 'none';
                }

                const tbody = document.getElementById('clientTableBody');
                if (data.active_clients.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Chưa có client nào kết nối tới API.</td></tr>`;
                } else {
                    let html = '';
                    data.active_clients.forEach(client => {
                        const statusBadge = client.is_blocked 
                            ? `<span class="badge-blocked">ĐÃ CHẶN</span>` 
                            : `<span class="badge-active">HOẠT ĐỘNG</span>`;
                        
                        const btnClass = client.is_blocked ? 'btn-unblock' : '';
                        const btnText = client.is_blocked ? 'Bỏ Chặn IP' : 'Chặn IP';

                        html += `
                            <tr>
                                <td style="font-weight: 600; color: #818cf8;">${client.ip}</td>
                                <td>
                                    <div style="font-weight: 600;">${client.browser}</div>
                                    <div class="client-ua" title="${client.user_agent}">${client.user_agent}</div>
                                </td>
                                <td style="text-align: center; font-weight: 600;">${client.request_count}</td>
                                <td style="font-family: monospace; color: #a78bfa;">${client.last_path}</td>
                                <td>
                                    <div>${client.last_seen_seconds_ago}s trước</div>
                                    <div style="margin-top: 0.25rem;">${statusBadge}</div>
                                </td>
                                <td>
                                    <button class="btn ${btnClass}" onclick="toggleBlock('${client.ip}', ${client.is_blocked})">
                                        ${btnText}
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }
            } catch (err) {
                console.error("Failed to fetch dashboard statistics:", err);
            }

            // Fetch Activities
            try {
                const res = await fetch('/dashboard/activities');
                const data = await res.json();
                globalActivities = data;

                const tbody = document.getElementById('activityTableBody');
                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Chưa có hoạt động nào được ghi nhận.</td></tr>`;
                } else {
                    let html = '';
                    data.forEach((act, idx) => {
                        const dt = new Date(act.created_at).toLocaleTimeString('vi-VN');
                        const detailsStr = JSON.stringify(act.details);
                        html += `
                            <tr>
                                <td style="color: var(--text-muted); font-size: 0.8rem;">${dt}</td>
                                <td style="font-weight: 600; color: #c084fc;">${act.actor_email}</td>
                                <td style="font-weight: 600; color: #818cf8;">${act.verb}</td>
                                <td style="color: var(--text-muted);">${act.target_type || '-'}</td>
                                <td class="error-detail-cell" onclick="showActivityDetail(${idx})" title="Click để xem chi tiết">${detailsStr}</td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }
            } catch (err) {
                console.error("Failed to fetch activities:", err);
            }

            // Fetch Error Diagnostics
            try {
                const res = await fetch('/dashboard/errors');
                const data = await res.json();
                globalErrors = data;

                const tbody = document.getElementById('errorTableBody');
                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Không có lỗi hệ thống nào được ghi nhận.</td></tr>`;
                } else {
                    let html = '';
                    data.forEach((err, idx) => {
                        const dt = new Date(err.timestamp).toLocaleTimeString('vi-VN');
                        const isSystem = err.status_code >= 500 || err.source === "Server Internal";
                        const badgeClass = isSystem ? 'badge-danger' : 'badge-warning';
                        html += `
                            <tr>
                                <td style="color: var(--text-muted); font-size: 0.8rem;">${dt}</td>
                                <td style="font-weight: 600; color: #fb7185;">${err.ip}</td>
                                <td style="font-family: monospace; color: #a78bfa;">${err.method} ${err.path}</td>
                                <td><span class="${badgeClass}">${err.source}</span></td>
                                <td style="font-weight: 700; color: ${isSystem ? 'var(--danger)' : 'var(--warning)'};">${err.status_code}</td>
                                <td class="error-detail-cell" onclick="showErrorDetail(${idx})" title="Click để xem chi tiết">${err.detail}</td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }
            } catch (err) {
                console.error("Failed to fetch error diagnostics:", err);
            }
        }

        updateStats();
        setInterval(updateStats, 2000);
    </script>
</body>
</html>"""
        return html_content

    @app.get("/dashboard/stats")
    def get_stats():
        now = time.time()
        # Clean up stale clients (inactive > 15 minutes) except blocked ones
        stale_ips = [ip for ip, data in active_clients.items() if now - data["last_seen"] > 900 and ip not in blocked_ips]
        for ip in stale_ips:
            active_clients.pop(ip, None)
            
        return {
            "uptime": int(now - server_start_time),
            "total_requests": total_api_requests,
            "blocked_count": len(blocked_ips),
            "lan_ip": get_lan_ip(),
            "active_clients": [
                {
                    "ip": data["ip"],
                    "browser": data["browser"],
                    "request_count": data["request_count"],
                    "last_seen_seconds_ago": int(now - data["last_seen"]),
                    "last_path": data["last_path"],
                    "user_agent": data["user_agent"],
                    "is_blocked": data["ip"] in blocked_ips
                }
                for data in active_clients.values()
            ] + [
                {
                    "ip": ip,
                    "browser": "N/A (Blocked)",
                    "request_count": 0,
                    "last_seen_seconds_ago": 0,
                    "last_path": "N/A",
                    "user_agent": "N/A",
                    "is_blocked": True
                }
                for ip in blocked_ips if ip not in active_clients
            ]
        }

    @app.post("/dashboard/block")
    def block_ip(data: dict):
        ip = data.get("ip")
        if ip:
            blocked_ips.add(ip)
            return {"status": "success", "message": f"IP {ip} blocked"}
        return {"status": "error", "message": "IP not provided"}

    @app.post("/dashboard/unblock")
    def unblock_ip(data: dict):
        ip = data.get("ip")
        if ip:
            blocked_ips.discard(ip)
            return {"status": "success", "message": f"IP {ip} unblocked"}
        return {"status": "error", "message": "IP not provided"}

    @app.get("/dashboard/activities")
    def get_activities():
        with session_factory() as session:
            from app.services.audit import list_activity_logs
            logs = list_activity_logs(session, limit=50)
            return [
                {
                    "id": str(log.id),
                    "created_at": log.created_at.isoformat(),
                    "actor_email": log.actor.email if log.actor else "Anonymous",
                    "verb": log.verb,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "details": log.details
                }
                for log in logs
            ]

    @app.get("/dashboard/errors")
    def get_errors():
        from app.core.tracker import error_logs
        return error_logs

    return app


app = create_app()
