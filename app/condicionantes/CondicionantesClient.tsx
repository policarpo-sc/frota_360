"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { GenteRow, InvestimentoRow, ProjectData, UserRole } from "@/lib/types";

export function CondicionantesClient({ role }: { role: UserRole }) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [tab, setTab] = useState<"gente" | "investimento">("gente");

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((d: ProjectData) => setData(d));
  }, []);

  const genteColumns: Column<GenteRow>[] = [
    { key: "unidade", header: "Unidade" },
    { key: "nomeFuncao", header: "Função" },
    { key: "qtd", header: "Qtd" },
    { key: "responsavelSolicitacao", header: "Responsável" },
    { key: "prazoPrevisto", header: "Prazo" },
    { key: "status", header: "Status" },
    { key: "alerta", header: "Alerta", render: (row) => <StatusBadge alerta={row.alerta} /> },
    ...(role === "admin"
      ? ([{ key: "justificativa", header: "Justificativa" }] as Column<GenteRow>[])
      : []),
  ];

  const investimentoColumns: Column<InvestimentoRow>[] = [
    { key: "onda", header: "Onda" },
    { key: "local", header: "Local" },
    { key: "bloco", header: "Bloco" },
    { key: "investimento", header: "Investimento" },
    {
      key: "estimativaInvestimento",
      header: "Estimativa (R$)",
      render: (row) => row.estimativaInvestimento?.toLocaleString("pt-BR") ?? "-",
    },
    { key: "status", header: "Status" },
    { key: "alerta", header: "Alerta", render: (row) => <StatusBadge alerta={row.alerta} /> },
  ];

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Condicionantes</h1>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("gente")}
          className={`rounded-md px-3 py-1 text-sm ${tab === "gente" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Gente
        </button>
        <button
          onClick={() => setTab("investimento")}
          className={`rounded-md px-3 py-1 text-sm ${tab === "investimento" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Investimento
        </button>
      </div>
      {!data ? (
        <p className="text-slate-500">Carregando...</p>
      ) : tab === "gente" ? (
        <DataTable columns={genteColumns} rows={data.gente} />
      ) : (
        <DataTable columns={investimentoColumns} rows={data.investimento} />
      )}
    </main>
  );
}
