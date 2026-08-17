import { downloadDriveFile, listDriveFiles } from "./drive";
import { getCached, setCached } from "./cache";
import { parseAcoes } from "./parsers/acoes";
import { parseGente } from "./parsers/gente";
import { parseInvestimento } from "./parsers/investimento";
import type { ProjectData } from "./types";

const CACHE_KEY = "project-data:v1";

const FILE_MATCHERS: {
  source: "acoes" | "gente" | "investimento";
  test: (name: string) => boolean;
}[] = [
  { source: "acoes", test: (name) => name.includes("Ações") || name.includes("Acoes") },
  { source: "gente", test: (name) => name.includes("Gente") },
  { source: "investimento", test: (name) => name.includes("Investimento") },
];

export async function getProjectData(
  options: { forceRefresh?: boolean } = {}
): Promise<ProjectData> {
  if (!options.forceRefresh) {
    const cached = await getCached<ProjectData>(CACHE_KEY);
    if (cached) return cached;
  }

  const files = await listDriveFiles();
  const errors: ProjectData["errors"] = [];
  const result: ProjectData = {
    acoes: [],
    gente: [],
    investimento: [],
    updatedAt: new Date().toISOString(),
    errors,
  };

  for (const matcher of FILE_MATCHERS) {
    const file = files.find((f) => matcher.test(f.name));
    if (!file) {
      continue;
    }
    try {
      const buffer = await downloadDriveFile(file.id);
      if (matcher.source === "acoes") result.acoes = parseAcoes(buffer);
      if (matcher.source === "gente") result.gente = parseGente(buffer);
      if (matcher.source === "investimento") result.investimento = parseInvestimento(buffer);
    } catch (err) {
      errors.push({
        source: matcher.source,
        message: err instanceof Error ? err.message : "Erro desconhecido ao processar arquivo",
      });
    }
  }

  await setCached(CACHE_KEY, result);
  return result;
}
