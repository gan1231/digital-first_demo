import type { Metadata } from "next";
import { fund, org } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${fund.name} — ${org.name}`,
    template: `%s — ${fund.name}`,
  },
  description:
    "Сургалтын төлбөрийн тэтгэлгийн онлайн бүртгэл: 12 дугаар анги төгсөгч болон 2, 3 дугаар курсийн оюутнуудад.",
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
