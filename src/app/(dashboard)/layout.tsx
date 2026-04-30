"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Upload,
  ClipboardCheck,
  Brain,
  LogOut,
  Database,
  FileText,
  Activity,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/database", label: "Database", icon: Database },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/train", label: "Train", icon: Brain },
  { href: "/manage", label: "Manage", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border bg-surface">
        <div className="flex h-16 items-center px-6">
          <Logo size="md" showSubtitle />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-frankly-green-light text-frankly-green"
                    : "text-frankly-gray hover:bg-frankly-gray-light hover:text-frankly-dark"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="text-xs text-frankly-gray truncate mb-2">
            {userEmail ?? "Loading..."}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-frankly-gray hover:bg-frankly-gray-light hover:text-frankly-dark transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-8">
          <h2 className="text-lg font-semibold text-frankly-dark">
            Lydia Admin Portal
          </h2>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-sm text-frankly-gray">{userEmail}</span>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-frankly-gray-light p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
