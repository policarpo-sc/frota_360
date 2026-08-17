import * as XLSX from "xlsx";
import { computeAlert } from "../alerts";
import type { AcaoRow } from "../types";

const SHEET_NAME = "Projeto Extratificado";

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

export function parseAcoes(buffer: Buffer, today: Date = new Date()): AcaoRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return raw.map((row) => {
    const status = String(row["Status"] ?? "").trim();
    const prazoPrevisto = toIsoDate(row["Prazo Previsto"]);
    return {
      onda: String(row["ONDAS"] ?? "").trim(),
      numBloco: toNumber(row["Nº BLOCO"]),
      bloco: String(row["BLOCO"] ?? "").trim(),
      requisito: String(row["REQUISITO"] ?? "").trim(),
      atende: String(row["Atende?"] ?? "").trim(),
      acao: String(row["AÇÃO"] ?? "").trim(),
      tarefa: String(row["TAREFA"] ?? "").trim(),
      responsavel: String(row["RESPONSÁVEL"] ?? "").trim(),
      inicioPrevisto: toIsoDate(row["Quando?\n(Início)"]),
      prazoPrevisto,
      inicioReal: toIsoDate(row["DT Início Real"]),
      fimReal: toIsoDate(row["Quando?\n(Fim)"]),
      duracaoDias: toNumber(row["Duração (Dias)"]),
      status,
      alerta: computeAlert(status, prazoPrevisto, today),
    };
  });
}
