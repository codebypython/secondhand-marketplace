"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gem, Sparkles, Archive, Wrench } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { LocationPicker } from "@/components/location-picker";
import { api } from "@/lib/api";
import type { Category, ItemCondition } from "@/lib/types";

const CONDITIONS: { value: ItemCondition; label: string; Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }[] = [
  { value: "NEW", label: "Mới", Icon: Gem },
  { value: "LIKE_NEW", label: "Như mới", Icon: Sparkles },
  { value: "USED", label: "Đã dùng", Icon: Archive },
  { value: "DAMAGED", label: "Hỏng", Icon: Wrench },
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
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string; symbol_type?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI states
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleAiCheck = async () => {
    const firstUrl = imageUrls[0]?.trim();
    if (!firstUrl) {
      showToast("Vui lòng nhập URL hình ảnh trước.", "danger");
      return;
    }
    if (!token) return;
    setAiChecking(true);
    setAiResult(null);
    try {
      const result = await api.classifyListingImage(token, firstUrl);
      setAiResult(result);
      if (result.is_prohibited) {
        showToast(`Cảnh báo: Ảnh có chứa sản phẩm vi phạm chính sách (${result.prohibited_reason})`, "danger");
      } else {
        showToast("Ảnh an toàn! Đã phân tích thành công.", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Không thể kết nối dịch vụ phân tích AI.", "danger");
    } finally {
      setAiChecking(false);
    }
  };

  const applyAiCategory = () => {
    if (!aiResult || !aiResult.category_slug) return;
    const cat = categories.find((c) => c.slug === aiResult.category_slug || c.name === aiResult.category_name);
    if (cat) {
      setCategoryId(cat.id);
      showToast(`Đã áp dụng danh mục: ${cat.name}`, "success");
    } else {
      showToast("Không tìm thấy danh mục tương ứng.", "danger");
    }
  };


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
        video_url: videoUrl || null,
        location_data: location ? { lat: location.lat, lng: location.lng, address: location.address, symbol_type: location.symbol_type || "STANDARD" } : null,
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
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" className="button ghost sm" onClick={addImageUrl}>
              ＋ Thêm ảnh
            </button>
            <button
              type="button"
              className="button secondary sm"
              onClick={handleAiCheck}
              disabled={aiChecking || !imageUrls[0]?.trim()}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Sparkles size={16} />
              {aiChecking ? "Đang phân tích..." : "Phân tích ảnh bằng AI"}
            </button>
          </div>

          {aiResult && (
            <div
              className="panel"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: "8px",
                border: aiResult.is_prohibited ? "1px solid var(--danger)" : "1px solid rgba(99, 102, 241, 0.2)",
                backgroundColor: aiResult.is_prohibited ? "rgba(239, 68, 68, 0.05)" : "rgba(99, 102, 241, 0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Sparkles size={16} style={{ color: aiResult.is_prohibited ? "var(--danger)" : "var(--primary)" }} />
                <strong style={{ fontSize: 13, color: aiResult.is_prohibited ? "var(--danger)" : "var(--text)" }}>
                  Kết quả phân tích AI
                </strong>
                {aiResult.mock && (
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--border)", color: "var(--text-muted)" }}>
                    Mô phỏng
                  </span>
                )}
              </div>
              {aiResult.is_prohibited ? (
                <div style={{ fontSize: 12, color: "var(--danger)" }}>
                  <strong>CẢNH BÁO VI PHẠM:</strong> {aiResult.prohibited_reason}
                  <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                    Lưu ý: Tin đăng của bạn sẽ tự động bị ẩn sau khi tạo nếu bạn tiếp tục sử dụng ảnh này.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Gợi ý danh mục: <strong>{aiResult.category_name}</strong> ({(aiResult.confidence * 100).toFixed(0)}% tin cậy)
                  </div>
                  {aiResult.category_slug && (
                    <button
                      type="button"
                      className="button primary sm"
                      onClick={applyAiCategory}
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                      Áp dụng danh mục
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <label>Video mô tả sản phẩm (Tùy chọn)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              placeholder="Chọn hoặc nhập URL video..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <label className="button secondary" style={{ cursor: uploadingVideo ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="file"
                accept="video/*"
                onChange={async (e) => {
                  if (!e.target.files || e.target.files.length === 0) return;
                  setUploadingVideo(true);
                  try {
                    const res = await api.uploadMedia(token, e.target.files[0]);
                    setVideoUrl(res.url);
                    showToast("Tải lên video thành công!", "success");
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Tải lên video thất bại.", "danger");
                  } finally {
                    setUploadingVideo(false);
                  }
                }}
                disabled={uploadingVideo}
                style={{ display: "none" }}
              />
              {uploadingVideo ? "Đang tải..." : "📁 Tải lên Video"}
            </label>
          </div>
          {videoUrl && (
            <div style={{ marginTop: 10 }}>
              <video src={videoUrl} controls style={{ maxWidth: "100%", height: 180, borderRadius: 8, border: "1px solid var(--border)" }} />
            </div>
          )}
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
