"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Block, Report, Deal } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const targetLabels: Record<string, string> = {
  USER: "Người dùng",
  LISTING: "Tin đăng",
  MESSAGE: "Tin nhắn",
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "PENDING" ? "badge-warning" :
    status === "RESOLVED" ? "badge-success" :
    status === "DISMISSED" ? "badge-danger" : "";
  const labels: Record<string, string> = { PENDING: "Chờ xử lý", RESOLVED: "Đã xử lý", DISMISSED: "Bỏ qua" };
  return <span className={`badge ${cls}`}>{labels[status] ?? status}</span>;
}

export default function ModerationPage() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"blocks" | "reports" | "disputes">("blocks");
  const [blockedId, setBlockedId] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [disputes, setDisputes] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const reload = async () => {
    if (!token) return;
    try {
      setBlocks(await api.listBlocks(token));
      if (user?.role === "ADMIN") {
        setReports(await api.listReports(token));
        setDisputes(await api.listDisputes(token));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api.listBlocks(token).then(async (nextBlocks) => {
      if (!active) return;
      setBlocks(nextBlocks);
      if (user?.role === "ADMIN") {
        try {
          const nextReports = await api.listReports(token);
          const nextDisputes = await api.listDisputes(token);
          if (active) {
            setReports(nextReports);
            setDisputes(nextDisputes);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [token, user?.role]);

  if (!token) {
    return (
      <PageShell title="Kiểm duyệt">
        <div className="panel"><p className="muted">Vui lòng đăng nhập.</p></div>
      </PageShell>
    );
  }

  const handleBlock = async () => {
    if (!blockedId.trim()) return;
    setActionLoading("block");
    try {
      await api.blockUser(token, blockedId);
      showToast("Đã chặn người dùng.", "success");
      setBlockedId("");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể chặn.", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (blockedIdToUnblock: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn bỏ chặn người dùng này?")) return;
    setActionLoading(blockedIdToUnblock);
    try {
      await api.unblockUser(token, blockedIdToUnblock);
      showToast("Đã bỏ chặn người dùng.", "success");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể bỏ chặn.", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReview = async (reportId: string, status: string) => {
    setActionLoading(reportId);
    try {
      await api.reviewReport(token, reportId, status);
      showToast(status === "RESOLVED" ? "Đã xử lý báo cáo." : "Đã bỏ qua báo cáo.", "success");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại.", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDispute = async (dealId: string, resolution: "COMPLETED" | "CANCELLED") => {
    if (!window.confirm(resolution === "COMPLETED" 
      ? "Bạn có chắc chắn muốn xác nhận giao dịch thành công và hoàn thành thỏa thuận này?" 
      : "Bạn có chắc chắn muốn hủy thỏa thuận này và trả tin đăng về trạng thái mở bán?")) return;
    setActionLoading(dealId);
    try {
      await api.resolveDispute(token, dealId, resolution);
      showToast(resolution === "COMPLETED" ? "Đã xử lý: Giao dịch thành công." : "Đã xử lý: Giao dịch bị hủy.", "success");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại.", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const isAdmin = user?.role === "ADMIN";

  return (
    <PageShell title="Kiểm duyệt" description="Quản lý chặn người dùng và xem xét báo cáo vi phạm, khiếu nại giao dịch">
      {isAdmin && (
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab${activeTab === "blocks" ? " active" : ""}`} onClick={() => setActiveTab("blocks")}>
            🛡️ Đã chặn ({blocks.length})
          </button>
          <button className={`tab${activeTab === "reports" ? " active" : ""}`} onClick={() => setActiveTab("reports")}>
            🚩 Báo cáo ({reports.length})
          </button>
          <button className={`tab${activeTab === "disputes" ? " active" : ""}`} onClick={() => setActiveTab("disputes")}>
            ⚖️ Khiếu nại ({disputes.length})
          </button>
        </div>
      )}

      {/* Blocks panel - available to everyone, or if selected */}
      {(!isAdmin || activeTab === "blocks") && (
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Chặn người dùng</h2>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Nhập User ID cần chặn"
              value={blockedId}
              onChange={(e) => setBlockedId(e.target.value)}
              style={{ flex: 1, borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "8px 12px", fontSize: 14 }}
            />
            <button
              className="button danger sm"
              type="button"
              onClick={handleBlock}
              disabled={actionLoading === "block"}
            >
              Chặn
            </button>
          </div>

          <div className="divider" />

          <h2 style={{ margin: 0, fontSize: 15 }}>Danh sách đã chặn</h2>

          {loading ? (
            <div className="skeleton" style={{ height: 60 }} />
          ) : blocks.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-icon">🛡️</div>
              <p>Bạn chưa chặn ai.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {blocks.map((block) => (
                <div className="list-item" key={block.id} style={{ padding: 12 }}>
                  <div className="split">
                    <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {block.blocked_id}
                    </div>
                    <div className="inline" style={{ gap: 12 }}>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {new Date(block.created_at).toLocaleDateString("vi-VN")}
                      </span>
                      <button
                        className="button danger sm"
                        onClick={() => handleUnblock(block.blocked_id)}
                        disabled={actionLoading === block.blocked_id}
                      >
                        Hủy chặn
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Panel - Admin Only */}
      {isAdmin && activeTab === "reports" && (
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Báo cáo vi phạm</h2>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-icon">✅</div>
              <h3>Không có báo cáo</h3>
              <p>Tất cả đã được xử lý.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reports.map((report) => (
                <div className="list-item" key={report.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="split">
                    <div className="inline">
                      <span className="badge badge-info">{targetLabels[report.target_type] ?? report.target_type}</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {new Date(report.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.5 }}>{report.reason}</p>
                  {report.status === "PENDING" ? (
                    <div className="inline">
                      <button
                        className="button primary sm"
                        type="button"
                        disabled={actionLoading === report.id}
                        onClick={() => handleReview(report.id, "RESOLVED")}
                      >
                        Xử lý
                      </button>
                      <button
                        className="button ghost sm"
                        type="button"
                        disabled={actionLoading === report.id}
                        onClick={() => handleReview(report.id, "DISMISSED")}
                      >
                        Bỏ qua
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disputes Panel - Admin Only */}
      {isAdmin && activeTab === "disputes" && (
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Khiếu nại giao dịch</h2>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
            </div>
          ) : disputes.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-icon">⚖️</div>
              <h3>Không có khiếu nại</h3>
              <p>Hiện không có thỏa thuận giao dịch nào bị khiếu nại.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {disputes.map((deal) => (
                <div className="list-item" key={deal.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="split">
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {deal.listing_title ? (
                        <Link href={`/listings/${deal.listing_id}`} style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>
                          {deal.listing_title}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: 15 }}>Thỏa thuận #{deal.id.slice(0, 8)}</span>
                      )}
                      <div className="inline" style={{ marginTop: 4 }}>
                        <span className="price-sm">{formatPrice(deal.agreed_price)} ₫</span>
                        <span className="badge badge-warning">Đang tranh chấp</span>
                      </div>
                    </div>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {new Date(deal.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  <div style={{ background: "var(--danger-dim)", padding: "10px 14px", borderRadius: "var(--radius)", fontSize: 13, color: "var(--danger)" }}>
                    <strong>Lý do khiếu nại của Người mua:</strong> {deal.dispute_reason}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>Người mua: <code className="mono">{deal.buyer_id.slice(0, 8)}</code></span>
                    <span>Người bán: <code className="mono">{deal.seller_id.slice(0, 8)}</code></span>
                  </div>

                  <div className="inline" style={{ marginTop: 4 }}>
                    <button
                      className="button primary sm"
                      disabled={actionLoading === deal.id}
                      onClick={() => handleResolveDispute(deal.id, "COMPLETED")}
                    >
                      Xác nhận giao dịch thành công
                    </button>
                    <button
                      className="button danger sm"
                      disabled={actionLoading === deal.id}
                      onClick={() => handleResolveDispute(deal.id, "CANCELLED")}
                    >
                      Hủy giao dịch & Trả lại tin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
