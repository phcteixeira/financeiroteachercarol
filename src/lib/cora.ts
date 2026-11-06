import "server-only";
import https from "node:https";
import { X509Certificate, createHash, createPrivateKey, randomUUID } from "node:crypto";
import { getCoraCredentials, type CoraCredentials } from "./credentials";

/**
 * Cliente da API Cora — modalidade "Integração Direta" (mTLS).
 * Docs: https://developers.cora.com.br
 *
 * As credenciais (client_id, certificado, chave privada e ambiente) são
 * cadastradas em Configurações → Integrações (ver lib/credentials.ts).
 */

export type CoraInvoiceStatus =
  | "CANCELLED"
  | "DRAFT"
  | "IN_PAYMENT"
  | "INITIATED"
  | "LATE"
  | "OPEN"
  | "PAID"
  | "RECURRENCE_DRAFT";

export interface CoraInvoice {
  id: string;
  status: CoraInvoiceStatus;
  code?: string;
  total_amount: number;
  total_paid: number;
  occurrence_date?: string | null;
  payment_options?: {
    bank_slip?: { barcode?: string; digitable?: string; url?: string; our_number?: string };
  };
  pix?: { emv?: string } | null;
}

export interface CreateInvoiceInput {
  code: string;
  customer: { name: string; email?: string | null; document: string };
  serviceName: string;
  description: string;
  amount: number; // centavos
  dueDate: string; // YYYY-MM-DD
  finePercent?: number;
  interestPercent?: number; // ao mês
  idempotencyKey?: string;
}

export class CoraError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
  }
}

interface Session {
  creds: CoraCredentials;
  agent: https.Agent;
  token: { value: string; expiresAt: number } | null;
}

// Uma sessão (conexão mTLS + token) por conjunto de credenciais.
const sessions = new Map<string, Session>();

function fingerprint(c: CoraCredentials) {
  return createHash("sha256").update([c.env, c.clientId, c.certificate, c.privateKey].join("|")).digest("hex");
}

/** Confere se certificado e chave são válidos e formam um par. */
export function validateCertificate(creds: Pick<CoraCredentials, "certificate" | "privateKey">) {
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(creds.certificate);
  } catch {
    throw new CoraError("Certificado inválido: confira se colou o conteúdo completo do arquivo .pem.");
  }
  let key: ReturnType<typeof createPrivateKey>;
  try {
    key = createPrivateKey(creds.privateKey);
  } catch {
    throw new CoraError("Chave privada inválida: confira se colou o conteúdo completo do arquivo .key.");
  }
  if (!cert.checkPrivateKey(key)) {
    throw new CoraError("A chave privada não corresponde a este certificado. Use o par gerado juntos pela Cora.");
  }
  if (Date.parse(cert.validTo) < Date.now()) {
    throw new CoraError(`O certificado expirou em ${new Date(cert.validTo).toLocaleDateString("pt-BR")}. Gere um novo na Cora.`);
  }
}

function sessionFor(creds: CoraCredentials): Session {
  const key = fingerprint(creds);
  let session = sessions.get(key);
  if (!session) {
    validateCertificate(creds);
    const agent = new https.Agent({ cert: creds.certificate, key: creds.privateKey, keepAlive: true });
    session = { creds, agent, token: null };
    sessions.clear(); // credenciais mudaram: descarta sessões antigas
    sessions.set(key, session);
  }
  return session;
}

async function currentSession() {
  const creds = await getCoraCredentials();
  if (!creds) {
    throw new CoraError("Integração Cora não configurada. Cadastre as credenciais em Configurações → Integrações.");
  }
  return sessionFor(creds);
}

export async function isCoraConfigured() {
  return Boolean(await getCoraCredentials().catch(() => null));
}

function baseHost(env: CoraCredentials["env"]) {
  return env === "production" ? "matls-clients.api.cora.com.br" : "matls-clients.api.stage.cora.com.br";
}

function request(
  session: Session,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: baseHost(session.creds.env),
        path,
        method,
        agent: session.agent,
        headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) },
        timeout: 20_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data: unknown = text;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            /* resposta não-JSON */
          }
          resolve({ status: res.statusCode ?? 0, data });
        });
      },
    );
    req.on("timeout", () => req.destroy(new CoraError("Tempo esgotado ao chamar a Cora.")));
    req.on("error", (err) =>
      reject(new CoraError(`Falha de conexão com a Cora: ${err.message}. Confira certificado, chave e ambiente.`)),
    );
    if (body) req.write(body);
    req.end();
  });
}

async function getToken(session: Session) {
  if (session.token && session.token.expiresAt > Date.now() + 60_000) return session.token.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: session.creds.clientId,
  }).toString();
  const { status, data } = await request(
    session,
    "POST",
    "/token",
    { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  );
  const token = data as { access_token?: string; expires_in?: number };
  if (status !== 200 || !token?.access_token) {
    throw new CoraError(
      `Falha na autenticação com a Cora (HTTP ${status}). Confira o client_id e se o certificado é do ambiente escolhido.`,
      status,
      data,
    );
  }
  session.token = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  return session.token.value;
}

/** Testa credenciais (obtém um token de acesso), sem salvá-las. */
export async function testCoraCredentials(creds: CoraCredentials) {
  const session = sessionFor(creds);
  session.token = null;
  await getToken(session);
}

async function authed(method: string, path: string, payload?: unknown, extraHeaders = {}) {
  const session = await currentSession();
  const token = await getToken(session);
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const res = await request(
    session,
    method,
    path,
    {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...extraHeaders,
    },
    body,
  );
  if (res.status === 401) session.token = null;
  return res;
}

function errorMessage(data: unknown, status: number) {
  if (data && typeof data === "object") {
    const d = data as { message?: string; errors?: { message?: string }[] | unknown };
    const details = Array.isArray(d.errors)
      ? d.errors.map((e) => (e as { message?: string })?.message ?? JSON.stringify(e)).join("; ")
      : "";
    return [d.message, details].filter(Boolean).join(" — ") || `HTTP ${status}`;
  }
  return typeof data === "string" && data ? data.slice(0, 300) : `HTTP ${status}`;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CoraInvoice> {
  const doc = input.customer.document.replace(/\D/g, "");
  const payload = {
    code: input.code,
    customer: {
      name: input.customer.name.slice(0, 60),
      ...(input.customer.email ? { email: input.customer.email.slice(0, 60) } : {}),
      document: { identity: doc, type: doc.length === 14 ? "CNPJ" : "CPF" },
    },
    services: [
      {
        name: input.serviceName.slice(0, 100),
        description: input.description.slice(0, 100),
        amount: input.amount,
      },
    ],
    payment_terms: {
      due_date: input.dueDate,
      ...(input.finePercent ? { fine: { rate: input.finePercent } } : {}),
      ...(input.interestPercent ? { interest: { rate: input.interestPercent } } : {}),
    },
    payment_forms: ["BANK_SLIP", "PIX"],
  };

  // A mesma Idempotency-Key evita boleto duplicado em caso de reenvio.
  const { status, data } = await authed("POST", "/v2/invoices", payload, {
    "Idempotency-Key": input.idempotencyKey ?? randomUUID(),
  });
  if (status < 200 || status >= 300) {
    throw new CoraError(`Cora recusou o boleto: ${errorMessage(data, status)}`, status, data);
  }
  return data as CoraInvoice;
}

export async function getInvoice(id: string): Promise<CoraInvoice> {
  const { status, data } = await authed("GET", `/v2/invoices/${encodeURIComponent(id)}`);
  if (status !== 200) {
    throw new CoraError(`Erro ao consultar boleto: ${errorMessage(data, status)}`, status, data);
  }
  return data as CoraInvoice;
}

export async function cancelInvoice(id: string): Promise<void> {
  const { status, data } = await authed("DELETE", `/v2/invoices/${encodeURIComponent(id)}`);
  if (status !== 204 && status !== 200) {
    throw new CoraError(`Erro ao cancelar boleto: ${errorMessage(data, status)}`, status, data);
  }
}

/** Mapeia o status da Cora para o status interno da cobrança. */
export function mapCoraStatus(s: CoraInvoiceStatus): "pending" | "paid" | "late" | "canceled" {
  switch (s) {
    case "PAID":
      return "paid";
    case "LATE":
      return "late";
    case "CANCELLED":
      return "canceled";
    default:
      return "pending";
  }
}
