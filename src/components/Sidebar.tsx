"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, BookOpen, FileText, ArrowRightLeft, Settings } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "Chart of Accounts", href: "/accounts", icon: Wallet },
  { name: "Laba Rugi", href: "/reports/laba-rugi", icon: FileText },
  { name: "Neraca", href: "/reports/neraca", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen text-slate-300">
      <div className="flex items-center justify-center h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          FinanceApp
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400"
                    : "hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon
                  className={`flex-shrink-0 mr-3 h-5 w-5 transition-colors duration-200 ${
                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
