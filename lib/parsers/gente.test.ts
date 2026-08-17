import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseGente } from "./gente";

function buildWorkbook() {
  const aoa = [
    ["REVISÕES HEADCOUNT - PROJETO FROTA 361"],
    [
      "Nº",
      "Unidade",
      "Nome da função",
      "QTD",
      "Motivo Solicitação",
      "Justificativa",
      "Responsável pela Solicitação",
      "Gestor JSL Responsável pela Demanda",
      "Data Apresentação da solicitação",
      "Status da Solicitação",
      "Posição da Vaga\nArea de Gente",
      "Quando? (Inicio)",
      "Prazo Previsto",
      "Quando? (Fim)",
      "Duração (Dias)",
      "Status",
      "Comentários",
    ],
    [
      1,
      "Ribas do Rio Pardo",
      "Coordenador de Manutenção",
      1,
      "Inclusão por demanda projeto / simulador",
      "Necessário para atender nova frente",
      "João Souza",
      "Ana Lima",
      "2026-06-01",
      "Aprovada",
      "Em processo de criação de Posição",
      "2026-06-10",
      "2026-08-01",
      "",
      "",
      "Atrasado",
      "Aguardando aprovação do RH",
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "GENTE");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("parseGente", () => {
  it("skips the merged title row and maps columns from row 2", () => {
    const today = new Date("2026-08-16T00:00:00Z");
    const result = parseGente(buildWorkbook(), today);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      numero: 1,
      unidade: "Ribas do Rio Pardo",
      nomeFuncao: "Coordenador de Manutenção",
      justificativa: "Necessário para atender nova frente",
      comentarios: "Aguardando aprovação do RH",
      status: "Atrasado",
      alerta: "atrasado",
    });
  });
});
