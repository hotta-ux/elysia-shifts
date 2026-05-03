"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Nav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = () => setIsAdmin(sessionStorage.getItem("admin_auth") === "true");
    check();
    window.addEventListener("storage", check);
    const interval = setInterval(check, 1000);
    return () => { window.removeEventListener("storage", check); clearInterval(interval); };
  }, []);

  const linkClass = (href: string) => {
    const active = pathname === href;
    return `relative text-[13px] font-medium tracking-wide transition-all duration-200 py-1 ${
      active
        ? "text-gray-900"
        : "text-gray-400 hover:text-gray-600"
    }`;
  };

  const activeDot = (href: string) =>
    pathname === href ? (
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "#d4af37" }} />
    ) : null;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50" style={{ borderColor: "#ede6d6" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href={isAdmin ? "/staff" : "/submit"} className="flex items-center gap-3 group">
              <span
                className="text-base font-semibold tracking-[0.12em] transition-colors"
                style={{ color: "#b8960c" }}
              >
                ELYSIA
              </span>
              <span className="hidden sm:block w-px h-4" style={{ background: "#e8dcc8" }} />
              <span className="hidden sm:block text-[11px] tracking-[0.08em] text-gray-400 font-medium">
                Akasaka
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <Link href="/submit" className={linkClass("/submit")}>
                シフト提出
              </Link>
              {activeDot("/submit")}
            </div>
            {isAdmin && (
              <>
                <span className="w-px h-3.5" style={{ background: "#e8dcc8" }} />
                <div className="relative">
                  <Link href="/staff" className={linkClass("/staff")}>スタッフ</Link>
                  {activeDot("/staff")}
                </div>
                <div className="relative">
                  <Link href="/requests" className={linkClass("/requests")}>希望一覧</Link>
                  {activeDot("/requests")}
                </div>
                <div className="relative">
                  <Link href="/schedule" className={linkClass("/schedule")}>シフト表</Link>
                  {activeDot("/schedule")}
                </div>
              </>
            )}
            {!isAdmin && (
              <Link
                href="/staff"
                className="text-[10px] text-gray-300 hover:text-gray-400 tracking-wider transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
