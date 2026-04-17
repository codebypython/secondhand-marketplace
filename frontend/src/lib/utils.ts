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
