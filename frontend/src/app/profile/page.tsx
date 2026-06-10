"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, User, CheckCircle, AlertTriangle, TrendingUp, Trash2, Edit, Upload } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Listing, Wishlist } from "@/lib/types";
import { conditionLabels, formatPrice, getInitials, statusLabels, timeAgo } from "@/lib/utils";
import { ImageCropperModal } from "@/components/ui/image-cropper-modal";

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

  // Image cropping states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "banner">("avatar");
  const [croppingUpload, setCroppingUpload] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropperImageSrc(reader.result as string);
        setCropperMode(mode);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!token) return;
    setCroppingUpload(true);
    try {
      const file = new File(
        [blob],
        cropperMode === "avatar" ? "avatar_cropped.jpg" : "banner_cropped.jpg",
        { type: "image/jpeg" }
      );
      const res = await api.uploadMedia(token, file);
      if (cropperMode === "avatar") {
        setAvatarUrl(res.url);
      } else {
        setBannerUrl(res.url);
      }
      showToast("Tải và cắt ảnh thành công! Đừng quên nhấn 'Lưu thay đổi' phía dưới.", "success");
    } catch (err) {
      showToast("Lỗi khi tải ảnh lên hệ thống.", "danger");
    } finally {
      setCroppingUpload(false);
    }
  };
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

  // Wishlists state
  const [activeTab, setActiveTab] = useState<"listings" | "wishlists">("listings");
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [wishlistsLoading, setWishlistsLoading] = useState(true);
  const [newWishlistName, setNewWishlistName] = useState("");
  const [wishlistItemsDetails, setWishlistItemsDetails] = useState<Record<string, Listing>>({});

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api.getWishlists(token).then(async (data) => {
      if (!active) return;
      setWishlists(data);
      setWishlistsLoading(false);
      
      const itemDetails: Record<string, Listing> = {};
      for (const wl of data) {
        for (const item of wl.items) {
          try {
            const detail = await api.getListing(item.listing_id);
            itemDetails[item.listing_id] = detail;
          } catch (e) {
            console.error("Failed to load listing detail in wishlist", e);
          }
        }
      }
      if (active) {
        setWishlistItemsDetails(itemDetails);
      }
    });
    return () => { active = false; };
  }, [token]);

  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newWishlistName.trim()) return;
    try {
      const wl = await api.createWishlist(token, { name: newWishlistName });
      setWishlists([wl, ...wishlists]);
      setNewWishlistName("");
      showToast("Tạo danh sách ước thành công!", "success");
    } catch (err) {
      showToast("Lỗi khi tạo danh sách ước", "danger");
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string, listingId: string) => {
    if (!token) return;
    try {
      await api.removeWishlistItem(token, wishlistId, listingId);
      showToast("Đã xóa sản phẩm khỏi danh sách ước.", "success");
      setWishlists(prev => prev.map(wl => {
        if (wl.id === wishlistId) {
          return {
            ...wl,
            items: wl.items.filter((item: any) => item.listing_id !== listingId)
          };
        }
        return wl;
      }));
    } catch (err) {
      showToast("Lỗi khi xóa sản phẩm", "danger");
    }
  };


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
          <div className="profile-info-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
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
            <div className="profile-divider" />
            
            {/* Stat cards grid */}
            <div className="profile-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, width: "100%" }}>
              <div className="stat-card" style={{ padding: 14, background: "var(--bg-inset)", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div className="stat-card-label" style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Vai trò</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  {user.role === "ADMIN" ? (
                    <Crown size={28} style={{ color: "#f59e0b" }} />
                  ) : (
                    <User size={28} style={{ color: "var(--text)" }} />
                  )}
                </div>
                <div className="stat-card-value" style={{ fontSize: 13, fontWeight: 600 }}>{user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</div>
              </div>
              <div className="stat-card" style={{ padding: 14, background: "var(--bg-inset)", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div className="stat-card-label" style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Trạng thái</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  {user.status === "ACTIVE" ? (
                    <CheckCircle size={28} style={{ color: "#4ade80" }} />
                  ) : (
                    <AlertTriangle size={28} style={{ color: "#ef4444" }} />
                  )}
                </div>
                <div className="stat-card-value" style={{ fontSize: 13, fontWeight: 600, color: user.status === "ACTIVE" ? "#4ade80" : "#ef4444" }}>
                  {user.status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 14, background: "var(--bg-inset)", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div className="stat-card-label" style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Đang bán</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <TrendingUp size={28} style={{ color: "var(--accent)" }} />
                </div>
                <div className="stat-card-value" style={{ fontSize: 18, fontWeight: 700 }}>{activeListings.length}</div>
              </div>
              <div className="stat-card" style={{ padding: 14, background: "var(--bg-inset)", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div className="stat-card-label" style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Đã bán</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <CheckCircle size={28} style={{ color: "#4ade80" }} />
                </div>
                <div className="stat-card-value" style={{ fontSize: 18, fontWeight: 700 }}>{soldListings.length}</div>
              </div>
            </div>
            
            <div className="profile-divider" />
            <Link href="/profile/recycle-bin" className="button ghost" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Trash2 size={16} />
              Thùng rác (Tin đã xóa)
            </Link>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="profile-section-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Edit size={18} />
              <span>Chỉnh sửa hồ sơ</span>
            </div>
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
              <label>Ảnh đại diện (Avatar)</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt="Avatar Preview"
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
                  />
                )}
                <label className="button secondary sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Upload size={14} />
                  Chọn và cắt ảnh
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "avatar")}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
            
            <div className="field">
              <label>Ảnh bìa Shop (Banner)</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {bannerUrl && (
                  <img
                    src={bannerUrl}
                    alt="Banner Preview"
                    style={{ width: 80, height: 40, borderRadius: "var(--radius-sm)", objectFit: "cover", border: "1px solid var(--border)" }}
                  />
                )}
                <label className="button secondary sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Upload size={14} />
                  Chọn và cắt ảnh
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "banner")}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
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

        {/* Right: Tabs and content lists */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <button 
              type="button"
              onClick={() => setActiveTab("listings")}
              style={{ background: "none", border: "none", padding: "8px 16px", cursor: "pointer", fontWeight: activeTab === "listings" ? 600 : 400, color: activeTab === "listings" ? "var(--accent)" : "var(--text)", borderBottom: activeTab === "listings" ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -11 }}
            >
              Sản phẩm của tôi ({myListings.length})
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab("wishlists")}
              style={{ background: "none", border: "none", padding: "8px 16px", cursor: "pointer", fontWeight: activeTab === "wishlists" ? 600 : 400, color: activeTab === "wishlists" ? "var(--accent)" : "var(--text)", borderBottom: activeTab === "wishlists" ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -11 }}
            >
              Danh sách ước ({wishlists.length})
            </button>
          </div>

          {activeTab === "listings" ? (
            <>
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
            </>
          ) : (
            <>
              <div className="split">
                <h2 style={{ fontSize: 17, fontWeight: 600 }}>⭐ Danh sách ước (Wishlists)</h2>
              </div>

              {/* Form to create new wishlist */}
              <form onSubmit={handleCreateWishlist} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input 
                  placeholder="Tên danh sách mới... (VD: Đồ điện tử muốn mua)" 
                  value={newWishlistName}
                  onChange={e => setNewWishlistName(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)", fontSize: 13 }}
                  required
                />
                <button type="submit" className="button primary sm" style={{ padding: "8px 16px" }}>Tạo mới</button>
              </form>

              {wishlistsLoading ? (
                <div className="skeleton" style={{ height: 100 }} />
              ) : wishlists.length === 0 ? (
                <div className="empty-state panel">
                  <div className="empty-icon">📁</div>
                  <h3>Chưa có danh sách ước nào</h3>
                  <p>Hãy tạo danh sách mới ở trên hoặc lưu trực tiếp từ trang chi tiết sản phẩm.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {wishlists.map(wl => (
                    <div key={wl.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--border)", padding: 16 }}>
                      <div className="split">
                        <strong style={{ fontSize: 15 }}>📁 {wl.name}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>{wl.items.length} sản phẩm</span>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {wl.items.map((item: any) => {
                          const details = wishlistItemsDetails[item.listing_id];
                          return (
                            <div key={item.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-inset)" }}>
                              {details ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <Link href={`/listings/${details.id}`} style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                                    {details.title}
                                  </Link>
                                  <span className="price-sm">{formatPrice(details.price)} ₫</span>
                                </div>
                              ) : (
                                <span className="muted" style={{ fontSize: 13 }}>Đang tải...</span>
                              )}
                              <button 
                                type="button" 
                                className="button danger ghost sm" 
                                onClick={() => handleRemoveFromWishlist(wl.id, item.listing_id)}
                                style={{ padding: "4px 8px" }}
                              >
                                Xóa
                              </button>
                            </div>
                          );
                        })}
                        {wl.items.length === 0 && (
                          <div className="muted" style={{ fontSize: 12, padding: "8px 0", textAlign: "center" }}>
                            Không có sản phẩm nào trong danh sách này.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        mode={cropperMode}
        onClose={() => setCropperOpen(false)}
        onCrop={handleCropComplete}
      />
    </PageShell>
  );
}
