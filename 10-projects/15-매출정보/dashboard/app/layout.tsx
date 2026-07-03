import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "매출 보고 대시보드",
  description: "연도별 매출 현황 경영진 보고용 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
