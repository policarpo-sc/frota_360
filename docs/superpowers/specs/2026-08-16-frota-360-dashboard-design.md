# Frota 360 — Dashboard de Acompanhamento de Projeto

**Data:** 2026-08-16
**Status:** Aprovado para planejamento de implementação

## 1. Objetivo

Construir um painel web para acompanhamento do progresso do projeto Frota 360 (JSL),
usado pelo time MaPP e pelo cliente JSL. O painel exibe indicadores de progresso,
lista de ações/condicionantes com status, e dá acesso rápido aos arquivos do projeto
armazenados no Google Drive. Os arquivos Excel continuam sendo a fonte de dados
editável — o app apenas lê e exibe.

## 2. Fontes de dados

Três arquivos `.xlsx` em uma pasta do Google Drive, lidos via Google Drive API
(conta de serviço, somente leitura):

### `Projeto_Ações.xlsx` (sheet "Projeto Extratificado", ~164 linhas)
Colunas: `ONDAS`, `Nº BLOCO`, `BLOCO`, `REQUISITO`, `Atende?`, `AÇÃO`, `TAREFA`,
`RESPONSÁVEL`, `Quando?(Início)`, `Prazo Previsto`, `DT Início Real`,
`Quando?(Fim)`, `Duração (Dias)`, `Status`.

### `Projeto_Condicionantes_Gente.xlsx` (sheet "GENTE", ~43 linhas)
Título mesclado na linha 1; **cabeçalho real na linha 2** (`header=1` no parser).
Colunas: `Nº`, `Unidade`, `Nome da função`, `QTD`, `Motivo Solicitação`,
`Justificativa`, `Responsável pela Solicitação`, `Gestor JSL Responsável pela Demanda`,
`Data Apresentação da solicitação`, `Status da Solicitação`,
`Posição da Vaga (Area de Gente)`, `Quando? (Inicio)`, `Prazo Previsto`,
`Quando? (Fim)`, `Duração (Dias)`, `Status`, `Comentários`.

### `Projeto_Condicionantes_Investimento.xlsx` (sheet "Inventimentos", ~29 linhas)
Título mesclado na linha 1; **cabeçalho real na linha 2** (`header=1` no parser).
Colunas: `Onda`, `Local`, `Bloco`, `Investimento`, `Estimativa de Investimento`,
`Data de Solicitação`, `Data de Aprovação`, `Status`.

**Eixo comum:** `Onda` → `Bloco` aparece nos três arquivos e é usado para cruzar
ações, vagas (Gente) e investimentos numa visão unificada por bloco.

Campos considerados sensíveis, ocultos do perfil viewer: `Justificativa` e
`Comentários` (arquivo Gente).

## 3. Arquitetura

```
Google Drive (pasta do projeto)
   │  Google Drive API, conta de serviço (somente leitura)
   ▼
API routes do Next.js (server-side)
   │  - lista arquivos da pasta
   │  - baixa e faz parse dos 3 xlsx (lib `xlsx`)
   │  - normaliza dados (Onda/Bloco/Status) e calcula KPIs + alertas de prazo
   │  - cache em Vercel KV (TTL ~15 min); admin pode forçar refresh
   ▼
Front-end React (Next.js)
   │  - autenticação por sessão (cookie assinado / JWT)
   ▼
Navegador do usuário (MaPP / JSL)
```

- **App:** Next.js (fullstack), hospedado na Vercel.
- **Persistência:** Vercel KV (Redis gerenciado) para (a) cache de dados processados
  do Drive e (b) tabela de usuários (nome, hash de senha, perfil).
- **Sem banco relacional** — escopo não justifica.

## 4. Autenticação e perfis

Dois perfis: `admin` (MaPP) e `viewer` (JSL). Login via usuário/senha, sessão por
cookie assinado. Usuários são gerenciados na tela de Admin (CRUD completo:
criar/editar/remover, trocar senha, definir perfil), persistidos no Vercel KV com
senha em hash (bcrypt ou equivalente).

| Recurso | Admin | Viewer |
|---|---|---|
| Dashboard de KPIs | ✅ | ✅ |
| Lista de ações com filtros | ✅ | ✅ |
| Alertas de prazo | ✅ | ✅ |
| Coluna Justificativa/Comentários | ✅ | 🚫 |
| Forçar atualização dos dados | ✅ | 🚫 |
| Navegador de arquivos | ✅ pasta completa | 🚫 só os 3 arquivos de acompanhamento |
| Gerenciar usuários/senhas | ✅ | 🚫 |

## 5. Telas

1. **Login** — usuário/senha.
2. **Dashboard** — KPIs: % concluído/atrasado/em andamento, gráfico por Onda/Bloco,
   contagem de vagas e investimentos por status.
3. **Ações** — tabela filtrável (Onda, Bloco, Responsável, Status), atrasadas
   destacadas.
4. **Condicionantes** — sub-seções Gente e Investimento, mesmo padrão de
   tabela + filtro + alerta de prazo.
5. **Arquivos** — navegador da pasta do Drive (escopo depende do perfil), com
   link para abrir/baixar cada arquivo.
6. **Admin** (só admin) — CRUD de usuários + botão "atualizar dados agora".

## 6. Regra de alerta de prazo

Calculada no back-end, junto ao parse dos dados:
- `Status` ≠ "Concluída" e `Prazo Previsto` < hoje → **Atrasado** (vermelho).
- `Status` ≠ "Concluída" e `Prazo Previsto` ≤ hoje + 7 dias → **Atenção** (amarelo).
- Caso contrário → normal.

## 7. Tratamento de erros

- Falha de acesso ao Drive: mantém último cache válido, exibe aviso e timestamp
  da última atualização bem-sucedida.
- Falha de parse em um dos 3 arquivos: isola o erro por arquivo — os outros dois
  continuam funcionando normalmente, com aviso específico do arquivo com problema.
- Login inválido: mensagem genérica (não revela se usuário ou senha está errado).
- Sessão expirada: redireciona ao login preservando a página de destino original.

## 8. Testes

- Testes unitários para: parser dos xlsx (normalização Onda/Bloco, cálculo de
  status de atraso) e lógica de permissões por perfil.
- Teste manual guiado das telas principais antes de cada deploy (login, dashboard,
  filtros, admin). Sem suíte E2E automatizada — fora do custo-benefício do escopo.

## 9. Fora de escopo (MVP)

- Edição de ações/condicionantes dentro do app (continua no Excel).
- Múltiplos ambientes de aprovação de investimento/headcount dentro do app.
- Notificações por e-mail/push de prazos.
- Suporte a múltiplos projetos além do Frota 360.
