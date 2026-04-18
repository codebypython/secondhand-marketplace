"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { SearchBox } from "@/components/search-box";

export function NavBar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

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

      <div className="nav-user">
        {loading ? (
          <div className="skeleton" style={{ width: 80, height: 28, borderRadius: "var(--radius)" }} />
        ) : user ? (
          <>
            <div className="user-avatar">{initials}</div>
            <span>{user.profile?.full_name ?? user.email}</span>
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
