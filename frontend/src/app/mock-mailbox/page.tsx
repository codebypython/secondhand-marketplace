"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, RefreshCw, ChevronRight, Clock } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { api } from "@/lib/api";
import { showToast } from "@/components/toast";

interface MockMail {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  created_at: string;
}

export default function MockMailboxPage() {
  const [emails, setEmails] = useState<MockMail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listMockEmails();
      setEmails(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast("Không thể tải danh sách thư giả lập", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmails();
  }, []);

  const selectedMail = emails.find((e) => e.id === selectedId) || null;

  return (
    <PageShell 
      title="Hộp thư Giả lập Hệ thống 📬" 
      description="Nơi quản lý và đọc toàn bộ Email do hệ thống tự động phát sinh cục bộ (Mô phỏng 100% tự chứa)"
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 15 }}>
        <button 
          className="button secondary sm" 
          onClick={() => void loadEmails(false)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={14} /> Làm mới hộp thư
        </button>
      </div>

      <div className="grid two" style={{ gridTemplateColumns: "360px 1fr", minHeight: 520, gap: 20 }}>
        {/* Left: Email list */}
        <div className="panel" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Mail size={16} /> Hòm thư hệ thống ({emails.length})
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 500 }}>
            {loading ? (
              <div style={{ padding: 16 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 75, marginBottom: 8, borderRadius: "var(--radius)" }} />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>📥</p>
                <p style={{ fontSize: 14 }}>Chưa phát sinh thư điện tử nào.</p>
              </div>
            ) : (
              emails.map((mail) => (
                <div
                  key={mail.id}
                  onClick={() => setSelectedId(mail.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    backgroundColor: mail.id === selectedId ? "rgba(99, 102, 241, 0.08)" : "transparent",
                    borderLeft: mail.id === selectedId ? "4px solid var(--primary)" : "4px solid transparent",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (mail.id !== selectedId) e.currentTarget.style.backgroundColor = "var(--bg-inset)";
                  }}
                  onMouseLeave={(e) => {
                    if (mail.id !== selectedId) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }} className="truncate">
                      {mail.recipient}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                      <Clock size={10} /> {new Date(mail.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 4 }} className="truncate">
                    {mail.subject}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }} className="truncate">
                    {mail.body.replace(/<[^>]*>/g, "").substring(0, 60)}...
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Email content reader */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          {selectedMail ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header Info */}
              <div style={{ padding: 20, borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>{selectedMail.subject}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Người gửi:</span>{" "}
                    <strong>Marketplace System &lt;no-reply@marketplace.local&gt;</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Người nhận:</span>{" "}
                    <strong>{selectedMail.recipient}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-tertiary)" }}>Thời gian:</span>{" "}
                    {new Date(selectedMail.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div 
                style={{ 
                  flex: 1, 
                  padding: 24, 
                  overflowY: "auto", 
                  backgroundColor: "white", 
                  color: "#334155",
                  minHeight: 280
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: selectedMail.body.replaceAll("http://localhost:3000", window.location.origin) 
                  }} 
                />
              </div>

              {/* Actions footer */}
              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-card)", display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", alignSelf: "center", marginRight: 15 }}>
                  * Thư điện tử giả lập được gửi cục bộ nội bộ CSDL.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 40, color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
              <h3>Xem nội dung thư</h3>
              <p>Chọn một thư từ danh sách bên trái để đọc nội dung và kiểm thử link reset.</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
