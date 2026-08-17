import type { AlertLevel } from "./types";

const WARNING_WINDOW_DAYS = 7;
const CONCLUDED_STATUSES = new Set(["concluída", "concluida"]);

export function computeAlert(
  status: string,
  prazoPrevisto: string | null,
  today: Date = new Date()
): AlertLevel {
  if (!prazoPrevisto) return "normal";
  if (CONCLUDED_STATUSES.has(status.trim().toLowerCase())) return "normal";

  const prazo = new Date(prazoPrevisto);
  if (Number.isNaN(prazo.getTime())) return "normal";

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const prazoMidnight = new Date(prazo.getFullYear(), prazo.getMonth(), prazo.getDate());
  const diffDays = Math.round(
    (prazoMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "atrasado";
  if (diffDays <= WARNING_WINDOW_DAYS) return "atencao";
  return "normal";
}
