# Frota 360 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web dashboard that reads three Excel files from a Google
Drive folder (Ações, Condicionantes Gente, Condicionantes Investimento), shows
progress KPIs, filterable tables, deadline alerts, a Drive file browser, and a
two-role (admin/viewer) login system with an admin user-management screen.

**Architecture:** Next.js 14 (App Router, TypeScript) fullstack app hosted on
Vercel. Server-side API routes read files from Google Drive via a service
account, parse them with SheetJS, compute KPIs/alerts, and cache the result in
Vercel KV. Auth is a custom JWT-in-cookie session; user records (with bcrypt
password hashes and role) live in Vercel KV, managed through an admin-only CRUD
screen.

**Tech Stack:** Next.js 14 + TypeScript + Tailwind CSS, `xlsx` (SheetJS),
`googleapis` (Drive API v3), `@vercel/kv`, `bcryptjs`, `jose` (JWT), Vitest
(unit tests), Vercel hosting.

**Spec:** [docs/superpowers/specs/2026-08-16-frota-360-dashboard-design.md](../specs/2026-08-16-frota-360-dashboard-design.md)

## Global Constraints

- Excel files remain the editable source of truth — the app is read-only over
  project data (per spec §1).
- `Justificativa` and `Comentários` columns (Gente file) are visible to `admin`
  only, hidden for `viewer` (spec §2, §4).
- Data cache TTL is ~15 minutes; only `admin` can force an immediate refresh
  (spec §3, §4).
- Two fixed roles only: `admin`, `viewer` — no other role values (spec §4).
- Alert thresholds: overdue = `Prazo Previsto` < today and `Status` ≠
  "Concluída"; warning = `Prazo Previsto` ≤ today + 7 days under the same
  condition (spec §6).
- Login failures return a generic message, never revealing whether the
  username or password was wrong (spec §7).
- No relational database — only Vercel KV (spec §3).
- Gente/Investimento sheets have a merged title row; real header is row 2
  (`header index 1`) (spec §2).

---

## File Structure

```
frota360/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── middleware.ts
├── .env.example
├── lib/
│   ├── types.ts
│   ├── alerts.ts
│   ├── auth/
│   │   ├── session.ts
│   │   └── users.ts
│   ├── drive.ts
│   ├── cache.ts
│   └── parsers/
│       ├── acoes.ts
│       ├── gente.ts
│       └── investimento.ts
├── app/
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── acoes/page.tsx
│   ├── condicionantes/page.tsx
│   ├── arquivos/page.tsx
│   ├── admin/page.tsx
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       ├── data/route.ts
│       ├── data/refresh/route.ts
│       ├── files/route.ts
│       └── admin/users/route.ts
└── components/
    ├── KpiCard.tsx
    ├── StatusBadge.tsx
    ├── DataTable.tsx
    └── NavBar.tsx
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`,
  `postcss.config.js`, `vitest.config.ts`, `.env.example`, `.gitignore`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Produces: a working `next dev` app skeleton and `vitest run` command that
  later tasks build on.

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@14 . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-npm
```

Answer "No" to any prompt about overwriting existing files that aren't part of
this scaffold (keep the pre-existing `docs/` folder and the `.xlsx` sample
files untouched).

- [ ] **Step 2: Add runtime dependencies**

```bash
npm install googleapis xlsx @vercel/kv bcryptjs jose
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Add to `package.json` scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run"
}
```

- [ ] **Step 4: Create `.env.example`**

```bash
# Google Drive service account (JSON key contents, base64-encoded)
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=
# Google Drive folder ID containing the 3 project spreadsheets
GOOGLE_DRIVE_FOLDER_ID=
# Vercel KV (auto-populated by Vercel when you attach a KV store)
KV_REST_API_URL=
KV_REST_API_TOKEN=
# Secret used to sign session JWTs (openssl rand -base64 32)
SESSION_SECRET=
```

- [ ] **Step 5: Verify the app boots**

Run: `npm run dev` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: `200`. Stop the dev server after confirming.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

### Task 2: Shared domain types and alert logic

**Files:**
- Create: `lib/types.ts`
- Create: `lib/alerts.ts`
- Test: `lib/alerts.test.ts`

**Interfaces:**
- Produces: `AlertLevel` type (`"atrasado" | "atencao" | "normal"`) and
  `computeAlert(status: string, prazoPrevisto: string | null, today?: Date):
  AlertLevel`, used by all three parsers (Tasks 4–6).

- [ ] **Step 1: Define shared row types**

Create `lib/types.ts`:

```typescript
export type AlertLevel = "atrasado" | "atencao" | "normal";

export interface AcaoRow {
  onda: string;
  numBloco: number | null;
  bloco: string;
  requisito: string;
  atende: string;
  acao: string;
  tarefa: string;
  responsavel: string;
  inicioPrevisto: string | null;
  prazoPrevisto: string | null;
  inicioReal: string | null;
  fimReal: string | null;
  duracaoDias: number | null;
  status: string;
  alerta: AlertLevel;
}

export interface GenteRow {
  numero: number | null;
  unidade: string;
  nomeFuncao: string;
  qtd: number | null;
  motivoSolicitacao: string;
  justificativa: string;
  responsavelSolicitacao: string;
  gestorJslResponsavel: string;
  dataApresentacaoSolicitacao: string | null;
  statusSolicitacao: string;
  posicaoVaga: string;
  inicioPrevisto: string | null;
  prazoPrevisto: string | null;
  fimReal: string | null;
  duracaoDias: number | null;
  status: string;
  comentarios: string;
  alerta: AlertLevel;
}

export interface InvestimentoRow {
  onda: string;
  local: string;
  bloco: string;
  investimento: string;
  estimativaInvestimento: number | null;
  dataSolicitacao: string | null;
  dataAprovacao: string | null;
  status: string;
  alerta: AlertLevel;
}

export type UserRole = "admin" | "viewer";

export interface User {
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface ProjectData {
  acoes: AcaoRow[];
  gente: GenteRow[];
  investimento: InvestimentoRow[];
  updatedAt: string;
  errors: { source: "acoes" | "gente" | "investimento"; message: string }[];
}
```

- [ ] **Step 2: Write the failing test for alert logic**

Create `lib/alerts.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/alerts.test.ts`
Expected: FAIL — `lib/alerts.ts` does not exist yet.

- [ ] **Step 4: Implement `computeAlert`**

Create `lib/alerts.ts`:

```typescript
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/alerts.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/alerts.ts lib/alerts.test.ts
git commit -m "feat: add domain types and deadline alert calculation"
```

---

### Task 3: Ações parser

**Files:**
- Create: `lib/parsers/acoes.ts`
- Test: `lib/parsers/acoes.test.ts`

**Interfaces:**
- Consumes: `computeAlert` from `lib/alerts.ts` (Task 2); `AcaoRow` from
  `lib/types.ts` (Task 2).
- Produces: `parseAcoes(buffer: Buffer, today?: Date): AcaoRow[]`, consumed by
  Task 9's aggregation layer.

- [ ] **Step 1: Write the failing test**

Create `lib/parsers/acoes.test.ts`. It builds a minimal in-memory workbook with
`xlsx` matching the real column headers, so the test has no dependency on the
actual project file:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/parsers/acoes.test.ts`
Expected: FAIL — `lib/parsers/acoes.ts` does not exist yet.

- [ ] **Step 3: Implement the parser**

Create `lib/parsers/acoes.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/parsers/acoes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/acoes.ts lib/parsers/acoes.test.ts
git commit -m "feat: add Ações spreadsheet parser"
```

---

### Task 4: Gente parser

**Files:**
- Create: `lib/parsers/gente.ts`
- Test: `lib/parsers/gente.test.ts`

**Interfaces:**
- Consumes: `computeAlert` (Task 2), `GenteRow` (Task 2).
- Produces: `parseGente(buffer: Buffer, today?: Date): GenteRow[]`, consumed by
  Task 9.

- [ ] **Step 1: Write the failing test**

Create `lib/parsers/gente.test.ts`. The merged title row is simulated by
prepending a raw title row before the header, then reading with `header: 1`
starting at row index 1 (see implementation in Step 3):

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/parsers/gente.test.ts`
Expected: FAIL — `lib/parsers/gente.ts` does not exist yet.

- [ ] **Step 3: Implement the parser**

Create `lib/parsers/gente.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/parsers/gente.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/gente.ts lib/parsers/gente.test.ts
git commit -m "feat: add Condicionantes Gente spreadsheet parser"
```

---

### Task 5: Investimento parser

**Files:**
- Create: `lib/parsers/investimento.ts`
- Test: `lib/parsers/investimento.test.ts`

**Interfaces:**
- Consumes: `computeAlert` (Task 2), `InvestimentoRow` (Task 2).
- Produces: `parseInvestimento(buffer: Buffer, today?: Date):
  InvestimentoRow[]`, consumed by Task 9.

- [ ] **Step 1: Write the failing test**

Create `lib/parsers/investimento.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/parsers/investimento.test.ts`
Expected: FAIL — `lib/parsers/investimento.ts` does not exist yet.

- [ ] **Step 3: Implement the parser**

Create `lib/parsers/investimento.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/parsers/investimento.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/investimento.ts lib/parsers/investimento.test.ts
git commit -m "feat: add Condicionantes Investimento spreadsheet parser"
```

---

### Task 6: Session (JWT cookie) helpers

**Files:**
- Create: `lib/auth/session.ts`
- Test: `lib/auth/session.test.ts`

**Interfaces:**
- Produces: `createSessionToken(payload: { username: string; role: UserRole })
  => Promise<string>`, `verifySessionToken(token: string) =>
  Promise<{ username: string; role: UserRole } | null>`, `SESSION_COOKIE_NAME`
  constant — consumed by Task 8 (login route), Task 10 (middleware), and every
  protected API route.

- [ ] **Step 1: Write the failing test**

Create `lib/auth/session.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-32-bytes-long!!";
});

describe("session tokens", () => {
  it("round-trips a valid payload", async () => {
    const token = await createSessionToken({ username: "carlos", role: "admin" });
    const payload = await verifySessionToken(token);
    expect(payload).toMatchObject({ username: "carlos", role: "admin" });
  });

  it("returns null for a tampered token", async () => {
    const token = await createSessionToken({ username: "carlos", role: "admin" });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/session.test.ts`
Expected: FAIL — `lib/auth/session.ts` does not exist yet.

- [ ] **Step 3: Implement session helpers**

Create `lib/auth/session.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../types";

export const SESSION_COOKIE_NAME = "frota360_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionPayload {
  username: string;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.username !== "string" || typeof payload.role !== "string") {
      return null;
    }
    if (payload.role !== "admin" && payload.role !== "viewer") return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/session.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat: add JWT session token helpers"
```

---

### Task 7: User store (Vercel KV + bcrypt)

**Files:**
- Create: `lib/auth/users.ts`
- Test: `lib/auth/users.test.ts`

**Interfaces:**
- Consumes: `User`, `UserRole` from `lib/types.ts` (Task 2).
- Produces: `listUsers()`, `getUser(username)`, `createUser({username,
  password, role})`, `updateUser(username, {password?, role?})`,
  `deleteUser(username)`, `verifyPassword(username, password) => Promise<User
  | null>`, `ensureSeedAdmin()` — all backed by an injectable KV client so
  tests don't require a real Vercel KV instance. Consumed by Task 8 (login),
  Task 13 (admin API).

- [ ] **Step 1: Write the failing test with an in-memory KV fake**

Create `lib/auth/users.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  __setKvClientForTests,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
} from "./users";

class FakeKv {
  private store = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }
  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

beforeEach(() => {
  __setKvClientForTests(new FakeKv());
});

describe("user store", () => {
  it("creates a user with a hashed password and lists it", async () => {
    await createUser({ username: "jsl_viewer", password: "senha123", role: "viewer" });
    const users = await listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe("jsl_viewer");
    expect(users[0].passwordHash).not.toBe("senha123");
  });

  it("verifies a correct password and rejects a wrong one", async () => {
    await createUser({ username: "admin1", password: "correcthorse", role: "admin" });
    expect(await verifyPassword("admin1", "correcthorse")).toMatchObject({
      username: "admin1",
      role: "admin",
    });
    expect(await verifyPassword("admin1", "wrongpass")).toBeNull();
  });

  it("returns null verifying a non-existent user", async () => {
    expect(await verifyPassword("ghost", "whatever")).toBeNull();
  });

  it("updates a user's role and password", async () => {
    await createUser({ username: "u1", password: "pass1", role: "viewer" });
    await updateUser("u1", { role: "admin", password: "pass2" });
    const user = await getUser("u1");
    expect(user?.role).toBe("admin");
    expect(await verifyPassword("u1", "pass2")).not.toBeNull();
  });

  it("deletes a user", async () => {
    await createUser({ username: "temp", password: "pass", role: "viewer" });
    await deleteUser("temp");
    expect(await getUser("temp")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/users.test.ts`
Expected: FAIL — `lib/auth/users.ts` does not exist yet.

- [ ] **Step 3: Implement the user store**

Create `lib/auth/users.ts`:

```typescript
import { kv as vercelKv } from "@vercel/kv";
import bcrypt from "bcryptjs";
import type { User, UserRole } from "../types";

interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let kvClient: KvClient = vercelKv;

// Test-only seam: lets lib/auth/users.test.ts inject an in-memory fake so
// unit tests don't require a real Vercel KV connection.
export function __setKvClientForTests(client: KvClient): void {
  kvClient = client;
}

const USERS_INDEX_KEY = "users:index";
const userKey = (username: string) => `users:${username}`;

async function getIndex(): Promise<string[]> {
  return (await kvClient.get<string[]>(USERS_INDEX_KEY)) ?? [];
}

async function saveIndex(usernames: string[]): Promise<void> {
  await kvClient.set(USERS_INDEX_KEY, usernames);
}

export async function listUsers(): Promise<User[]> {
  const usernames = await getIndex();
  const users = await Promise.all(usernames.map((u) => kvClient.get<User>(userKey(u))));
  return users.filter((u): u is User => u !== null);
}

export async function getUser(username: string): Promise<User | null> {
  return kvClient.get<User>(userKey(username));
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user: User = { username: input.username, passwordHash, role: input.role };
  await kvClient.set(userKey(user.username), user);

  const index = await getIndex();
  if (!index.includes(user.username)) {
    await saveIndex([...index, user.username]);
  }
  return user;
}

export async function updateUser(
  username: string,
  changes: { password?: string; role?: UserRole }
): Promise<User | null> {
  const existing = await getUser(username);
  if (!existing) return null;

  const updated: User = {
    ...existing,
    role: changes.role ?? existing.role,
    passwordHash: changes.password
      ? await bcrypt.hash(changes.password, 10)
      : existing.passwordHash,
  };
  await kvClient.set(userKey(username), updated);
  return updated;
}

export async function deleteUser(username: string): Promise<void> {
  await kvClient.del(userKey(username));
  const index = await getIndex();
  await saveIndex(index.filter((u) => u !== username));
}

export async function verifyPassword(
  username: string,
  password: string
): Promise<User | null> {
  const user = await getUser(username);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

// Called once at deploy time (or lazily on first login attempt) so the app
// always has at least one admin account, seeded from env vars.
export async function ensureSeedAdmin(): Promise<void> {
  const seedUsername = process.env.SEED_ADMIN_USERNAME;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedUsername || !seedPassword) return;

  const existing = await getUser(seedUsername);
  if (existing) return;
  await createUser({ username: seedUsername, password: seedPassword, role: "admin" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/users.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/users.ts lib/auth/users.test.ts
git commit -m "feat: add Vercel KV-backed user store with bcrypt hashing"
```

---

### Task 8: Login/logout API routes and login page

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `verifyPassword`, `ensureSeedAdmin` (Task 7);
  `createSessionToken`, `SESSION_COOKIE_NAME` (Task 6).
- Produces: `POST /api/auth/login` (sets session cookie, generic error
  message per spec §7), `POST /api/auth/logout` (clears cookie) — consumed by
  the login page and by Task 10's middleware for the logged-out redirect
  target.

- [ ] **Step 1: Implement the login route**

Create `app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ensureSeedAdmin, verifyPassword } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const GENERIC_ERROR = "Usuário ou senha inválidos.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  await ensureSeedAdmin();
  const user = await verifyPassword(username, password);
  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const token = await createSessionToken({ username: user.username, role: user.role });
  const response = NextResponse.json({ role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
```

- [ ] **Step 2: Implement the logout route**

Create `app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
```

- [ ] **Step 3: Implement the login page**

Create `app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Usuário ou senha inválidos.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Frota 360</h1>
        <div>
          <label className="block text-sm font-medium text-slate-700">Usuário</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Senha</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, then in another terminal:

```bash
curl -s -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nope","password":"nope"}'
```

Expected: HTTP `401` with body `{"error":"Usuário ou senha inválidos."}`.
(A full happy-path login requires `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD`
and a working KV connection — verified end-to-end in Task 14.) Stop the dev
server after checking.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.ts app/api/auth/logout/route.ts app/login/page.tsx
git commit -m "feat: add login/logout routes and login page"
```

---

### Task 9: Route protection middleware

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `verifySessionToken`, `SESSION_COOKIE_NAME` (Task 6).
- Produces: redirect-to-`/login` behavior for all protected routes, and
  `x-user-role` request header forwarded to server components/route handlers
  — consumed by Task 11–15 pages/routes to read the current role without
  re-parsing the cookie.

- [ ] **Step 1: Implement the middleware**

Create `middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const ADMIN_ONLY_PREFIXES = ["/admin", "/api/admin", "/api/data/refresh"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-user-role", session.role);
  response.headers.set("x-username", session.username);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard
```

Expected: `307` (redirect to `/login`, since no session cookie is sent). Stop
the dev server after checking.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add session-based route protection middleware"
```

---

### Task 10: Google Drive client

**Files:**
- Create: `lib/drive.ts`
- Test: `lib/drive.test.ts`

**Interfaces:**
- Produces: `listDriveFiles(): Promise<DriveFile[]>`,
  `downloadDriveFile(fileId: string): Promise<Buffer>`, where `DriveFile = {
  id: string; name: string; mimeType: string; webViewLink: string }` —
  consumed by Task 12 (data aggregation) and Task 16 (files API/page).
  Uses an injectable Drive API client seam so tests don't call Google.

- [ ] **Step 1: Write the failing test with a fake Drive client**

Create `lib/drive.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { __setDriveClientForTests, listDriveFiles, downloadDriveFile } from "./drive";

describe("drive client", () => {
  it("lists files from the configured folder", async () => {
    __setDriveClientForTests({
      files: {
        list: async () => ({
          data: {
            files: [
              {
                id: "abc123",
                name: "Projeto_Ações.xlsx",
                mimeType: "application/vnd.openxmlformats",
                webViewLink: "https://drive.google.com/file/d/abc123/view",
              },
            ],
          },
        }),
        get: async () => ({ data: Buffer.from("") }),
      },
    });

    const files = await listDriveFiles();
    expect(files).toEqual([
      {
        id: "abc123",
        name: "Projeto_Ações.xlsx",
        mimeType: "application/vnd.openxmlformats",
        webViewLink: "https://drive.google.com/file/d/abc123/view",
      },
    ]);
  });

  it("downloads a file as a Buffer", async () => {
    __setDriveClientForTests({
      files: {
        list: async () => ({ data: { files: [] } }),
        get: async () => ({ data: Buffer.from("hello") }),
      },
    });

    const buffer = await downloadDriveFile("abc123");
    expect(buffer.toString()).toBe("hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/drive.test.ts`
Expected: FAIL — `lib/drive.ts` does not exist yet.

- [ ] **Step 3: Implement the Drive client**

Create `lib/drive.ts`:

```typescript
import { google } from "googleapis";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

interface DriveFilesApi {
  list(params: unknown): Promise<{ data: { files?: Partial<DriveFile>[] } }>;
  get(params: unknown): Promise<{ data: Buffer }>;
}

interface DriveClient {
  files: DriveFilesApi;
}

let cachedClient: DriveClient | null = null;

// Test-only seam: lets lib/drive.test.ts inject a fake Drive API client.
export function __setDriveClientForTests(client: DriveClient | null): void {
  cachedClient = client;
}

function buildClient(): DriveClient {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!keyBase64) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set");
  }
  const credentials = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });
  return {
    files: {
      list: (params: unknown) => drive.files.list(params as never) as never,
      get: (params: unknown) => drive.files.get(params as never) as never,
    },
  };
}

function getClient(): DriveClient {
  if (!cachedClient) cachedClient = buildClient();
  return cachedClient;
}

function requireFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is not set");
  return folderId;
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  const client = getClient();
  const folderId = requireFolderId();
  const response = await client.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink)",
    pageSize: 100,
  });
  return (response.data.files ?? []).map((f) => ({
    id: f.id ?? "",
    name: f.name ?? "",
    mimeType: f.mimeType ?? "",
    webViewLink: f.webViewLink ?? "",
  }));
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.files.get({
    fileId,
    alt: "media",
    responseType: "arraybuffer" as never,
  });
  return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data as never);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/drive.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/drive.ts lib/drive.test.ts
git commit -m "feat: add Google Drive client with injectable test seam"
```

---

### Task 11: Data aggregation and KV cache layer

**Files:**
- Create: `lib/cache.ts`
- Create: `lib/projectData.ts`
- Test: `lib/projectData.test.ts`

**Interfaces:**
- Consumes: `listDriveFiles`, `downloadDriveFile` (Task 10); `parseAcoes`,
  `parseGente`, `parseInvestimento` (Tasks 3–5); `ProjectData` (Task 2).
- Produces: `getProjectData(options?: { forceRefresh?: boolean }):
  Promise<ProjectData>` — consumed by Task 12 (`/api/data` route) and Task 15
  (`/api/data/refresh` route).

- [ ] **Step 1: Implement the cache wrapper**

Create `lib/cache.ts`:

```typescript
import { kv } from "@vercel/kv";

const DEFAULT_TTL_SECONDS = 15 * 60;

export async function getCached<T>(key: string): Promise<T | null> {
  return kv.get<T>(key);
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  await kv.set(key, value, { ex: ttlSeconds });
}
```

- [ ] **Step 2: Write the failing test for aggregation**

Create `lib/projectData.test.ts`. It stubs the Drive client and file-name-to-
parser matching by exercising `getProjectData` against `__setDriveClientForTests`
and monkey-patching `@vercel/kv` via `vi.mock`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { __setDriveClientForTests } from "./drive";

const kvStore = new Map<string, unknown>();
vi.mock("@vercel/kv", () => ({
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
    expect(data.errors).toEqual([{ source: "acoes", message: "network error" }]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/projectData.test.ts`
Expected: FAIL — `lib/projectData.ts` does not exist yet.

- [ ] **Step 4: Implement the aggregation layer**

Create `lib/projectData.ts`:

```typescript
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
      errors.push({ source: matcher.source, message: "Arquivo não encontrado na pasta do Drive" });
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/projectData.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/cache.ts lib/projectData.ts lib/projectData.test.ts
git commit -m "feat: add cached aggregation of the three project spreadsheets"
```

---

### Task 12: `/api/data` and `/api/data/refresh` routes

**Files:**
- Create: `app/api/data/route.ts`
- Create: `app/api/data/refresh/route.ts`

**Interfaces:**
- Consumes: `getProjectData` (Task 11); reads `x-user-role` header set by
  middleware (Task 9) to redact `justificativa`/`comentarios` for `viewer`
  (spec §2, §4).
- Produces: `GET /api/data` → `ProjectData` (role-filtered), `POST
  /api/data/refresh` → forces a re-fetch (admin-only, enforced by middleware)
  — consumed by Task 13 (dashboard), Task 14 (ações/condicionantes pages), and
  the Admin page's refresh button (Task 17).

- [ ] **Step 1: Implement the data route with role-based redaction**

Create `app/api/data/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getProjectData } from "@/lib/projectData";
import type { ProjectData } from "@/lib/types";

function redactForViewer(data: ProjectData): ProjectData {
  return {
    ...data,
    gente: data.gente.map((row) => ({ ...row, justificativa: "", comentarios: "" })),
  };
}

export async function GET(request: NextRequest) {
  const data = await getProjectData();
  const role = request.headers.get("x-user-role");
  return NextResponse.json(role === "admin" ? data : redactForViewer(data));
}
```

- [ ] **Step 2: Implement the refresh route (admin-only via middleware)**

Create `app/api/data/refresh/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getProjectData } from "@/lib/projectData";

export async function POST() {
  const data = await getProjectData({ forceRefresh: true });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/data
```

Expected: `307` redirect to `/login` (no session cookie) — confirms the
middleware from Task 9 protects this route too. Stop the dev server after
checking.

- [ ] **Step 4: Commit**

```bash
git add app/api/data/route.ts app/api/data/refresh/route.ts
git commit -m "feat: add project data API with viewer-role redaction"
```

---

### Task 13: Shared UI components

**Files:**
- Create: `components/NavBar.tsx`
- Create: `components/KpiCard.tsx`
- Create: `components/StatusBadge.tsx`
- Create: `components/DataTable.tsx`

**Interfaces:**
- Produces: `<NavBar role={UserRole} />`, `<KpiCard label={string}
  value={string | number} tone?={"default"|"warning"|"danger"} />`,
  `<StatusBadge alerta={AlertLevel} />`, `<DataTable<T> columns={{key: keyof
  T; header: string; render?: (row: T) => React.ReactNode}[]} rows={T[]} />`
  — consumed by Task 14 (dashboard), Task 15 (ações/condicionantes pages).

- [ ] **Step 1: Implement `StatusBadge`**

Create `components/StatusBadge.tsx`:

```tsx
import type { AlertLevel } from "@/lib/types";

const STYLES: Record<AlertLevel, string> = {
  atrasado: "bg-red-100 text-red-800",
  atencao: "bg-yellow-100 text-yellow-800",
  normal: "bg-slate-100 text-slate-700",
};

const LABELS: Record<AlertLevel, string> = {
  atrasado: "Atrasado",
  atencao: "Atenção",
  normal: "No prazo",
};

export function StatusBadge({ alerta }: { alerta: AlertLevel }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[alerta]}`}>
      {LABELS[alerta]}
    </span>
  );
}
```

- [ ] **Step 2: Implement `KpiCard`**

Create `components/KpiCard.tsx`:

```tsx
export function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warning"
        ? "border-yellow-200 bg-yellow-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
```

- [ ] **Step 3: Implement generic `DataTable`**

Create `components/DataTable.tsx`:

```tsx
export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T extends { [key: string]: unknown }>({
  columns,
  rows,
}: {
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-3 py-2 text-left font-medium text-slate-600">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-3 py-2 text-slate-700">
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Implement `NavBar`**

Create `components/NavBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

const LINKS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/acoes", label: "Ações" },
  { href: "/condicionantes", label: "Condicionantes" },
  { href: "/arquivos", label: "Arquivos" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function NavBar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex gap-4">
        {LINKS.filter((l) => !l.adminOnly || role === "admin").map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium ${
              pathname === link.href ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700">
        Sair
      </button>
    </nav>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/
git commit -m "feat: add shared NavBar, KpiCard, StatusBadge and DataTable components"
```

---

### Task 14: Dashboard page

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/DashboardClient.tsx`

**Interfaces:**
- Consumes: `GET /api/data` (Task 12); `KpiCard`, `NavBar` (Task 13); `next/headers`
  to read `x-user-role` server-side.
- Produces: the `/dashboard` route, the default landing page after login.

- [ ] **Step 1: Implement the server page (reads role, renders NavBar + client body)**

Create `app/dashboard/page.tsx`:

```tsx
import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { DashboardClient } from "./DashboardClient";
import type { UserRole } from "@/lib/types";

export default function DashboardPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <DashboardClient />
    </>
  );
}
```

- [ ] **Step 2: Implement the client component with KPI calculations**

Create `app/dashboard/DashboardClient.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import type { ProjectData } from "@/lib/types";

export function DashboardClient() {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((d: ProjectData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!data) return <p className="p-6 text-red-600">Não foi possível carregar os dados.</p>;

  const totalAcoes = data.acoes.length;
  const concluidas = data.acoes.filter((a) => a.status.trim().toLowerCase() === "concluída").length;
  const atrasadas = data.acoes.filter((a) => a.alerta === "atrasado").length;
  const emAndamento = data.acoes.filter((a) => a.status.trim().toLowerCase() === "em andamento").length;
  const vagasAtrasadas = data.gente.filter((g) => g.alerta === "atrasado").length;
  const investimentosAtrasados = data.investimento.filter((i) => i.alerta === "atrasado").length;

  return (
    <main className="p-6">
      {data.errors.length > 0 && (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {data.errors.map((e) => (
            <p key={e.source}>
              Não foi possível atualizar "{e.source}": {e.message}. Última atualização exibida:{" "}
              {new Date(data.updatedAt).toLocaleString("pt-BR")}.
            </p>
          ))}
        </div>
      )}
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Visão geral do projeto</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Ações concluídas" value={`${concluidas}/${totalAcoes}`} />
        <KpiCard label="Ações em andamento" value={emAndamento} />
        <KpiCard label="Ações atrasadas" value={atrasadas} tone={atrasadas > 0 ? "danger" : "default"} />
        <KpiCard
          label="Vagas atrasadas"
          value={vagasAtrasadas}
          tone={vagasAtrasadas > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Investimentos atrasados"
          value={investimentosAtrasados}
          tone={investimentosAtrasados > 0 ? "warning" : "default"}
        />
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Última atualização: {new Date(data.updatedAt).toLocaleString("pt-BR")}
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, log in via the browser at `http://localhost:3000/login`
with a seeded admin account (requires Task 17's env setup), then navigate to
`/dashboard` and confirm the KPI cards render without console errors.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add dashboard page with progress KPIs"
```

---

### Task 15: Ações and Condicionantes pages

**Files:**
- Create: `app/acoes/page.tsx`
- Create: `app/acoes/AcoesClient.tsx`
- Create: `app/condicionantes/page.tsx`
- Create: `app/condicionantes/CondicionantesClient.tsx`

**Interfaces:**
- Consumes: `GET /api/data` (Task 12); `DataTable`, `StatusBadge`, `NavBar`
  (Task 13).
- Produces: the `/acoes` and `/condicionantes` routes.

- [ ] **Step 1: Implement the Ações server page**

Create `app/acoes/page.tsx`:

```tsx
import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { AcoesClient } from "./AcoesClient";
import type { UserRole } from "@/lib/types";

export default function AcoesPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <AcoesClient />
    </>
  );
}
```

- [ ] **Step 2: Implement the Ações client component with filters**

Create `app/acoes/AcoesClient.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { AcaoRow, ProjectData } from "@/lib/types";

export function AcoesClient() {
  const [rows, setRows] = useState<AcaoRow[]>([]);
  const [ondaFilter, setOndaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((d: ProjectData) => setRows(d.acoes));
  }, []);

  const ondas = useMemo(() => Array.from(new Set(rows.map((r) => r.onda))).sort(), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = rows.filter(
    (r) =>
      (!ondaFilter || r.onda === ondaFilter) &&
      (!statusFilter || r.status === statusFilter) &&
      (!responsavelFilter ||
        r.responsavel.toLowerCase().includes(responsavelFilter.toLowerCase()))
  );

  const columns: Column<AcaoRow>[] = [
    { key: "onda", header: "Onda" },
    { key: "bloco", header: "Bloco" },
    { key: "tarefa", header: "Tarefa" },
    { key: "responsavel", header: "Responsável" },
    { key: "prazoPrevisto", header: "Prazo" },
    { key: "status", header: "Status" },
    { key: "alerta", header: "Alerta", render: (row) => <StatusBadge alerta={row.alerta} /> },
  ];

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Ações</h1>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={ondaFilter}
          onChange={(e) => setOndaFilter(e.target.value)}
        >
          <option value="">Todas as ondas</option>
          {ondas.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          placeholder="Filtrar por responsável"
          value={responsavelFilter}
          onChange={(e) => setResponsavelFilter(e.target.value)}
        />
      </div>
      <DataTable columns={columns} rows={filtered} />
    </main>
  );
}
```

- [ ] **Step 3: Implement the Condicionantes server page**

Create `app/condicionantes/page.tsx`:

```tsx
import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { CondicionantesClient } from "./CondicionantesClient";
import type { UserRole } from "@/lib/types";

export default function CondicionantesPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <CondicionantesClient role={role} />
    </>
  );
}
```

- [ ] **Step 4: Implement the Condicionantes client component (Gente + Investimento tabs)**

Create `app/condicionantes/CondicionantesClient.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { GenteRow, InvestimentoRow, ProjectData, UserRole } from "@/lib/types";

export function CondicionantesClient({ role }: { role: UserRole }) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [tab, setTab] = useState<"gente" | "investimento">("gente");

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((d: ProjectData) => setData(d));
  }, []);

  const genteColumns: Column<GenteRow>[] = [
    { key: "unidade", header: "Unidade" },
    { key: "nomeFuncao", header: "Função" },
    { key: "qtd", header: "Qtd" },
    { key: "responsavelSolicitacao", header: "Responsável" },
    { key: "prazoPrevisto", header: "Prazo" },
    { key: "status", header: "Status" },
    { key: "alerta", header: "Alerta", render: (row) => <StatusBadge alerta={row.alerta} /> },
    ...(role === "admin"
      ? ([{ key: "justificativa", header: "Justificativa" }] as Column<GenteRow>[])
      : []),
  ];

  const investimentoColumns: Column<InvestimentoRow>[] = [
    { key: "onda", header: "Onda" },
    { key: "local", header: "Local" },
    { key: "bloco", header: "Bloco" },
    { key: "investimento", header: "Investimento" },
    {
      key: "estimativaInvestimento",
      header: "Estimativa (R$)",
      render: (row) => row.estimativaInvestimento?.toLocaleString("pt-BR") ?? "-",
    },
    { key: "status", header: "Status" },
    { key: "alerta", header: "Alerta", render: (row) => <StatusBadge alerta={row.alerta} /> },
  ];

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Condicionantes</h1>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("gente")}
          className={`rounded-md px-3 py-1 text-sm ${tab === "gente" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Gente
        </button>
        <button
          onClick={() => setTab("investimento")}
          className={`rounded-md px-3 py-1 text-sm ${tab === "investimento" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Investimento
        </button>
      </div>
      {!data ? (
        <p className="text-slate-500">Carregando...</p>
      ) : tab === "gente" ? (
        <DataTable columns={genteColumns} rows={data.gente} />
      ) : (
        <DataTable columns={investimentoColumns} rows={data.investimento} />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in, visit `/acoes` and `/condicionantes`, confirm
filters narrow the table and the Gente tab hides the "Justificativa" column
when logged in as `viewer`.

- [ ] **Step 6: Commit**

```bash
git add app/acoes/ app/condicionantes/
git commit -m "feat: add Ações and Condicionantes pages with filters and role-based columns"
```

---

### Task 16: Files API and Arquivos page

**Files:**
- Create: `app/api/files/route.ts`
- Create: `app/arquivos/page.tsx`
- Create: `app/arquivos/ArquivosClient.tsx`

**Interfaces:**
- Consumes: `listDriveFiles` (Task 10); reads `x-user-role` header (Task 9).
- Produces: `GET /api/files` → `DriveFile[]` (all files for admin, only the 3
  tracked spreadsheets for viewer, per spec §4) and the `/arquivos` route.

- [ ] **Step 1: Implement the files route with role-based filtering**

Create `app/api/files/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { listDriveFiles } from "@/lib/drive";

const TRACKED_FILE_KEYWORDS = ["Ações", "Acoes", "Gente", "Investimento"];

export async function GET(request: NextRequest) {
  const files = await listDriveFiles();
  const role = request.headers.get("x-user-role");
  if (role === "admin") return NextResponse.json(files);

  const restricted = files.filter((f) =>
    TRACKED_FILE_KEYWORDS.some((keyword) => f.name.includes(keyword))
  );
  return NextResponse.json(restricted);
}
```

- [ ] **Step 2: Implement the Arquivos server page**

Create `app/arquivos/page.tsx`:

```tsx
import { headers } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { ArquivosClient } from "./ArquivosClient";
import type { UserRole } from "@/lib/types";

export default function ArquivosPage() {
  const role = (headers().get("x-user-role") as UserRole) ?? "viewer";
  return (
    <>
      <NavBar role={role} />
      <ArquivosClient />
    </>
  );
}
```

- [ ] **Step 3: Implement the Arquivos client component**

Create `app/arquivos/ArquivosClient.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { DriveFile } from "@/lib/drive";

export function ArquivosClient() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/files")
      .then((res) => res.json())
      .then((f: DriveFile[]) => setFiles(f))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="p-6 text-slate-500">Carregando...</main>;

  return (
    <main className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Arquivos do projeto</h1>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-700">{file.name}</span>
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-900 underline"
            >
              Abrir
            </a>
          </li>
        ))}
        {files.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">Nenhum arquivo encontrado.</li>
        )}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as `viewer`, visit `/arquivos`, confirm only the 3
tracked spreadsheets appear; log in as `admin`, confirm the full Drive folder
listing appears.

- [ ] **Step 5: Commit**

```bash
git add app/api/files/route.ts app/arquivos/
git commit -m "feat: add Drive file browser with role-based visibility"
```

---

### Task 17: Admin page (user management)

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/admin/page.tsx`
- Create: `app/admin/AdminClient.tsx`

**Interfaces:**
- Consumes: `listUsers`, `createUser`, `updateUser`, `deleteUser` (Task 7);
  `getProjectData` (Task 11, for the "refresh now" button, reusing
  `/api/data/refresh` from Task 12).
- Produces: `GET/POST/PUT/DELETE /api/admin/users` and the `/admin` route
  (already gated to `role === "admin"` by the Task 9 middleware).

- [ ] **Step 1: Implement the admin users API route**

Create `app/api/admin/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/auth/users";
import type { UserRole } from "@/lib/types";

function isValidRole(role: unknown): role is UserRole {
  return role === "admin" || role === "viewer";
}

export async function GET() {
  const users = await listUsers();
  return NextResponse.json(users.map((u) => ({ username: u.username, role: u.role })));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    typeof body?.username !== "string" ||
    !body.username.trim() ||
    typeof body?.password !== "string" ||
    body.password.length < 6 ||
    !isValidRole(body?.role)
  ) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const user = await createUser({ username: body.username, password: body.password, role: body.role });
  return NextResponse.json({ username: user.username, role: user.role }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.username !== "string" || !body.username.trim()) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (body.role !== undefined && !isValidRole(body.role)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }
  if (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 6)) {
    return NextResponse.json({ error: "Senha muito curta." }, { status: 400 });
  }
  const updated = await updateUser(body.username, { role: body.role, password: body.password });
  if (!updated) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  return NextResponse.json({ username: updated.username, role: updated.role });
}

export async function DELETE(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Usuário não informado." }, { status: 400 });
  await deleteUser(username);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement the Admin server page**

Create `app/admin/page.tsx`:

```tsx
import { NavBar } from "@/components/NavBar";
import { AdminClient } from "./AdminClient";

export default function AdminPage() {
  return (
    <>
      <NavBar role="admin" />
      <AdminClient />
    </>
  );
}
```

- [ ] **Step 3: Implement the Admin client component**

Create `app/admin/AdminClient.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

interface UserSummary {
  username: string;
  role: UserRole;
}

export function AdminClient() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar usuário.");
      return;
    }
    setUsername("");
    setPassword("");
    setRole("viewer");
    await loadUsers();
  }

  async function handleDelete(target: string) {
    await fetch(`/api/admin/users?username=${encodeURIComponent(target)}`, { method: "DELETE" });
    await loadUsers();
  }

  async function handleRoleChange(target: string, newRole: UserRole) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: target, role: newRole }),
    });
    await loadUsers();
  }

  async function handleForceRefresh() {
    setRefreshMessage("Atualizando...");
    const res = await fetch("/api/data/refresh", { method: "POST" });
    setRefreshMessage(res.ok ? "Dados atualizados com sucesso." : "Falha ao atualizar os dados.");
  }

  return (
    <main className="space-y-8 p-6">
      <section>
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Atualização de dados</h1>
        <button
          onClick={handleForceRefresh}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Atualizar dados agora
        </button>
        {refreshMessage && <p className="mt-2 text-sm text-slate-600">{refreshMessage}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Usuários</h2>
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {users.map((u) => (
            <li key={u.username} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-slate-700">{u.username}</span>
              <div className="flex items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.username, e.target.value as UserRole)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  onClick={() => handleDelete(u.username)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500">Usuário</label>
            <input
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Senha</label>
            <input
              type="password"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Perfil</label>
            <select
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
            Adicionar
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as `admin`, visit `/admin`, create a `viewer` user,
confirm it appears in the list, change its role to `admin`, then delete it.
Confirm a `viewer`-role session gets redirected away from `/admin` (enforced
by Task 9's middleware).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/ app/admin/
git commit -m "feat: add admin user management page"
```

---

### Task 18: Root redirect and layout wiring

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: nothing new — wires the root route to `/dashboard` and sets page
  metadata.

- [ ] **Step 1: Redirect the root route to the dashboard**

Replace the contents of `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 2: Set page metadata**

Edit `app/layout.tsx` so the `metadata` export reads:

```typescript
export const metadata = {
  title: "Frota 360",
  description: "Painel de acompanhamento do projeto Frota 360",
};
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, visit `http://localhost:3000/`, confirm it redirects to
`/login` (via middleware, since there's no session) rather than erroring.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: redirect root route to dashboard and set page metadata"
```

---

### Task 19: Deployment configuration and documentation

**Files:**
- Create: `README.md`
- Create: `vercel.json`

**Interfaces:**
- Produces: deployment instructions and the Vercel project configuration
  needed to ship the app built in Tasks 1–18.

- [ ] **Step 1: Add `vercel.json`**

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Write the deployment README**

Create `README.md`:

```markdown
# Frota 360 — Dashboard

Painel de acompanhamento do projeto Frota 360. Ver a spec completa em
`docs/superpowers/specs/2026-08-16-frota-360-dashboard-design.md`.

## Desenvolvimento local

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha:
   - `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`: chave JSON da conta de serviço do
     Google Cloud (com acesso de leitura à pasta do Drive), codificada em
     base64 (`base64 -w0 service-account.json`).
   - `GOOGLE_DRIVE_FOLDER_ID`: ID da pasta do Drive com os 3 arquivos do
     projeto (o trecho após `/folders/` na URL da pasta).
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN`: geradas automaticamente ao
     conectar um banco Vercel KV ao projeto (`vercel env pull` após criar o
     banco no dashboard da Vercel).
   - `SESSION_SECRET`: `openssl rand -base64 32`.
   - `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`: credenciais do primeiro
     usuário admin, criado automaticamente no primeiro login.
3. `npm run dev`

## Testes

`npm test`

## Deploy (Vercel)

1. Crie um projeto na Vercel apontando para este repositório.
2. Na aba Storage, crie e conecte um banco **KV**.
3. Em Settings → Environment Variables, adicione todas as variáveis listadas
   acima (exceto `KV_REST_API_URL`/`KV_REST_API_TOKEN`, que a Vercel
   preenche automaticamente ao conectar o KV).
4. Compartilhe a pasta do Google Drive com o e-mail da conta de serviço
   (`client_email` dentro do JSON da chave), com permissão de leitura.
5. Faça o deploy (`git push` na branch conectada, ou `vercel --prod`).
```

- [ ] **Step 3: Commit**

```bash
git add README.md vercel.json
git commit -m "docs: add deployment instructions and Vercel config"
```

---

## Post-plan checklist (manual, outside the task loop)

These require real external credentials and cannot be scripted as plan steps:

1. Create a Google Cloud service account, enable the Drive API, download its
   JSON key, and share the project's Drive folder with the service account's
   email (read-only).
2. Create a Vercel KV store and connect it to the Vercel project.
3. Set all environment variables in Vercel (see README, Task 19).
4. Do a full manual pass through the app in production: login as seeded
   admin, verify KPIs match the spreadsheets, create a viewer user, log in as
   that viewer, confirm restricted columns/files are hidden, log out.
