import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "赤坂店 シフト管理システム",
  description: "アルバイトシフト自動編成システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: "#fafaf8" }}>
        <Nav />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-gray-400 tracking-wide">
          ELYSIA Akasaka Shift Management
        </footer>
      </body>
    </html>
  );
}
