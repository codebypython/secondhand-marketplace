import {
  Sparkles,
  Star,
  Package,
  AlertCircle,
  MessageCircle,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
  HandshakeIcon,
  Crown,
  User,
  CheckCircle,
  AlertTriangle,
  Plus,
} from "lucide-react";

export const conditionIcons = {
  NEW: Sparkles,
  LIKE_NEW: Star,
  USED: Package,
  DAMAGED: AlertCircle,
};

export const conditionLabelsWithIcons = {
  NEW: { label: "Mới", icon: Sparkles, color: "#f9b17a" },
  LIKE_NEW: { label: "Như mới", icon: Star, color: "#f9b17a" },
  USED: { label: "Đã dùng", icon: Package, color: "#676f9d" },
  DAMAGED: { label: "Hỏng", icon: AlertCircle, color: "#ff6b6b" },
};

export const transactionIcons = {
  BUY: { icon: ShoppingCart, label: "Mua", color: "#0066cc" },
  SELL: { icon: TrendingUp, label: "Bán", color: "#28a745" },
  DEAL: { icon: HandshakeIcon, label: "Thỏa thuận", color: "#f9b17a" },
};

export const profileIcons = {
  ROLE: { icon: Crown, admin_icon: Crown, user_icon: User, color: "#f9b17a" },
  STATUS: { active: CheckCircle, inactive: AlertTriangle, color: "#28a745" },
  LISTINGS: { active: TrendingUp, sold: CheckCircle, color: "#f9b17a" },
};

export const inboxIcons = {
  MESSAGE: MessageCircle,
  CONVERSATION: MessageSquare,
  NEW: Plus,
};

export function renderIcon(
  Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>,
  size: number = 20,
  color?: string,
  className?: string
) {
  return <Icon size={size} className={className} style={color ? { color, stroke: color } : undefined} />;
}
