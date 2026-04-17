"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabels = ["", "Yếu", "Trung bình", "Mạnh"];
  const strengthColors = ["", "var(--danger)", "var(--warning)", "var(--success)"];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.register({ email, password, full_name: fullName });
      setSession(result.access_token, result.user);
      showToast("Tạo tài khoản thành công!", "success");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Tạo tài khoản</h1>
        <p className="auth-subtitle">Bắt đầu mua bán ngay hôm nay</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Họ và tên</label>
            <input
              id="fullName"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {password.length > 0 ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 4 }}>
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    style={{
                      height: 3,
                      flex: 1,
                      borderRadius: 2,
                      background: passwordStrength >= level ? strengthColors[passwordStrength] : "var(--border)",
                      transition: "background 200ms",
                    }}
                  />
                ))}
                <span style={{ fontSize: 12, color: strengthColors[passwordStrength], marginLeft: 8, fontWeight: 500 }}>
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
            ) : null}
          </div>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <button className="button primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Đang tạo..." : "Đăng ký"}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản?{" "}
          <Link href="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
