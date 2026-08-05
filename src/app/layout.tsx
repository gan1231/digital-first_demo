import type { Metadata } from "next";
import { org } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${org.siteName} — ${org.name}`,
    template: `%s — ${org.siteName}`,
  },
  description:
    "12 дугаар анги төгсөгчдөд олгох сургалтын төлбөрийн тэтгэлгийн онлайн бүртгэл.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
