export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  sortKey,
  sortDir,
  onSort,
}: {
  columns: Column<T>[];
  rows: T[];
  sortKey?: keyof T;
  sortDir?: "asc" | "desc";
  onSort?: (key: keyof T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={String(col.key)}
                  onClick={onSort ? () => onSort(col.key) : undefined}
                  className={`px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap ${
                    onSort ? "cursor-pointer select-none hover:text-slate-900" : ""
                  }`}
                >
                  {col.header}
                  {isSorted && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-3 py-2 text-slate-700">
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
