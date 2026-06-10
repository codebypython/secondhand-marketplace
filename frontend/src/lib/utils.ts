const UNITS: [string, number][] = [
  ["năm", 31536000],
  ["tháng", 2592000],
  ["tuần", 604800],
  ["ngày", 86400],
  ["giờ", 3600],
  ["phút", 60],
];

export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Vừa xong";
  for (const [label, value] of UNITS) {
    const count = Math.floor(seconds / value);
    if (count >= 1) return `${count} ${label} trước`;
  }
  return "Vừa xong";
}

export function formatPrice(price: string | number): string {
  return Number(price).toLocaleString("vi-VN");
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string | undefined | null, fallback = "?"): string {
  if (!name) return fallback;
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const conditionLabels: Record<string, string> = {
  NEW: "Mới",
  LIKE_NEW: "Như mới",
  USED: "Đã dùng",
  DAMAGED: "Hỏng",
};

export const statusLabels: Record<string, string> = {
  AVAILABLE: "Đang bán",
  RESERVED: "Đã giữ",
  SOLD: "Đã bán",
  HIDDEN: "Ẩn",
};

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000/api/v1";
  }
  
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    return "/api/v1";
  }

  try {
    const parsed = new URL(envUrl);
    const browserHostname = window.location.hostname;
    
    if (browserHostname && browserHostname !== "localhost" && browserHostname !== "127.0.0.1") {
      const isVirtualOrLocal = 
        parsed.hostname === "localhost" || 
        parsed.hostname === "127.0.0.1" || 
        parsed.hostname.startsWith("192.168.137.") ||
        parsed.hostname.startsWith("192.168.56.");
        
      if (isVirtualOrLocal) {
        parsed.hostname = browserHostname;
      }
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return envUrl;
  }
}

export function getWebSocketUrl(token: string): string {
  if (typeof window === "undefined") {
    return `ws://127.0.0.1:8000/api/v1/chat/ws/${token}`;
  }

  const browserHostname = window.location.hostname;
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  let wsProto = window.location.protocol === "https:" ? "wss" : "ws";
  let wsHost = `${browserHostname}:8000`;

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      wsProto = parsed.protocol === "https:" ? "wss" : "ws";
      let hostname = parsed.hostname;
      
      if (browserHostname && browserHostname !== "localhost" && browserHostname !== "127.0.0.1") {
        const isVirtualOrLocal = 
          hostname === "localhost" || 
          hostname === "127.0.0.1" || 
          hostname.startsWith("192.168.137.") ||
          hostname.startsWith("192.168.56.");
          
        if (isVirtualOrLocal) {
          hostname = browserHostname;
        }
      }
      wsHost = parsed.port ? `${hostname}:${parsed.port}` : hostname;
    } catch {}
  }

  return `${wsProto}://${wsHost}/api/v1/chat/ws/${token}`;
}

export function getMediaUrl(url: string | undefined | null): string {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = getApiBaseUrl();
  const host = apiBase.replace("/api/v1", "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${host}${path}`;
}
