import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseAcoes } from "./acoes";

function buildWorkbook() {
  const rows = [
    {
      ONDAS: "ONDA 1",
      "Nº BLOCO": 1,
      BLOCO: "B1 - Cadastro, Criticidade e Estratégia de Ativos",
      REQUISITO: "Existe um cadastro de ativos atualizado?",
      "Atende?": "Parcial",
      AÇÃO: "Elaborar de Fluxos e Procedimentos",
      TAREFA: "Mapear ativos críticos",
      RESPONSÁVEL: "Maria Silva",
      "Quando?\n(Início)": "2026-07-01",
      "Prazo Previsto": "2026-08-01",
      "DT Início Real": "2026-07-02",
      "Quando?\n(Fim)": "",
      "Duração (Dias)": 31,
      Status: "Em andamento",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Projeto Extratificado");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("parseAcoes", () => {
  it("maps columns and computes an alert per row", () => {
    const today = new Date("2026-08-16T00:00:00Z");
    const result = parseAcoes(buildWorkbook(), today);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      onda: "ONDA 1",
      numBloco: 1,
      bloco: "B1 - Cadastro, Criticidade e Estratégia de Ativos",
      responsavel: "Maria Silva",
      status: "Em andamento",
      alerta: "atrasado",
    });
  });
});
