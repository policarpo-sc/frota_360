"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

const LINKS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/acoes", label: "Ações" },
  { href: "/condicionantes", label: "Condicionantes" },
  { href: "/arquivos", label: "Arquivos" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function NavBar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex gap-4">
        {LINKS.filter((l) => !l.adminOnly || role === "admin").map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium ${
              pathname === link.href ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700">
        Sair
      </button>
    </nav>
  );
}
