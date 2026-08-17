import type { AlertLevel } from "@/lib/types";

const STYLES: Record<AlertLevel, string> = {
  atrasado: "bg-red-100 text-red-800",
  atencao: "bg-yellow-100 text-yellow-800",
  normal: "bg-slate-100 text-slate-700",
};

const LABELS: Record<AlertLevel, string> = {
  atrasado: "Atrasado",
  atencao: "Atenção",
  normal: "No prazo",
};

export function StatusBadge({ alerta }: { alerta: AlertLevel }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[alerta]}`}>
      {LABELS[alerta]}
    </span>
  );
}
