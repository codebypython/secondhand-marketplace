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

  useEffect(() => {
    if (!token) return;

    let timerId: NodeJS.Timeout;
    const fetchNotifications = async () => {
      try {
        const countData = await api.unreadCountNotifications(token);
        setUnreadCount(countData.count);

        const listData = await api.listNotifications(token);
        setNotifications(listData);
      } catch (e) {
        console.error("Failed to fetch notifications:", e);
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
    { href: "/inbox", label: "Inbox" },
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
          >
            {link.label}
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
                  className="panel"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: 320,
                    maxHeight: 400,
                    overflowY: "auto",
                    zIndex: 1000,
                    marginTop: 8,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card-bg, #1e293b)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "12px",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: "600" }}>Thông báo</h4>
                    {unreadCount > 0 && (
                      <button
                        className="button link sm"
                        onClick={handleMarkAllRead}
                        style={{ fontSize: 12, padding: 0, color: "var(--primary)" }}
                        type="button"
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="divider" style={{ margin: "5px 0 10px 0", height: 1, backgroundColor: "var(--border)" }} />
                  {notifications.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                      Không có thông báo nào.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: 10,
                            borderRadius: "8px",
                            backgroundColor: notif.is_read ? "transparent" : "rgba(99, 102, 241, 0.08)",
                            border: notif.is_read ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(99, 102, 241, 0.2)",
                            cursor: "pointer",
                            fontSize: 13,
                            transition: "all 0.2s"
                          }}
                          className="notification-item"
                        >
                          <div style={{ fontWeight: notif.is_read ? "normal" : "600", marginBottom: 3, color: "var(--text)" }}>
                            {notif.title}
                          </div>
                          <p style={{ margin: 0, color: "var(--text-secondary, #94a3b8)", fontSize: 12, lineHeight: 1.4 }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: 10, color: "var(--text-muted, #64748b)", marginTop: 5, display: "block" }}>
                            {new Date(notif.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} - {new Date(notif.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="user-avatar">{initials}</div>
            <span style={{ marginRight: 10 }}>{user.profile?.full_name ?? user.email}</span>
            <button className="button ghost sm" onClick={logout} type="button">
              Sign out
            </button>
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

