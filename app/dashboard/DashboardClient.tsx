"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { isConcluded } from "@/lib/alerts";
import type { AcaoRow, ProjectData } from "@/lib/types";
import { ProjectGauge } from "@/components/dashboard/ProjectGauge";
import { StatusDonut } from "@/components/dashboard/StatusDonut";
import { BlocoStackedBar, type BlocoCounts } from "@/components/dashboard/BlocoStackedBar";
import { MonthBarChart } from "@/components/dashboard/MonthBarChart";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { DashboardFilterBar, type DashboardFilters } from "@/components/dashboard/DashboardFilterBar";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

const EMPTY_FILTERS: DashboardFilters = { bloco: "", status: "", atende: "", responsavel: "", search: "" };

function effectiveStatus(r: AcaoRow): string {
  return r.alerta === "atrasado" ? "Atrasado" : r.status;
}

function monthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

export function DashboardClient() {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar dados");
        return res.json();
      })
      .then((d: ProjectData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const acoes = data?.acoes ?? [];

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
        } else if (effectiveStatus(r) !== filters.status) {
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

  const totalAcoes = filtered.length;
  const concluidas = filtered.filter((a) => isConcluded(a.status)).length;
  const atrasadas = filtered.filter((a) => a.alerta === "atrasado").length;
  const emAndamento = filtered.filter(
    (a) => a.status.trim().toLowerCase() === "em andamento" && a.alerta !== "atrasado"
  ).length;
  const naoIniciadas = filtered.filter(
    (a) => a.status.trim().toLowerCase() === "não iniciado" && a.alerta !== "atrasado"
  ).length;

  const vagasAtrasadas = (data?.gente ?? []).filter((g) => g.alerta === "atrasado").length;
  const investimentosAtrasados = (data?.investimento ?? []).filter((i) => i.alerta === "atrasado").length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const s = effectiveStatus(r);
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [filtered]);

  const blocoCounts: BlocoCounts[] = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filtered.forEach((r) => {
      const key = r.bloco || "—";
      const entry = map.get(key) ?? {};
      const s = effectiveStatus(r);
      entry[s] = (entry[s] ?? 0) + 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bloco, counts]) => ({ bloco, counts }));
  }, [filtered]);

  const monthCounts = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      if (!r.prazoPrevisto) return;
      const key = r.prazoPrevisto.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => ({ label: monthLabel(`${key}-01`), count }));
  }, [filtered]);

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!data) return <p className="p-6 text-red-600">Não foi possível carregar os dados.</p>;

  return (
    <main className="min-h-screen bg-[#EEF1F5] p-6">
      {data.errors.length > 0 && (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {data.errors.map((e) => (
            <p key={e.source}>
              Não foi possível atualizar &ldquo;{e.source}&rdquo;: {e.message}. Última atualização exibida:{" "}
              {new Date(data.updatedAt).toLocaleString("pt-BR")}.
            </p>
          ))}
        </div>
      )}

      <h1 className="mb-4 text-lg font-bold uppercase tracking-wide text-[#1F2937]">Visão geral do projeto</h1>

      <DashboardFilterBar
        filters={filters}
        setFilters={setFilters}
        blocos={blocos}
        statuses={statuses}
        atendeOptions={atendeOptions}
        responsaveis={responsaveis}
        resultCount={totalAcoes}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Total de ações" value={totalAcoes} tone="default" />
        <KpiCard label="Concluídas" value={concluidas} tone="success" />
        <KpiCard label="Em andamento" value={emAndamento} tone="warning" />
        <KpiCard label="Não iniciadas" value={naoIniciadas} tone="muted" />
        <KpiCard label="Atrasadas" value={atrasadas} tone="danger" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title="Tempo de Projeto Decorrido">
          <ProjectGauge />
        </DashboardCard>
        <DashboardCard title="Progresso Geral">
          <StatusDonut counts={statusCounts} />
        </DashboardCard>
        <DashboardCard title="Progresso de Ações por Bloco">
          <BlocoStackedBar data={blocoCounts} />
        </DashboardCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard title="Ações por Mês (Prazo Previsto)">
          <MonthBarChart counts={monthCounts} />
        </DashboardCard>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard label="Vagas atrasadas" value={vagasAtrasadas} tone={vagasAtrasadas > 0 ? "warning" : "muted"} />
          <KpiCard
            label="Investimentos atrasados"
            value={investimentosAtrasados}
            tone={investimentosAtrasados > 0 ? "warning" : "muted"}
          />
        </div>
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
