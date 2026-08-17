import { describe, it, expect } from "vitest";
import { computeAlert } from "./alerts";

describe("computeAlert", () => {
  const today = new Date("2026-08-16T00:00:00Z");

  it("returns 'atrasado' when overdue and not concluded", () => {
    expect(computeAlert("Em andamento", "2026-08-01", today)).toBe("atrasado");
  });

  it("returns 'atencao' when due within 7 days and not concluded", () => {
    expect(computeAlert("Em andamento", "2026-08-20", today)).toBe("atencao");
  });

  it("returns 'normal' when due far in the future", () => {
    expect(computeAlert("Em andamento", "2026-09-30", today)).toBe("normal");
  });

  it("returns 'normal' when status is Concluída even if overdue", () => {
    expect(computeAlert("Concluída", "2026-01-01", today)).toBe("normal");
  });

  it("returns 'normal' when prazoPrevisto is null", () => {
    expect(computeAlert("Não Iniciado", null, today)).toBe("normal");
  });
});
