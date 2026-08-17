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
