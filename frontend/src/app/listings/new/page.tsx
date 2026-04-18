"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { LocationPicker } from "@/components/location-picker";
import { api } from "@/lib/api";
import type { Category, ItemCondition } from "@/lib/types";

const CONDITIONS: { value: ItemCondition; label: string; icon: string }[] = [
  { value: "NEW", label: "Mới", icon: "✨" },
  { value: "LIKE_NEW", label: "Như mới", icon: "🌟" },
  { value: "USED", label: "Đã dùng", icon: "📦" },
  { value: "DAMAGED", label: "Hỏng", icon: "🔧" },
];

export default function NewListingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("USED");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [hasWarranty, setHasWarranty] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api.listCategories().then((items) => { if (active) setCategories(items); });
    return () => { active = false; };
  }, []);

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
    setLoading(true);
    try {
      const listing = await api.createListing(token, {
        category_id: categoryId || null,
        title,
        description,
        price: Number(price),
        condition,
        brand: brand || null,
        has_warranty: hasWarranty,
        image_urls: imageUrls.map((u) => u.trim()).filter(Boolean),
        location_data: location ? { lat: location.lat, lng: location.lng, address: location.address } : null,
      });
      showToast("Đăng tin thành công!", "success");
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tin đăng.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <PageShell title="Đăng tin mới">
        <div className="panel">
          <p className="muted">Vui lòng đăng nhập để đăng tin.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Đăng tin mới" description="Điền thông tin sản phẩm để bắt đầu bán">
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
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`condition-option${condition === c.value ? " selected" : ""}`}
                onClick={() => setCondition(c.value)}
              >
                {c.icon} {c.label}
              </button>
            ))}
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
          <label>Hình ảnh (URL)</label>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
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

        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Đang đăng..." : "Đăng tin"}
        </button>
      </form>
    </PageShell>
  );
}
