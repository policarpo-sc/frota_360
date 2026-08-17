import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseInvestimento } from "./investimento";

function buildWorkbook() {
  const aoa = [
    ["Levantamento necessidade investimentos - JSL Operação Ribas do Rio Pardo"],
    [
      "Onda",
      "Local",
      "Bloco",
      "Investimento",
      "Estimativa de Investimento",
      "Data de Solicitação",
      "Data de Aprovação",
      "Status",
    ],
    [
      "ONDA 2",
      "Três Lagoas",
      "B6 - Gestão da Segurança",
      "Câmeras de monitoramento no pátio",
      33500,
      "2026-06-01",
      "",
      "Atrasado",
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Inventimentos");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("parseInvestimento", () => {
  it("skips the merged title row and maps columns from row 2", () => {
    const today = new Date("2026-08-16T00:00:00Z");
    const result = parseInvestimento(buildWorkbook(), today);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      onda: "ONDA 2",
      local: "Três Lagoas",
      bloco: "B6 - Gestão da Segurança",
      estimativaInvestimento: 33500,
      status: "Atrasado",
    });
  });
});
