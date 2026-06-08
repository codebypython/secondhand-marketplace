"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gem, Sparkles, Archive, Wrench, Plus, X } from "lucide-react";
import dynamic from "next/dynamic";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Category, ItemCondition, ListingStatus } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/location-picker").then((mod) => mod.LocationPicker), { ssr: false });

const CONDITIONS: { value: ItemCondition; label: string; Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }[] = [
  { value: "NEW", label: "Mới", Icon: Gem },
  { value: "LIKE_NEW", label: "Như mới", Icon: Sparkles },
  { value: "USED", label: "Đã dùng", Icon: Archive },
  { value: "DAMAGED", label: "Hỏng", Icon: Wrench },
];

export default function EditListingPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("USED");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [hasWarranty, setHasWarranty] = useState(false);
  const [status, setStatus] = useState<ListingStatus>("AVAILABLE");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.listCategories(),
      api.getListing(params.listingId)
    ]).then(([cats, item]) => {
      if (!active) return;
      setCategories(cats);
      
      // Check if user is owner
      if (user && item.owner_id !== user.id) {
        showToast("Bạn không phải chủ sở hữu tin đăng này!", "danger");
        router.push(`/listings/${params.listingId}`);
        return;
      }

      setTitle(item.title);
      setDescription(item.description || "");
      setPrice(Number(item.price).toString());
      setCondition(item.condition);
      setCategoryId(item.category_id || "");
      setBrand(item.brand || "");
      setHasWarranty(item.has_warranty || false);
      setStatus(item.status);
      setImageUrls(item.image_urls.length > 0 ? item.image_urls : [""]);
      if (item.location_data && typeof item.location_data === "object" && "lat" in item.location_data) {
        setLocation(item.location_data as any);
      }
      setLoading(false);
    }).catch((err) => {
      if (active) {
        showToast("Không thể tải thông tin tin đăng", "danger");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [params.listingId, user, router]);

  const addImageUrl = () => setImageUrls([...imageUrls, ""]);
  const removeImageUrl = (index: number) => setImageUrls(imageUrls.filter((_, i) => i !== index));
  const updateImageUrl = (index: number, value: string) => {
    const next = [...imageUrls];
    next[index] = value;
    setImageUrls(next);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Vui lòng đăng nhập trước.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.updateListing(token, params.listingId, {
        category_id: categoryId || null,
        title,
        description,
        price: Number(price),
        condition,
        brand: brand || null,
        has_warranty: hasWarranty,
        status,
        image_urls: imageUrls.map((u) => u.trim()).filter(Boolean),
        location_data: location ? { lat: location.lat, lng: location.lng, address: location.address } : null,
      });
      showToast("Cập nhật tin đăng thành công!", "success");
      router.push(`/listings/${params.listingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu tin đăng.");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <PageShell title="Chỉnh sửa tin đăng">
        <div className="panel">
          <p className="muted">Vui lòng đăng nhập để thực hiện.</p>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Đang tải...">
        <div className="panel">
          <p className="muted">Đang tải thông tin sản phẩm...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Chỉnh sửa tin đăng" description="Cập nhật thông tin chi tiết sản phẩm của bạn">
      <form className="panel" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field">
          <label htmlFor="title">Tiêu đề *</label>
          <input
            id="title"
            placeholder="Ví dụ: iPhone 14 Pro Max 256GB"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Mô tả</label>
          <textarea
            id="description"
            placeholder="Mô tả chi tiết tình trạng, lý do bán..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid two">
          <div className="field">
            <label htmlFor="price">Giá (VNĐ) *</label>
            <input
              id="price"
              type="number"
              min="0"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="category">Danh mục</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Tình trạng *</label>
          <div className="condition-grid">
            {CONDITIONS.map((c) => {
              const Icon = c.Icon;
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`condition-option${condition === c.value ? " selected" : ""}`}
                  onClick={() => setCondition(c.value)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid two">
          <div className="field">
            <label htmlFor="brand">Thương hiệu</label>
            <input
              id="brand"
              placeholder="Ví dụ: Apple, Samsung..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>
          <div className="field" style={{ display: "flex", alignItems: "center", paddingTop: 30 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: "normal" }}>
              <input 
                type="checkbox" 
                checked={hasWarranty} 
                onChange={(e) => setHasWarranty(e.target.checked)} 
                style={{ width: 18, height: 18 }}
              />
              Sản phẩm còn bảo hành
            </label>
          </div>
        </div>

        <div className="field">
          <label htmlFor="status">Trạng thái tin đăng *</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)} required>
            <option value="AVAILABLE">Đang bán (Available)</option>
            <option value="RESERVED">Đã nhận cọc/giữ hàng (Reserved)</option>
            <option value="SOLD">Đã bán thành công (Sold)</option>
            <option value="HIDDEN">Ẩn tin đăng tạm thời (Hidden)</option>
          </select>
        </div>

        <div className="field">
          <label>Hình ảnh (URL)</label>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                placeholder="https://example.com/photo.jpg"
                value={url}
                onChange={(e) => updateImageUrl(i, e.target.value)}
                style={{ flex: 1 }}
              />
              {imageUrls.length > 1 ? (
                <button type="button" className="button ghost sm" onClick={() => removeImageUrl(i)}>✕</button>
              ) : null}
            </div>
          ))}
          <button type="button" className="button ghost sm" onClick={addImageUrl} style={{ alignSelf: "flex-start" }}>
            ＋ Thêm ảnh
          </button>
        </div>

        <div className="field">
          <label>Vị trí giao dịch</label>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <div className="inline" style={{ marginTop: 10 }}>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <button className="button secondary" type="button" onClick={() => router.push(`/listings/${params.listingId}`)}>
            Hủy bỏ
          </button>
        </div>
      </form>
    </PageShell>
  );
}
