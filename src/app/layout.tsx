import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "ELYSIA Akasaka | Shift Management",
  description: "ELYSIA Akasaka シフト自動編成システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>
        <footer className="py-6 text-center border-t" style={{ borderColor: "#f0ece3" }}>
          <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "#c9b87c" }}>
            ELYSIA Akasaka
          </span>
        </footer>
      </body>
    </html>
  );
}
