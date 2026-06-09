"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { showToast } from "@/components/toast";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if initialEmail query changes
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      showToast("Yêu cầu gửi thành công!", "success");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi yêu cầu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Quên mật khẩu?</h1>
        <p className="auth-subtitle">Nhập email để nhận liên kết đặt lại mật khẩu</p>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <p style={{ marginBottom: 20 }}>
              Liên kết khôi phục mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến (và thư rác/spam nếu không thấy) để tiến hành đặt lại mật khẩu.
            </p>
            <Link className="button primary" href="/login" style={{ display: "inline-block", width: "100%", textAlign: "center" }}>
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {initialEmail && (
              <div 
                className="alert alert-info" 
                style={{ 
                  marginBottom: 16, 
                  fontSize: 13, 
                  backgroundColor: "rgba(99, 102, 241, 0.08)", 
                  color: "var(--primary)", 
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius)"
                }}
              >
                💡 Đang thực hiện khôi phục mật khẩu cho tài khoản đã nhập: <strong>{initialEmail}</strong>
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Địa chỉ Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={!!initialEmail}
                style={initialEmail ? { backgroundColor: "var(--bg-inset)", cursor: "not-allowed", opacity: 0.8 } : {}}
              />
            </div>

            {error ? <div className="alert alert-danger">{error}</div> : null}

            <button className="button primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Đang xử lý..." : "Gửi yêu cầu đặt lại"}
            </button>

            <div className="auth-footer" style={{ marginTop: 20 }}>
              Nhớ mật khẩu?{" "}
              <Link href="/login">Đăng nhập</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card">Đang tải...</div></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
