import time
from fastapi import Request

# In-memory stores for tracking connections
active_clients = {}
blocked_ips = set()
server_start_time = time.time()
total_api_requests = 0

def track_request(request: Request) -> bool:
    global total_api_requests
    client_ip = request.client.host if request.client else "unknown"
    
    # If client is blocked, refuse request
    if client_ip in blocked_ips:
        return False
        
    total_api_requests += 1
    user_agent = request.headers.get("user-agent", "Unknown")
    path = request.url.path
    
    # Process user agent to make it human-readable in dashboard
    browser = "Unknown Device"
    if "Mobi" in user_agent:
        browser = "Mobile Device"
    if "Chrome" in user_agent:
        browser = "Chrome Browser"
    elif "Safari" in user_agent:
        browser = "Safari Browser"
    elif "Firefox" in user_agent:
        browser = "Firefox Browser"
    elif "Edge" in user_agent:
        browser = "Edge Browser"
    
    # Update active clients registry
    if client_ip not in active_clients:
        active_clients[client_ip] = {
            "ip": client_ip,
            "first_seen": time.time(),
            "last_seen": time.time(),
            "request_count": 1,
            "user_agent": user_agent[:150],  # Truncate long user-agents
            "browser": browser,
            "last_path": path
        }
    else:
        active_clients[client_ip]["last_seen"] = time.time()
        active_clients[client_ip]["request_count"] += 1
        active_clients[client_ip]["last_path"] = path
        active_clients[client_ip]["browser"] = browser
        
    return True

# RAM Buffer for recent errors (Diagnostics)
error_logs = []

def log_system_error(ip: str, method: str, path: str, status_code: int, detail: str, source: str):
    from datetime import datetime, UTC
    log_entry = {
        "timestamp": datetime.now(UTC).isoformat(),
        "ip": ip,
        "method": method,
        "path": path,
        "status_code": status_code,
        "detail": str(detail),
        "source": source
    }
    error_logs.insert(0, log_entry)
    if len(error_logs) > 50:
        error_logs.pop()

