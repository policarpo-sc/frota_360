"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isConcluded } from "@/lib/alerts";
import type { AlertLevel, ProjectData, UserRole } from "@/lib/types";
import { ProjectGauge } from "@/components/dashboard/ProjectGauge";
import { TotalRingCard, type RingBadge } from "@/components/dashboard/TotalRingCard";
import { StatusHalfDonut } from "@/components/dashboard/StatusHalfDonut";
import { OndaDonut } from "@/components/dashboard/OndaDonut";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { DashboardFilterBar, type DashboardFilters } from "@/components/dashboard/DashboardFilterBar";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ProjectBanner } from "@/components/dashboard/ProjectBanner";

const EMPTY_FILTERS: DashboardFilters = { bloco: "", status: "", atende: "", responsavel: "", search: "" };

const STATUS_RING_COLORS = {
  "Concluída": "#0F9D58",
  "Em andamento": "#C08A00",
  Atrasado: "#C00000",
  "Não Iniciado": "#7C8698",
};

function categorize(status: string, alerta: AlertLevel): keyof typeof STATUS_RING_COLORS {
  if (alerta === "atrasado") return "Atrasado";
  if (isConcluded(status)) return "Concluída";
  if (status.trim().toLowerCase() === "em andamento") return "Em andamento";
  return "Não Iniciado";
}

function statusCountsToRing(counts: Record<string, number>): RingBadge[] {
  return [
    { label: "Concluída", value: counts["Concluída"] ?? 0, color: STATUS_RING_COLORS["Concluída"], position: "top-left" },
    { label: "Em andamento", value: counts["Em andamento"] ?? 0, color: STATUS_RING_COLORS["Em andamento"], position: "top-right" },
    { label: "Atrasadas", value: counts["Atrasado"] ?? 0, color: STATUS_RING_COLORS["Atrasado"], position: "bottom-left" },
    { label: "Não Iniciadas", value: counts["Não Iniciado"] ?? 0, color: STATUS_RING_COLORS["Não Iniciado"], position: "bottom-right" },
  ];
}

export function DashboardClient({ role }: { role: UserRole }) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/data")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar dados");
        return res.json();
      })
      .then((d: ProjectData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const acoes = useMemo(() => data?.acoes ?? [], [data]);

  const blocos = useMemo(() => Array.from(new Set(acoes.map((r) => r.bloco))).filter(Boolean).sort(), [acoes]);
  const statuses = useMemo(() => Array.from(new Set(acoes.map((r) => r.status))).filter(Boolean).sort(), [acoes]);
  const atendeOptions = useMemo(() => Array.from(new Set(acoes.map((r) => r.atende))).filter(Boolean).sort(), [acoes]);
  const responsaveis = useMemo(
    () => Array.from(new Set(acoes.map((r) => r.responsavel))).filter(Boolean).sort(),
    [acoes]
  );

  const filtered = useMemo(() => {
    return acoes.filter((r) => {
      if (filters.bloco && r.bloco !== filters.bloco) return false;
      if (filters.status) {
        if (filters.status === "__atrasado__") {
          if (r.alerta !== "atrasado") return false;
        } else if (r.status !== filters.status) {
          return false;
        }
      }
      if (filters.atende && r.atende !== filters.atende) return false;
      if (filters.responsavel && r.responsavel !== filters.responsavel) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const hay = `${r.requisito} ${r.acao} ${r.tarefa}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [acoes, filters]);

  const acoesStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const cat = categorize(r.status, r.alerta);
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [filtered]);

  const condicionantesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (data?.gente ?? []).forEach((r) => {
      const cat = categorize(r.status, r.alerta);
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    (data?.investimento ?? []).forEach((r) => {
      const cat = categorize(r.status, r.alerta);
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const ondaCounts = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const key = r.onda || "—";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }, [filtered]);

  const perOndaStatusCounts = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filtered.forEach((r) => {
      const key = r.onda || "—";
      const entry = map.get(key) ?? {};
      const cat = categorize(r.status, r.alerta);
      entry[cat] = (entry[cat] ?? 0) + 1;
      map.set(key, entry);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const totalAcoes = filtered.length;
  const totalCondicionantes = (data?.gente ?? []).length + (data?.investimento ?? []).length;

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!data) return <p className="p-6 text-red-600">Não foi possível carregar os dados.</p>;

  return (
    <main className="min-h-screen bg-[#EEF1F5] p-6">
      <ProjectBanner role={role} onRefreshed={loadData} />

      <DashboardFilterBar
        filters={filters}
        setFilters={setFilters}
        blocos={blocos}
        statuses={statuses}
        atendeOptions={atendeOptions}
        responsaveis={responsaveis}
        resultCount={totalAcoes}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Distância Percorrida">
          <ProjectGauge />
        </DashboardCard>
        <DashboardCard title="Total das Ações">
          <TotalRingCard total={totalAcoes} badges={statusCountsToRing(acoesStatusCounts)} />
        </DashboardCard>
        <DashboardCard title="Condicionantes Críticos">
          <TotalRingCard total={totalCondicionantes} badges={statusCountsToRing(condicionantesCounts)} />
        </DashboardCard>
        <DashboardCard title="Status Geral das Ações">
          <StatusHalfDonut counts={acoesStatusCounts} />
        </DashboardCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Ações por Ondas">
          <OndaDonut counts={ondaCounts} />
        </DashboardCard>
        {perOndaStatusCounts.map(([onda, counts]) => (
          <DashboardCard key={onda} title={`Status Ações ${onda}`}>
            <StatusHalfDonut counts={counts} showLegend={false} />
          </DashboardCard>
        ))}
      </div>

      <div className="mt-4">
        <InsightsPanel rows={filtered} />
      </div>

      <p className="mt-6 text-xs text-[#7C8698]">
        Última atualização: {new Date(data.updatedAt).toLocaleString("pt-BR")}
      </p>
    </main>
  );
}
