"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { AcaoRow, ProjectData } from "@/lib/types";

export function AcoesClient() {
  const [rows, setRows] = useState<AcaoRow[]>([]);
  const [error, setError] = useState(false);
  const [ondaFilter, setOndaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");

  useEffect(() => {
    fetch("/api/data")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar dados");
        return res.json();
      })
      .then((d: ProjectData) => setRows(d.acoes))
      .catch(() => setError(true));
  }, []);

  const ondas = useMemo(() => Array.from(new Set(rows.map((r) => r.onda))).sort(), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = rows.filter(
    (r) =>
      (!ondaFilter || r.onda === ondaFilter) &&
      (!statusFilter || r.status === statusFilter) &&
      (!responsavelFilter ||
        r.responsavel.toLowerCase().includes(responsavelFilter.toLowerCase()))
  );

  const columns: Column<AcaoRow>[] = [
    { key: "onda", header: "Onda" },
    { key: "bloco", header: "Bloco" },
    { key: "tarefa", header: "Tarefa" },
    { key: "responsavel", header: "Responsável" },
    { key: "prazoPrevisto", header: "Prazo" },
    { key: "status", header: "Status" },
    { key: "alerta", header: "Alerta", render: (row) => <StatusBadge alerta={row.alerta} /> },
  ];

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Ações</h1>
      {error && <p className="mb-4 text-sm text-red-600">Não foi possível carregar os dados.</p>}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={ondaFilter}
          onChange={(e) => setOndaFilter(e.target.value)}
        >
          <option value="">Todas as ondas</option>
          {ondas.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          placeholder="Filtrar por responsável"
          value={responsavelFilter}
          onChange={(e) => setResponsavelFilter(e.target.value)}
        />
      </div>
      <DataTable columns={columns} rows={filtered} />
    </main>
  );
}
