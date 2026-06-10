"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Block, Report, Deal, MapLegend } from "@/lib/types";
import { formatPrice, getApiBaseUrl } from "@/lib/utils";

const targetLabels: Record<string, string> = {
  USER: "Người dùng",
  LISTING: "Tin đăng",
  MESSAGE: "Tin nhắn",
};

const listingStatusLabels: Record<string, string> = {
  AVAILABLE: "Còn hàng",
  SOLD: "Đã bán",
  RESERVED: "Đã đặt trước",
  HIDDEN: "Đã ẩn"
};

const dealStatusLabels: Record<string, string> = {
  OPEN: "Đang giao dịch",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy"
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
  const [activeTab, setActiveTab] = useState<"blocks" | "reports" | "disputes" | "audit" | "analytics" | "legends">("blocks");
  const [blockedId, setBlockedId] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [disputes, setDisputes] = useState<Deal[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Legends editing state
  const [editingSymbolType, setEditingSymbolType] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");

  const startEdit = (leg: MapLegend) => {
    setEditingSymbolType(leg.symbol_type);
    setEditIcon(leg.icon);
    setEditName(leg.name);
    setEditDescription(leg.description);
    setEditColor(leg.color);
  };

  const handleSaveLegend = async (symbolType: string) => {
    if (!token) return;
    setActionLoading(`legend-${symbolType}`);
    try {
      await api.updateMapLegend(token, symbolType, {
        icon: editIcon,
        name: editName,
        description: editDescription,
        color: editColor
      });
      showToast("Cập nhật chú thích bản đồ thành công!", "success");
      setEditingSymbolType(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Thao tác thất bại.", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  const downloadCSV = async (endpoint: string, filename: string) => {
    if (!token) return;
    try {
      const resp = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Xuất CSV thành công!", "success");
    } catch (e) {
      console.error(e);
      showToast("Không thể tải file CSV.", "danger");
    }
  };

  const reload = async () => {
    if (!token) return;
    try {
      setBlocks(await api.listBlocks(token));
      if (user?.role === "ADMIN") {
        setReports(await api.listReports(token));
        setDisputes(await api.listDisputes(token));
        setAuditLogs(await api.listAuditLogs(token));
        setAnalyticsData(await api.getModerationAnalytics(token));
        setLegends(await api.listMapLegends());
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
          const nextAuditLogs = await api.listAuditLogs(token);
          const nextAnalytics = await api.getModerationAnalytics(token);
          const nextLegends = await api.listMapLegends();
          if (active) {
            setReports(nextReports);
            setDisputes(nextDisputes);
            setAuditLogs(nextAuditLogs);
            setAnalyticsData(nextAnalytics);
            setLegends(nextLegends);
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
          <button className={`tab${activeTab === "audit" ? " active" : ""}`} onClick={() => setActiveTab("audit")}>
            📋 Nhật ký ({auditLogs.length})
          </button>
          <button className={`tab${activeTab === "analytics" ? " active" : ""}`} onClick={() => setActiveTab("analytics")}>
            📊 Thống kê
          </button>
          <button className={`tab${activeTab === "legends" ? " active" : ""}`} onClick={() => setActiveTab("legends")}>
            🗺️ Bản đồ & Ký hiệu ({legends.length})
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Báo cáo vi phạm</h2>
            <button
              className="button secondary sm"
              onClick={() => downloadCSV("/moderation/reports/export", "reports_export.csv")}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              📥 Xuất CSV Báo Cáo
            </button>
          </div>

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Khiếu nại giao dịch</h2>
            <button
              className="button secondary sm"
              onClick={() => downloadCSV("/transactions/deals/export", "deals_export.csv")}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              📥 Xuất CSV Khiếu Nại
            </button>
          </div>

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

      {/* Audit Logs Panel - Admin Only */}
      {isAdmin && activeTab === "audit" && (
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Nhật ký hoạt động hệ thống</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button secondary sm"
                onClick={() => downloadCSV("/listings/export", "listings_export.csv")}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                📥 Xuất CSV Tin Đăng
              </button>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : auditLogs.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-icon">📋</div>
              <p>Chưa có nhật ký hoạt động nào.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {auditLogs.map((log) => (
                <div key={log.id} className="list-item" style={{ padding: 12, borderLeft: "4px solid var(--primary)" }}>
                  <div className="split" style={{ marginBottom: 4 }}>
                    <div className="inline" style={{ gap: 8 }}>
                      <span className="badge badge-info" style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                        {log.verb}
                      </span>
                      {log.actor_email ? (
                        <span style={{ fontSize: 13, fontWeight: "600" }}>{log.actor_email}</span>
                      ) : (
                        <span className="muted" style={{ fontSize: 13 }}>Hệ thống (AI/Auto)</span>
                      )}
                    </div>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {new Date(log.created_at).toLocaleDateString("vi-VN")} - {new Date(log.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Đối tượng: <code className="mono">{log.target_type}</code> (ID: <code className="mono">{log.target_id.slice(0, 8)}</code>)
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: "6px",
                      backgroundColor: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      overflowX: "auto",
                      color: "var(--text-muted)"
                    }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Panel - Admin Only */}
      {isAdmin && activeTab === "analytics" && (
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h2 style={{ margin: 0 }}>Báo cáo phân tích hệ thống</h2>
          
          {loading || !analyticsData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="grid four" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
              </div>
              <div className="grid two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 250 }} />)}
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid four" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div style={{
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.03) 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Tổng doanh thu giao dịch</span>
                  <strong style={{ fontSize: 24, color: "var(--primary)" }}>{formatPrice(analyticsData.deals.total_revenue)} ₫</strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Từ {analyticsData.deals.completed_count} đơn hoàn thành</span>
                </div>

                <div style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Tin đăng khả dụng</span>
                  <strong style={{ fontSize: 24, color: "var(--success)" }}>
                    {analyticsData.listings.by_status?.AVAILABLE ?? 0}
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Trên tổng số {analyticsData.listings.total} tin</span>
                </div>

                <div style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.03) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Người dùng hoạt động</span>
                  <strong style={{ fontSize: 24, color: "var(--warning)" }}>{analyticsData.users.active}</strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Trên tổng số {analyticsData.users.total} thành viên</span>
                </div>

                <div style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.03) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Người dùng bị cấm</span>
                  <strong style={{ fontSize: 24, color: "var(--danger)" }}>{analyticsData.users.banned}</strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Cần xem xét hành vi vi phạm</span>
                </div>
              </div>

              {/* Progress Bar Distributions */}
              <div className="grid two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 10 }}>
                {/* Categories Distribution */}
                <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>📁 Cơ cấu tin đăng theo Danh mục</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {Object.keys(analyticsData.listings.by_category).length === 0 ? (
                      <p className="muted" style={{ fontSize: 13 }}>Không có dữ liệu danh mục.</p>
                    ) : (
                      Object.entries(analyticsData.listings.by_category).map(([name, count]: [string, any]) => {
                        const percent = analyticsData.listings.total > 0 ? (count / analyticsData.listings.total) * 100 : 0;
                        return (
                          <div key={name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div className="split" style={{ fontSize: 13 }}>
                              <span>{name}</span>
                              <strong>{count} tin ({percent.toFixed(0)}%)</strong>
                            </div>
                            <div style={{ width: "100%", height: 8, background: "var(--bg-inset)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: `${percent}%`, height: "100%", background: "var(--primary)", borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Listings & Deals Status Distribution */}
                <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>📊 Trạng thái Tin Đăng & Giao Dịch</h3>
                  
                  {/* Listing Status */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Trạng thái Tin đăng:</span>
                    {Object.entries(analyticsData.listings.by_status).map(([status, count]: [string, any]) => {
                      const percent = analyticsData.listings.total > 0 ? (count / analyticsData.listings.total) * 100 : 0;
                      let color = "var(--primary)";
                      if (status === "AVAILABLE") color = "var(--success)";
                      if (status === "SOLD") color = "var(--danger)";
                      if (status === "RESERVED") color = "var(--warning)";
                      
                      return (
                        <div key={status} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div className="split" style={{ fontSize: 12 }}>
                            <span>{listingStatusLabels[status] ?? status}</span>
                            <strong>{count} tin ({percent.toFixed(0)}%)</strong>
                          </div>
                          <div style={{ width: "100%", height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="divider" style={{ margin: "10px 0" }} />

                  {/* Deals Status */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Trạng thái Giao dịch (Deals):</span>
                    {Object.keys(analyticsData.deals.by_status).length === 0 ? (
                      <p className="muted" style={{ fontSize: 12 }}>Không có đơn giao dịch.</p>
                    ) : (
                      Object.entries(analyticsData.deals.by_status).map(([status, count]: [string, any]) => {
                        const totalDeals = Object.values(analyticsData.deals.by_status).reduce((a: any, b: any) => a + b, 0) as number;
                        const percent = totalDeals > 0 ? (count / totalDeals) * 100 : 0;
                        let color = "var(--primary)";
                        if (status === "COMPLETED") color = "var(--success)";
                        if (status === "CANCELLED") color = "var(--danger)";
                        
                        return (
                          <div key={status} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div className="split" style={{ fontSize: 12 }}>
                              <span>{dealStatusLabels[status] ?? status}</span>
                              <strong>{count} đơn ({percent.toFixed(0)}%)</strong>
                            </div>
                            <div style={{ width: "100%", height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* Legends Panel - Admin Only */}
      {isAdmin && activeTab === "legends" && (
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Quản lý Chú thích & Ký hiệu Bản đồ</h2>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Điều chỉnh biểu tượng, tên, màu sắc hiển thị và mô tả chi tiết của từng loại ký hiệu bản đồ trên hệ thống.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {legends.map((leg) => {
              const isEditing = editingSymbolType === leg.symbol_type;

              return (
                <div 
                  key={leg.id} 
                  style={{ 
                    padding: 16, 
                    border: isEditing ? "1px solid var(--primary)" : "1px solid var(--border)", 
                    borderRadius: "var(--radius)",
                    background: isEditing ? "rgba(99, 102, 241, 0.03)" : "var(--bg-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    transition: "all 0.2s"
                  }}
                >
                  {isEditing ? (
                    /* EDITING MODE */
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="grid two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: 12, fontWeight: "600", marginBottom: 6, display: "block" }}>Biểu tượng (Icon Emoji)</label>
                          <input 
                            value={editIcon} 
                            onChange={(e) => setEditIcon(e.target.value)} 
                            style={{ padding: "8px 12px", width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                          />
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: 12, fontWeight: "600", marginBottom: 6, display: "block" }}>Mã màu (Hex Code)</label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input 
                              type="color" 
                              value={editColor} 
                              onChange={(e) => setEditColor(e.target.value)} 
                              style={{ width: 44, height: 38, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }}
                            />
                            <input 
                              value={editColor} 
                              onChange={(e) => setEditColor(e.target.value)} 
                              style={{ padding: "8px 12px", flex: 1, borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="field" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 12, fontWeight: "600", marginBottom: 6, display: "block" }}>Tên loại địa điểm</label>
                        <input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          style={{ padding: "8px 12px", width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                        />
                      </div>

                      <div className="field" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 12, fontWeight: "600", marginBottom: 6, display: "block" }}>Mô tả chi tiết chú thích</label>
                        <textarea 
                          value={editDescription} 
                          onChange={(e) => setEditDescription(e.target.value)} 
                          rows={2}
                          style={{ padding: "8px 12px", width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontFamily: "inherit", background: "var(--bg)", color: "var(--text)" }}
                        />
                      </div>

                      <div className="inline" style={{ marginTop: 4 }}>
                        <button 
                          className="button primary sm" 
                          type="button"
                          onClick={() => handleSaveLegend(leg.symbol_type)}
                          disabled={actionLoading === `legend-${leg.symbol_type}`}
                        >
                          Lưu lại
                        </button>
                        <button 
                          className="button ghost sm" 
                          type="button"
                          onClick={() => setEditingSymbolType(null)}
                          disabled={actionLoading === `legend-${leg.symbol_type}`}
                        >
                          Hủy bỏ
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* DISPLAY MODE */
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: "50%", 
                          background: leg.color, 
                          color: "white", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0
                        }}>
                          {leg.icon}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <strong style={{ fontSize: 15, color: "var(--text)" }}>
                            {leg.name} <code className="mono" style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: "normal", background: "var(--bg-inset)", padding: "2px 6px", borderRadius: 4 }}>{leg.symbol_type}</code>
                          </strong>
                          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            {leg.description}
                          </span>
                        </div>
                      </div>

                      <button 
                        className="button secondary sm" 
                        type="button"
                        onClick={() => startEdit(leg)}
                        style={{ flexShrink: 0 }}
                      >
                        ✏️ Sửa chú thích
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
