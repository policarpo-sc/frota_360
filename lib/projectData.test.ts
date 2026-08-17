import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { __setDriveClientForTests } from "./drive";

const kvStore = new Map<string, unknown>();
vi.mock("./redisClient", () => ({
  kv: {
    get: async (key: string) => kvStore.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      kvStore.set(key, value);
    },
  },
}));

function buildAcoesWorkbook() {
  const rows = [
    {
      ONDAS: "ONDA 1",
      "Nº BLOCO": 1,
      BLOCO: "B1",
      REQUISITO: "R1",
      "Atende?": "Não",
      AÇÃO: "A1",
      TAREFA: "T1",
      RESPONSÁVEL: "Maria",
      "Quando?\n(Início)": "2026-01-01",
      "Prazo Previsto": "2026-01-10",
      "DT Início Real": "",
      "Quando?\n(Fim)": "",
      "Duração (Dias)": 9,
      Status: "Não Iniciado",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Projeto Extratificado");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function emptySheetWorkbook(sheetName: string) {
  const sheet = XLSX.utils.aoa_to_sheet([["title"], ["col1"]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

beforeEach(() => {
  kvStore.clear();
  __setDriveClientForTests({
    files: {
      list: async () => ({
        data: {
          files: [
            { id: "1", name: "Projeto_Ações.xlsx", mimeType: "x", webViewLink: "u1" },
            {
              id: "2",
              name: "Projeto_Condicionantes_Gente.xlsx",
              mimeType: "x",
              webViewLink: "u2",
            },
            {
              id: "3",
              name: "Projeto_Condicionantes_Investimento.xlsx",
              mimeType: "x",
              webViewLink: "u3",
            },
          ],
        },
      }),
      get: async (params: { fileId: string }) => {
        if (params.fileId === "1") return { data: buildAcoesWorkbook() };
        if (params.fileId === "2") return { data: emptySheetWorkbook("GENTE") };
        return { data: emptySheetWorkbook("Inventimentos") };
      },
    },
  });
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = "e30=";
  process.env.GOOGLE_DRIVE_FOLDER_ID = "folder123";
});

describe("getProjectData", () => {
  it("aggregates parsed rows from all three files and caches the result", async () => {
    const { getProjectData } = await import("./projectData");
    const data = await getProjectData();
    expect(data.acoes).toHaveLength(1);
    expect(data.acoes[0].bloco).toBe("B1");
    expect(data.errors).toHaveLength(0);

    const cached = await getProjectData();
    expect(cached.updatedAt).toBe(data.updatedAt);
  });

  it("records a per-file error without failing the whole aggregation", async () => {
    __setDriveClientForTests({
      files: {
        list: async () => ({
          data: {
            files: [{ id: "1", name: "Projeto_Ações.xlsx", mimeType: "x", webViewLink: "u1" }],
          },
        }),
        get: async () => {
          throw new Error("network error");
        },
      },
    });
    const { getProjectData } = await import("./projectData");
    const data = await getProjectData({ forceRefresh: true });
    expect(data.acoes).toHaveLength(0);
    expect(data.errors).toEqual([
      { source: "acoes", message: "network error" },
      { source: "gente", message: "Arquivo não encontrado na pasta do Drive" },
      { source: "investimento", message: "Arquivo não encontrado na pasta do Drive" },
    ]);
  });
});
