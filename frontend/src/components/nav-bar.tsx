"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { SearchBox } from "@/components/search-box";
import { api } from "@/lib/api";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Custom Avatar and Messages states
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);

  useEffect(() => {
    if (!showAvatarDropdown) return;
    const handleClose = () => setShowAvatarDropdown(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [showAvatarDropdown]);

  useEffect(() => {
    if (!token) return;

    let timerId: NodeJS.Timeout;
    const fetchNotifications = async () => {
      try {
        const countData = await api.unreadCountNotifications(token);
        setUnreadCount(countData.count);

        const listData = await api.listNotifications(token);
        setNotifications(listData);

        const msgCountData = await api.unreadCountMessages(token);
        setUnreadMessagesCount(msgCountData.count);
      } catch (e) {
        console.error("Failed to fetch notifications/messages:", e);
      }
    };

    void fetchNotifications();

    const runPoll = () => {
      timerId = setTimeout(async () => {
        await fetchNotifications();
        runPoll();
      }, 15000); // Poll every 15s
    };

    runPoll();

    return () => {
      clearTimeout(timerId);
    };
  }, [token]);

  const handleNotificationClick = async (notif: any) => {
    setShowDropdown(false);
    if (!notif.is_read && token) {
      try {
        await api.readNotification(token, notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((list) =>
          list.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        console.error(e);
      }
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await api.readAllNotifications(token);
      setUnreadCount(0);
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/listings/new", label: "Create listing" },
    { href: "/dashboard/offers", label: "Transactions" },
    { 
      href: "/inbox", 
      label: unreadMessagesCount > 0 ? `Inbox (${unreadMessagesCount})` : "Inbox",
      badge: unreadMessagesCount > 0
    },
    ...(user?.role === "ADMIN" ? [{ href: "/moderation", label: "Moderation" }] : []),
    { href: "/profile", label: "Profile" },
  ];

  const initials = user?.profile?.full_name
    ? user.profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className={`nav-shell${open ? " nav-open" : ""}`}>
      <div className="nav-brand">
        <Link href="/">Chợ Đồ Cũ</Link>
      </div>

      <SearchBox />

      <button
        className="nav-toggle"
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        {open ? "✕" : "☰"}
      </button>

      <nav className="nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "nav-link active" : "nav-link"}
            onClick={() => setOpen(false)}
            style={{ position: "relative" }}
          >
            {link.label}
            {link.badge && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "var(--danger, #ff6b6b)",
                  position: "absolute",
                  top: 0,
                  right: -6,
                }}
              />
            )}
          </Link>
        ))}
      </nav>

      <div className="nav-user" style={{ display: "flex", alignItems: "center" }}>
        {loading ? (
          <div className="skeleton" style={{ width: 80, height: 28, borderRadius: "var(--radius)" }} />
        ) : user ? (
          <>
            {/* Notification Bell Dropdown */}
            <div className="nav-notification-container" style={{ position: "relative", marginRight: 15 }}>
              <button
                className="button ghost sm"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ padding: 6, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
                type="button"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span
                    className="badge badge-danger"
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      padding: "2px 6px",
                      fontSize: 10,
                      borderRadius: "99px",
                      backgroundColor: "var(--danger)",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div
                  className="glass-panel"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: 340,
                    maxHeight: 420,
                    overflowY: "auto",
                    zIndex: 1000,
                    marginTop: 10,
                    borderRadius: "var(--radius)",
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: "700", color: "var(--text)" }}>Thông báo</h4>
                    {unreadCount > 0 && (
                      <button
                        className="button link sm"
                        onClick={handleMarkAllRead}
                        style={{ fontSize: 12, padding: 0, color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600" }}
                        type="button"
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="divider" style={{ margin: "8px 0 12px 0", height: 1, backgroundColor: "var(--border)" }} />
                  {notifications.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                      Không có thông báo nào.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: 12,
                            borderRadius: "var(--radius-sm, 6px)",
                            backgroundColor: notif.is_read ? "transparent" : "rgba(249, 177, 122, 0.06)",
                            border: notif.is_read ? "1px solid rgba(103, 111, 157, 0.2)" : "1px solid rgba(249, 177, 122, 0.25)",
                            cursor: "pointer",
                            fontSize: 13,
                            marginBottom: 4
                          }}
                          className="notification-item"
                        >
                          <div style={{ fontWeight: notif.is_read ? "500" : "700", marginBottom: 6, color: "var(--text)", lineHeight: 1.35 }}>
                            {notif.title}
                          </div>
                          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 8, display: "block" }}>
                            {new Date(notif.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} - {new Date(notif.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAvatarDropdown(!showAvatarDropdown);
                }}
                className="user-avatar-btn"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div className="user-avatar" style={{ margin: 0 }}>{initials}</div>
                <span style={{ color: "var(--text)", fontWeight: 500, marginRight: 10 }}>{user.profile?.full_name ?? user.email}</span>
              </button>

              {showAvatarDropdown && (
                <div
                  className="glass-panel"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: 200,
                    zIndex: 1001,
                    marginTop: 8,
                    borderRadius: "var(--radius)",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: "8px 12px 12px", borderBottom: "1px solid var(--glass-border)", marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                      {user.profile?.full_name ?? user.email}
                    </div>
                    <div className="muted" style={{ fontSize: 11, wordBreak: "break-all", opacity: 0.7 }}>
                      {user.email}
                    </div>
                  </div>
                  
                  <Link
                    href="/profile"
                    className="dropdown-item"
                    onClick={() => setShowAvatarDropdown(false)}
                  >
                    👤 Hồ sơ cá nhân
                  </Link>
                  <Link
                    href="/dashboard/offers"
                    className="dropdown-item"
                    onClick={() => setShowAvatarDropdown(false)}
                  >
                    💼 Giao dịch của tôi
                  </Link>
                  <Link
                    href="/listings/new"
                    className="dropdown-item"
                    onClick={() => setShowAvatarDropdown(false)}
                  >
                    ＋ Đăng tin mới
                  </Link>
                  <Link
                    href="/profile/recycle-bin"
                    className="dropdown-item"
                    onClick={() => setShowAvatarDropdown(false)}
                  >
                    🗑️ Thùng rác (Tin đã xóa)
                  </Link>
                  
                  <div className="divider" style={{ margin: "4px 0", height: 1, backgroundColor: "var(--glass-border)" }} />
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowAvatarDropdown(false);
                      logout();
                    }}
                    className="dropdown-item"
                    style={{
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      width: "100%",
                      color: "var(--danger, #ff6b6b)",
                      cursor: "pointer",
                    }}
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link className="button ghost sm" href="/login">Sign in</Link>
            <Link className="button primary sm" href="/register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

