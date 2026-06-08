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
