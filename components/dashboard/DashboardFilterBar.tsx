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
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-[#28344a] p-3">
      <div className="flex flex-col">
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#AEB9CB]">Bloco</label>
        <select
          className="rounded-md border-0 px-2 py-1 text-sm text-[#1F2937]"
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
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#AEB9CB]">Status</label>
        <select
          className="rounded-md border-0 px-2 py-1 text-sm text-[#1F2937]"
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
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#AEB9CB]">Atende?</label>
        <select
          className="rounded-md border-0 px-2 py-1 text-sm text-[#1F2937]"
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
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#AEB9CB]">Responsável</label>
        <select
          className="rounded-md border-0 px-2 py-1 text-sm text-[#1F2937]"
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
        <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#AEB9CB]">Buscar</label>
        <input
          type="text"
          className="rounded-md border-0 px-2 py-1 text-sm text-[#1F2937]"
          placeholder="requisito, ação..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>
      <button
        onClick={clear}
        className="rounded-md border border-[#55637d] px-3 py-1 text-sm text-white hover:bg-[#3a4a68]"
      >
        Limpar filtros
      </button>
      <div className="ml-auto rounded-md bg-[#0E1622] px-3 py-1.5 text-sm font-bold text-[#F5A623]">
        {resultCount} {resultCount === 1 ? "ação" : "ações"}
      </div>
    </div>
  );
}
