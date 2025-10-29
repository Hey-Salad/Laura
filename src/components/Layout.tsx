"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Package, Cpu, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-zinc-950/95 backdrop-blur flex flex-col">
        <div className="px-6 pb-8 pt-10 space-y-3">
          <Link href="/dashboard" className="block">
            <Image
              src="/heysalad_white_logo.svg"
              alt="HeySalad"
              width={200}
              height={60}
              priority
              className="w-full"
            />
          </Link>
          <div className="pt-2">
            <p className="text-xs text-zinc-400">Laura Logistics Command Center</p>
          </div>
        </div>
        <nav className="space-y-1 px-4">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-brand-cherry text-white shadow-lg shadow-brand-cherry/20"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-4 pb-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all duration-200 w-full"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col bg-black px-8 py-10">{children}</main>
    </div>
  );
}
