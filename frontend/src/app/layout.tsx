import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { NavBar } from "@/components/nav-bar";
import { ToastContainer } from "@/components/toast";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chợ Đồ Cũ — Mua bán đồ cũ trực tuyến",
  description: "Nền tảng mua bán đồ cũ trực tuyến với hệ thống thương lượng, nhắn tin và giao dịch an toàn.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <div className="app-shell">
            <NavBar />
            <main className="app-main">{children}</main>
          </div>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
