"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Package, Cpu, Camera, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/cameras", label: "Cameras", icon: Camera },
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Fixed height, no scrolling */}
      <aside className="w-64 shrink-0 bg-zinc-950/95 backdrop-blur flex flex-col h-screen">
        {/* Logo Section - Fixed at top with prominent spacing */}
        <div className="px-6 pt-8 pb-6 border-b border-zinc-800/50">
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
          <div className="pt-3">
            <p className="text-xs text-zinc-400 font-light">Laura Logistics Command Center</p>
          </div>
        </div>

        {/* Navigation - Scrollable if content overflows */}
        <nav className="flex-1 overflow-y-auto space-y-1 px-4 py-4">
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

        {/* Logout Button - Always visible at bottom */}
        <div className="px-4 py-4 border-t border-zinc-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all duration-200 w-full"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content - Fits viewport height */}
      <main className="flex-1 overflow-y-auto bg-black">
        <div className="h-full px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
