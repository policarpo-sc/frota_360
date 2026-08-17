"use client";

export interface DashboardFilters {
  bloco: string;
  status: string;
  atende: string;
  responsavel: string;
  search: string;
}

export function DashboardFilterBar({
  filters,
  setFilters,
  blocos,
  statuses,
  atendeOptions,
  responsaveis,
  resultCount,
}: {
  filters: DashboardFilters;
  setFilters: (f: DashboardFilters) => void;
  blocos: string[];
  statuses: string[];
  atendeOptions: string[];
  responsaveis: string[];
  resultCount: number;
}) {
  function update<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    setFilters({ ...filters, [key]: value });
  }

  function clear() {
    setFilters({ bloco: "", status: "", atende: "", responsavel: "", search: "" });
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bloco</label>
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={filters.bloco}
          onChange={(e) => update("bloco", e.target.value)}
        >
          <option value="">Todos</option>
          {blocos.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</label>
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="__atrasado__">Atrasado</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Atende?</label>
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={filters.atende}
          onChange={(e) => update("atende", e.target.value)}
        >
          <option value="">Todos</option>
          {atendeOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Responsável</label>
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={filters.responsavel}
          onChange={(e) => update("responsavel", e.target.value)}
        >
          <option value="">Todos</option>
          {responsaveis.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-1 min-w-[180px] flex-col">
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Buscar</label>
        <input
          type="text"
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          placeholder="requisito, ação..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>
      <button
        onClick={clear}
        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
      >
        Limpar filtros
      </button>
      <div className="ml-auto rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
        {resultCount} {resultCount === 1 ? "ação" : "ações"}
      </div>
    </div>
  );
}
