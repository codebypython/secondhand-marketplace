"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { conditionLabels, formatDate, formatPrice, getInitials, statusLabels, timeAgo } from "@/lib/utils";

export default function ProfilePage() {
  const { token, user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(() => user?.profile?.full_name ?? "");
  const [displayName, setDisplayName] = useState(() => user?.profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(() => user?.profile?.avatar_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(() => user?.profile?.banner_url ?? "");
  const [bio, setBio] = useState(() => user?.profile?.bio ?? "");
  const [phone, setPhone] = useState(() => user?.profile?.phone ?? "");
  const [address, setAddress] = useState(() => user?.profile?.address ?? "");
  const [dob, setDob] = useState(() => user?.profile?.dob ?? "");
  const [shopSlug, setShopSlug] = useState(() => user?.profile?.shop_slug ?? "");
  const [loading, setLoading] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void api.getUserListings(user.id).then((items) => {
      if (active) { setMyListings(items); setListingsLoading(false); }
    });
    return () => { active = false; };
  }, [user?.id]);

  if (!token || !user) {
    return (
      <PageShell title="Hồ sơ">
        <div className="panel"><p className="muted">Vui lòng đăng nhập để xem hồ sơ.</p></div>
      </PageShell>
    );
  }

  const initials = getInitials(user.profile?.full_name, user.email[0].toUpperCase());
  const activeListings = myListings.filter((l) => l.status === "AVAILABLE");
  const soldListings = myListings.filter((l) => l.status === "SOLD");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.updateProfile(token, { 
        full_name: fullName, 
        display_name: displayName || undefined,
        avatar_url: avatarUrl || undefined, 
        banner_url: bannerUrl || undefined,
        bio: bio || undefined,
        phone: phone || undefined,
        address: address || undefined,
        dob: dob || undefined,
        shop_slug: shopSlug || undefined
      });
      await refreshUser();
      showToast("Cập nhật hồ sơ thành công!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể cập nhật.", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Hồ sơ cá nhân" description="Quản lý thông tin tài khoản và xem sản phẩm của bạn">
      <div className="grid two">
        {/* Left: Account info + edit */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile card */}
          <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "var(--radius-full)",
              background: "var(--accent)", color: "var(--text-inverse)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 700,
            }}>{initials}</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user.profile?.full_name ?? user.email}</div>
              <div className="muted">{user.email}</div>
              {user.profile?.bio ? <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>{user.profile.bio}</p> : null}
            </div>
            <div className="divider" style={{ width: "100%" }} />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="split">
                <span className="muted" style={{ fontSize: 13 }}>Vai trò</span>
                <span className={`badge ${user.role === "ADMIN" ? "badge-accent" : ""}`}>{user.role === "ADMIN" ? "Quản trị" : "Người dùng"}</span>
              </div>
              <div className="split">
                <span className="muted" style={{ fontSize: 13 }}>Trạng thái</span>
                <span className={`badge ${user.status === "ACTIVE" ? "badge-success" : "badge-danger"}`}>{user.status === "ACTIVE" ? "Hoạt động" : "Bị cấm"}</span>
              </div>
              <div className="split">
                <span className="muted" style={{ fontSize: 13 }}>Ngày tạo</span>
                <span style={{ fontSize: 13 }}>{formatDate(user.created_at)}</span>
              </div>
              <div className="split">
                <span className="muted" style={{ fontSize: 13 }}>Đang bán</span>
                <span className="badge badge-success">{activeListings.length}</span>
              </div>
              <div className="split">
                <span className="muted" style={{ fontSize: 13 }}>Đã bán</span>
                <span className="badge badge-info">{soldListings.length}</span>
              </div>
            </div>
            
            <div className="divider" style={{ width: "100%", margin: "8px 0" }} />
            <Link href="/profile/recycle-bin" className="button ghost" style={{ width: "100%" }}>
              🗑️ Thùng rác (Tin đã xóa)
            </Link>
          </div>

          {/* Edit form */}
          <form className="panel" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>✏️ Chỉnh sửa hồ sơ</h2>
            <div className="field">
              <label htmlFor="fullName">Họ và tên</label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="displayName">Tên hiển thị (Shop/Nickname)</label>
              <input id="displayName" placeholder="Tên để người khác nhìn thấy..." value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="shopSlug">Đường dẫn trang Shop (tùy chọn)</label>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 13 }}>/shop/</span>
                <input id="shopSlug" placeholder="nguyenvana" value={shopSlug} onChange={(e) => setShopSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="phone">Số điện thoại</label>
              <input id="phone" type="tel" placeholder="0912345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="dob">Ngày sinh</label>
              <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="address">Địa chỉ</label>
              <input id="address" placeholder="123 Đường ABC, Quận X..." value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="avatarUrl">Avatar URL</label>
              <input id="avatarUrl" placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bannerUrl">Banner Shop URL</label>
              <input id="bannerUrl" placeholder="https://example.com/banner.jpg" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bio">Giới thiệu bản thân</label>
              <textarea id="bio" placeholder="Viết vài dòng về bạn..." value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        </div>

        {/* Right: My listings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="split">
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>📦 Sản phẩm của tôi</h2>
            <Link className="button ghost sm" href="/listings/new">＋ Đăng tin mới</Link>
          </div>

          {listingsLoading ? (
            <div className="grid" style={{ gap: 12 }}>{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}</div>
          ) : myListings.length === 0 ? (
            <div className="empty-state panel">
              <div className="empty-icon">📝</div>
              <h3>Chưa có tin đăng nào</h3>
              <p>Bắt đầu bán đồ bằng cách đăng tin mới.</p>
              <Link className="button primary" href="/listings/new" style={{ marginTop: 12 }}>＋ Đăng tin ngay</Link>
            </div>
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              {myListings.map((listing) => {
                const statusCls = listing.status === "AVAILABLE" ? "badge-success" : listing.status === "SOLD" ? "badge-danger" : "badge-warning";
                return (
                  <div className="list-item" key={listing.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="split">
                      <Link href={`/listings/${listing.id}`} style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                        {listing.title}
                      </Link>
                      <span className={`badge ${statusCls}`}>{statusLabels[listing.status] ?? listing.status}</span>
                    </div>
                    <div className="inline">
                      <span className="badge">{conditionLabels[listing.condition] ?? listing.condition}</span>
                      <span className="price-sm">{formatPrice(listing.price)} ₫</span>
                      <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{timeAgo(listing.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
