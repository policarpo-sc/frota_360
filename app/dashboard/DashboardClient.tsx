"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import type { ProjectData } from "@/lib/types";

export function DashboardClient() {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((d: ProjectData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!data) return <p className="p-6 text-red-600">Não foi possível carregar os dados.</p>;

  const totalAcoes = data.acoes.length;
  const concluidas = data.acoes.filter((a) => a.status.trim().toLowerCase() === "concluída").length;
  const atrasadas = data.acoes.filter((a) => a.alerta === "atrasado").length;
  const emAndamento = data.acoes.filter((a) => a.status.trim().toLowerCase() === "em andamento").length;
  const vagasAtrasadas = data.gente.filter((g) => g.alerta === "atrasado").length;
  const investimentosAtrasados = data.investimento.filter((i) => i.alerta === "atrasado").length;

  return (
    <main className="p-6">
      {data.errors.length > 0 && (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {data.errors.map((e) => (
            <p key={e.source}>
              Não foi possível atualizar "{e.source}": {e.message}. Última atualização exibida:{" "}
              {new Date(data.updatedAt).toLocaleString("pt-BR")}.
            </p>
          ))}
        </div>
      )}
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Visão geral do projeto</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Ações concluídas" value={`${concluidas}/${totalAcoes}`} />
        <KpiCard label="Ações em andamento" value={emAndamento} />
        <KpiCard label="Ações atrasadas" value={atrasadas} tone={atrasadas > 0 ? "danger" : "default"} />
        <KpiCard
          label="Vagas atrasadas"
          value={vagasAtrasadas}
          tone={vagasAtrasadas > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Investimentos atrasados"
          value={investimentosAtrasados}
          tone={investimentosAtrasados > 0 ? "warning" : "default"}
        />
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Última atualização: {new Date(data.updatedAt).toLocaleString("pt-BR")}
      </p>
    </main>
  );
}
