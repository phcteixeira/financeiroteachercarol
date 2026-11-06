import "server-only";
import https from "node:https";
import { randomUUID } from "node:crypto";

/**
 * Cliente da API Cora — modalidade "Integração Direta" (mTLS).
 * Docs: https://developers.cora.com.br
 *
 * Variáveis:
 *  CORA_ENV           "stage" | "production" (padrão: stage)
 *  CORA_CLIENT_ID     client_id fornecido pela Cora
 *  CORA_CERTIFICATE   conteúdo do certificate.pem (PEM ou base64 do PEM)
 *  CORA_PRIVATE_KEY   conteúdo do private-key.key (PEM ou base64 do PEM)
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

function baseHost() {
  return process.env.CORA_ENV === "production"
    ? "matls-clients.api.cora.com.br"
    : "matls-clients.api.stage.cora.com.br";
}

function readPem(value: string | undefined, name: string) {
  if (!value) throw new CoraError(`${name} não configurado.`);
  const v = value.trim();
  if (v.includes("-----BEGIN")) return v.replace(/\\n/g, "\n");
  return Buffer.from(v, "base64").toString("utf8");
}

export function isCoraConfigured() {
  return Boolean(
    process.env.CORA_CLIENT_ID && process.env.CORA_CERTIFICATE && process.env.CORA_PRIVATE_KEY,
  );
}

let agent: https.Agent | null = null;
function getAgent() {
  if (!agent) {
    agent = new https.Agent({
      cert: readPem(process.env.CORA_CERTIFICATE, "CORA_CERTIFICATE"),
      key: readPem(process.env.CORA_PRIVATE_KEY, "CORA_PRIVATE_KEY"),
      keepAlive: true,
    });
  }
  return agent;
}

function request(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: baseHost(),
        path,
        method,
        agent: getAgent(),
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
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const clientId = process.env.CORA_CLIENT_ID;
  if (!clientId) throw new CoraError("CORA_CLIENT_ID não configurado.");

  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId }).toString();
  const { status, data } = await request(
    "POST",
    "/token",
    { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  );
  const token = data as { access_token?: string; expires_in?: number };
  if (status !== 200 || !token?.access_token) {
    throw new CoraError(`Falha na autenticação com a Cora (HTTP ${status}).`, status, data);
  }
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function authed(method: string, path: string, payload?: unknown, extraHeaders = {}) {
  const token = await getToken();
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const res = await request(
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
  if (res.status === 401) cachedToken = null;
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
