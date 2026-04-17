"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Block, Report } from "@/lib/types";

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
  const [blockedId, setBlockedId] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const reload = async () => {
    if (!token) return;
    setBlocks(await api.listBlocks(token));
    if (user?.role === "ADMIN") {
      setReports(await api.listReports(token));
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api.listBlocks(token).then(async (nextBlocks) => {
      if (!active) return;
      setBlocks(nextBlocks);
      if (user?.role === "ADMIN") {
        const nextReports = await api.listReports(token);
        if (active) setReports(nextReports);
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

  return (
    <PageShell title="Kiểm duyệt" description="Quản lý chặn người dùng và xem xét báo cáo vi phạm">
      <div className="grid two">
        {/* Left: Blocks */}
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
                    <span className="muted" style={{ fontSize: 11 }}>
                      {new Date(block.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Reports (admin only) */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Báo cáo vi phạm</h2>

          {user?.role !== "ADMIN" ? (
            <div className="alert alert-info">
              Bạn cần quyền quản trị viên để xem và xử lý báo cáo.
            </div>
          ) : loading ? (
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
      </div>
    </PageShell>
  );
}
