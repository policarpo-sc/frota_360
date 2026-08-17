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
