import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhishGuard AI — Gamified ML Security",
  description: "Real-time phishing detection intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
        {children}
      </body>
    </html>
  );
}