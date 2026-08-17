import { StatusBadge } from "@/components/StatusBadge";
import { isConcluded } from "@/lib/alerts";
import type { AcaoRow } from "@/lib/types";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function InsightsPanel({ rows }: { rows: AcaoRow[] }) {
  const atrasadas = rows.filter((r) => r.alerta === "atrasado").length;
  const naoAtende = rows.filter((r) => r.atende.trim().toLowerCase() === "não").length;
  const semResponsavel = rows.filter((r) => !r.responsavel).length;
  const semPrazo = rows.filter((r) => !r.prazoPrevisto).length;

  const pendentesPorBloco = new Map<string, number>();
  rows.forEach((r) => {
    if (!isConcluded(r.status) && r.bloco) {
      pendentesPorBloco.set(r.bloco, (pendentesPorBloco.get(r.bloco) ?? 0) + 1);
    }
  });
  const topBloco = Array.from(pendentesPorBloco.entries()).sort((a, b) => b[1] - a[1])[0];

  const atencaoItems: { tag: "alta" | "media" | "info"; text: string }[] = [];
  if (atrasadas > 0) atencaoItems.push({ tag: "alta", text: `${atrasadas} ações estão com o prazo previsto vencido.` });
  if (naoAtende > 0)
    atencaoItems.push({ tag: "alta", text: `${naoAtende} requisitos avaliados como "Não atende".` });
  if (semResponsavel > 0)
    atencaoItems.push({ tag: "media", text: `${semResponsavel} ações ainda sem responsável definido.` });
  if (semPrazo > 0)
    atencaoItems.push({ tag: "media", text: `${semPrazo} ações sem prazo previsto cadastrado.` });
  if (topBloco)
    atencaoItems.push({
      tag: "info",
      text: `Bloco "${topBloco[0]}" concentra o maior volume de ações pendentes (${topBloco[1]}).`,
    });

  const proximos = rows
    .filter((r) => r.prazoPrevisto && !isConcluded(r.status))
    .sort((a, b) => (a.prazoPrevisto ?? "").localeCompare(b.prazoPrevisto ?? ""))
    .slice(0, 6);

  const tagStyle: Record<string, string> = {
    alta: "bg-red-50 text-red-700",
    media: "bg-amber-50 text-amber-700",
    info: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="rounded-t-lg bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Pontos de Atenção
        </div>
        <ul className="divide-y divide-slate-100">
          {atencaoItems.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">Nenhum ponto crítico identificado.</li>
          )}
          {atencaoItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 px-4 py-2 text-[12.8px]">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tagStyle[item.tag]}`}>
                {item.tag === "alta" ? "Alta" : item.tag === "media" ? "Média" : "Info"}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="rounded-t-lg bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Próximos Passos
        </div>
        <ul className="divide-y divide-slate-100">
          {proximos.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">Nenhuma ação com prazo definido.</li>
          )}
          {proximos.map((r, i) => (
            <li key={i} className="flex items-start gap-2 px-4 py-2 text-[12.8px]">
              <span className="shrink-0 text-slate-500">{fmtDate(r.prazoPrevisto)}</span>
              <span>
                <b>{r.bloco}</b> — {r.tarefa || r.acao}
                <span className="block text-[11.5px] text-slate-500">{r.responsavel || "Sem responsável"}</span>
              </span>
              <StatusBadge alerta={r.alerta} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
