import * as XLSX from "xlsx";
import { computeAlert } from "../alerts";
import type { InvestimentoRow } from "../types";

const SHEET_NAME = "Inventimentos";
const HEADER_ROW_INDEX = 1; // row 2 in the file — row 1 is the merged title

function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function parseInvestimento(
  buffer: Buffer,
  today: Date = new Date()
): InvestimentoRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: HEADER_ROW_INDEX,
  });

  return raw.map((row) => {
    const status = String(row["Status"] ?? "").trim();
    // No "Prazo Previsto" column in this sheet — treat "Data de Solicitação"
    // plus lack of "Data de Aprovação" as the field alerts are computed from,
    // per spec §2/§6 (Investimento only has request/approval dates).
    const dataSolicitacao = toIsoDate(row["Data de Solicitação"]);
    return {
      onda: String(row["Onda"] ?? "").trim(),
      local: String(row["Local"] ?? "").trim(),
      bloco: String(row["Bloco"] ?? "").trim(),
      investimento: String(row["Investimento"] ?? "").trim(),
      estimativaInvestimento: toNumber(row["Estimativa de Investimento"]),
      dataSolicitacao,
      dataAprovacao: toIsoDate(row["Data de Aprovação"]),
      status,
      alerta: computeAlert(status, dataSolicitacao, today),
    };
  });
}
