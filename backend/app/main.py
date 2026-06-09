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
        if path in ["/", "/dashboard/stats", "/dashboard/block", "/dashboard/unblock"] or path.startswith("/static"):
            return await call_next(request)
            
        client_ip = request.client.host if request.client else "unknown"
        if client_ip in blocked_ips:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": f"IP {client_ip} has been blocked by the Administrator."}
            )
            
        # Track active request
        track_request(request)
        return await call_next(request)

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
            max-width: 1200px;
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

        @media (max-width: 900px) {
            .grid { grid-template-columns: 1fr; }
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
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
        
        .client-ua {
            max-width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--text-muted);
            font-size: 0.8rem;
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

            <div class="card">
                <h2 class="card-title">Quản Lý Client Đang Kết Nối</h2>
                <div style="overflow-x: auto;">
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
        </div>
    </div>

    <script>
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
                    return;
                }

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
            } catch (err) {
                console.error("Failed to fetch dashboard statistics:", err);
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

    return app


app = create_app()
