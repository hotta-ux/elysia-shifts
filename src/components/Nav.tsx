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

  const linkClass = (href: string) =>
    `text-sm font-medium tracking-wide transition-colors ${
      pathname === href ? "text-gray-900" : "text-gray-400 hover:text-gray-700"
    }`;

  return (
    <nav className="bg-white border-b" style={{ borderColor: "#e8dcc8" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href={isAdmin ? "/" : "/submit"} className="flex items-center gap-2.5">
              <span className="text-lg tracking-wide font-semibold" style={{ color: "#b8960c" }}>
                赤坂店
              </span>
              <span className="text-sm text-gray-300 font-light">|</span>
              <span className="text-xs font-medium text-gray-500 tracking-wide">
                シフト管理
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/submit" className={linkClass("/submit")}>
              シフト提出
            </Link>
            {isAdmin && (
              <>
                <span className="text-gray-200">|</span>
                <Link href="/staff" className={linkClass("/staff")}>
                  スタッフ
                </Link>
                <Link href="/requests" className={linkClass("/requests")}>
                  希望一覧
                </Link>
                <Link href="/schedule" className={linkClass("/schedule")}>
                  シフト表
                </Link>
              </>
            )}
            {!isAdmin && (
              <Link
                href="/staff"
                className="text-[10px] text-gray-300 hover:text-gray-500 tracking-wide transition-colors"
              >
                管理者
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
