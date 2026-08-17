import * as XLSX from "xlsx";
import { computeAlert } from "../alerts";
import type { GenteRow } from "../types";

const SHEET_NAME = "GENTE";
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

export function parseGente(buffer: Buffer, today: Date = new Date()): GenteRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: HEADER_ROW_INDEX,
  });

  return raw.map((row) => {
    const status = String(row["Status"] ?? "").trim();
    const prazoPrevisto = toIsoDate(row["Prazo Previsto"]);
    return {
      numero: toNumber(row["Nº"]),
      unidade: String(row["Unidade"] ?? "").trim(),
      nomeFuncao: String(row["Nome da função"] ?? "").trim(),
      qtd: toNumber(row["QTD"]),
      motivoSolicitacao: String(row["Motivo Solicitação"] ?? "").trim(),
      justificativa: String(row["Justificativa"] ?? "").trim(),
      responsavelSolicitacao: String(row["Responsável pela Solicitação"] ?? "").trim(),
      gestorJslResponsavel: String(row["Gestor JSL Responsável pela Demanda"] ?? "").trim(),
      dataApresentacaoSolicitacao: toIsoDate(row["Data Apresentação da solicitação"]),
      statusSolicitacao: String(row["Status da Solicitação"] ?? "").trim(),
      posicaoVaga: String(row["Posição da Vaga\nArea de Gente"] ?? "").trim(),
      inicioPrevisto: toIsoDate(row["Quando? (Inicio)"]),
      prazoPrevisto,
      fimReal: toIsoDate(row["Quando? (Fim)"]),
      duracaoDias: toNumber(row["Duração (Dias)"]),
      status,
      comentarios: String(row["Comentários"] ?? "").trim(),
      alerta: computeAlert(status, prazoPrevisto, today),
    };
  });
}
