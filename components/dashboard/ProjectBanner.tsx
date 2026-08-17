"use client";

import { useState } from "react";
import type { UserRole } from "@/lib/types";

const PROJECT_START = new Date(2026, 5, 1);
const PROJECT_END = new Date(2027, 0, 31);

export function ProjectBanner({ role, onRefreshed }: { role: UserRole; onRefreshed: () => void }) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/data/refresh", { method: "POST" });
      onRefreshed();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-[#C00000] px-4 py-2.5 text-white">
      <span className="rounded bg-white/15 px-2.5 py-1 text-xs font-semibold">
        Início Projeto {PROJECT_START.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
      </span>
      <span className="rounded bg-white/15 px-2.5 py-1 text-xs font-semibold">
        Fim Projeto {PROJECT_END.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
      </span>
      {role === "admin" && (
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
        >
          {refreshing ? "Atualizando..." : "↻ Atualizar"}
        </button>
      )}
      <span className="ml-auto text-sm font-bold uppercase tracking-wide">One Page — Frota 360</span>
    </div>
  );
}
