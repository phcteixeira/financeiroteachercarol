# Financeiro Teacher Carol

Painel para gerenciar alunos, mensalidades e cobranças.

- **Alunos**: nome, telefone (WhatsApp), CPF/CNPJ, valor da mensalidade, dia do vencimento e contratos em PDF.
- **Cobranças**: emissão de boleto + Pix pela **API da Cora**, geração das mensalidades do mês em lote (ou automática), cancelamento, baixa manual e atualização de status via webhook.
- **Lembretes**: mensagens de WhatsApp pela **Evolution API**, antes, no dia e depois do vencimento (dias e textos configuráveis), além de envio manual.

Stack: Next.js 16 (App Router) · Neon Postgres + Drizzle ORM · Vercel Blob (privado) · Vercel Cron.

## Implantação na Vercel

1. **Importe o repositório** em [vercel.com/new](https://vercel.com/new).
2. Na aba **Storage** do projeto:
   - **Neon** (Postgres) → conecte; cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
   - **Blob** → crie um store com acesso **Private** e conecte; cria `BLOB_STORE_ID` (ou `BLOB_READ_WRITE_TOKEN` em stores antigos).
3. Em **Settings → Environment Variables**, cadastre as demais variáveis de `.env.example`
   (`ADMIN_PASSWORD`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `CORA_WEBHOOK_SECRET`).
4. Faça o deploy. O build roda as migrações do banco automaticamente (`npm run db:migrate`).
5. Acesse o painel com a senha `ADMIN_PASSWORD` e cadastre as credenciais da Cora e da Evolution em
   **Configurações → Integrações**. Elas ficam no banco, criptografadas com `ENCRYPTION_KEY`; ao salvar, o painel
   testa a conexão.

### Cora

1. No app da Cora, gere as credenciais de **Integração Direta**: `client_id`, `certificate.pem` e `private-key.key`.
   Cada ambiente (stage/produção) tem seu próprio certificado.
2. Em **Configurações → Integrações**, escolha o ambiente (testes ou produção), informe o Client ID e
   carregue os arquivos `.pem` e `.key` (ou cole o conteúdo).
4. **Webhook**: cadastre na Cora (recurso `invoice`, eventos `paid`, `canceled` e `overdue`) a URL
   mostrada em **Configurações → Integrações**:
   `https://SEU-DOMINIO/api/webhooks/cora?token=CORA_WEBHOOK_SECRET`.
   O painel nunca confia no conteúdo do webhook: ele sempre reconsulta o boleto na Cora.
   Mesmo sem webhook, a rotina diária e o botão "Sincronizar com a Cora" atualizam os status.

O boleto exige **CPF/CNPJ** do pagador e valor mínimo de **R$ 5,00**. Multa (até 2%) e juros (até 1% ao mês)
são configurados no painel.

### Evolution API (WhatsApp)

Em **Configurações → Integrações**, informe a URL da Evolution, a API key e o nome da instância conectada.
O envio usa `POST /message/sendText/{instancia}` com `{ number, text }` (formato da v2).
Na mesma página é possível ver o estado da conexão e enviar uma mensagem de teste.

### Rotina diária

`vercel.json` agenda `/api/cron/diario` todo dia às 12:00 UTC (9h em Brasília). Ela:

1. sincroniza com a Cora o status das cobranças em aberto e marca as vencidas como atrasadas;
2. gera as mensalidades automaticamente, se ativado em Configurações;
3. envia os lembretes de WhatsApp do dia (no máximo um por tipo, por cobrança, por dia).

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run db:migrate
npm run dev
```

Para usar um Postgres local em vez do Neon, rode um proxy HTTP do Neon
(ex.: [local-neon-http-proxy](https://github.com/TimoWilhelm/local-neon-http-proxy)) e defina
`NEON_FETCH_ENDPOINT=http://localhost:4444/sql`.

Ao alterar `src/db/schema.ts`, gere uma nova migração com `npm run db:generate`.
