"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { showToast } from "@/components/toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification states
  const [verifying, setVerifying] = useState(true);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [tokenInvalid, setTokenInvalid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Thiếu token đặt lại mật khẩu. Vui lòng lấy liên kết khôi phục mới.");
      setTokenInvalid(true);
      setVerifying(false);
      return;
    }

    setVerifying(true);
    api.verifyResetToken(token)
      .then((data) => {
        setVerifiedEmail(data.email);
        setTokenInvalid(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Liên kết khôi phục không hợp lệ hoặc đã hết hạn.");
        setTokenInvalid(true);
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (tokenInvalid || !token) {
      setError("Không thể thực hiện. Vui lòng sử dụng liên kết khôi phục hợp lệ.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ token, new_password: password });
      showToast("Đặt lại mật khẩu thành công!", "success");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lại mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Đặt lại mật khẩu</h1>
        <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>

        {verifying ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p>Đang xác thực liên kết khôi phục...</p>
          </div>
        ) : success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <p style={{ marginBottom: 20 }}>
              Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.
            </p>
            <Link className="button primary" href="/login" style={{ display: "inline-block", width: "100%", textAlign: "center" }}>
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {tokenInvalid ? (
              <div 
                className="alert alert-danger" 
                style={{ 
                  marginBottom: 16, 
                  backgroundColor: "rgba(239, 68, 68, 0.08)", 
                  color: "#fca5a5", 
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                  padding: "12px",
                  borderRadius: "var(--radius)",
                  fontSize: 13
                }}
              >
                ⚠️ {error || "Liên kết này không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu quên mật khẩu."}
              </div>
            ) : verifiedEmail ? (
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
                💡 Khôi phục mật khẩu cho tài khoản: <strong>{verifiedEmail}</strong>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="password">Mật khẩu mới</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu từ 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={tokenInvalid}
                  style={tokenInvalid ? { backgroundColor: "var(--bg-inset)", cursor: "not-allowed", opacity: 0.6 } : {}}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={tokenInvalid}
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={tokenInvalid}
                style={tokenInvalid ? { backgroundColor: "var(--bg-inset)", cursor: "not-allowed", opacity: 0.6 } : {}}
              />
            </div>

            {!tokenInvalid && error ? <div className="alert alert-danger">{error}</div> : null}

            <button className="button primary" type="submit" disabled={loading || tokenInvalid} style={{ width: "100%" }}>
              {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
            </button>
            
            <div className="auth-footer" style={{ marginTop: 20 }}>
              <Link href="/login">Quay lại đăng nhập</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card">Đang tải...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
