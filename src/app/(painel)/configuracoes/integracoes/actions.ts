"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  deleteStored,
  getCoraCredentials,
  getEvolutionCredentials,
  normalizePem,
  saveCoraCredentials,
  saveEvolutionCredentials,
  type CoraCredentials,
  type EvolutionCredentials,
} from "@/lib/credentials";
import { testCoraCredentials } from "@/lib/cora";
import { getConnectionState } from "@/lib/evolution";
import type { ActionState } from "@/lib/validation";

const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

function revalidate() {
  revalidatePath("/", "layout");
}

/* ---------------------------------- Cora ----------------------------------- */

async function readCora(fd: FormData): Promise<CoraCredentials | string> {
  // Campos de segredo em branco = manter o valor já salvo.
  const current = await getCoraCredentials().catch(() => null);
  const env = field(fd, "env") === "production" ? "production" : "stage";
  const clientId = field(fd, "clientId") || current?.clientId || "";
  const certificate = normalizePem(field(fd, "certificate")) || current?.certificate || "";
  const privateKey = normalizePem(field(fd, "privateKey")) || current?.privateKey || "";

  if (!clientId) return "Informe o Client ID.";
  if (!/-----BEGIN [A-Z ]*CERTIFICATE-----/.test(certificate)) {
    return "Certificado inválido: cole o conteúdo do arquivo .pem (começa com -----BEGIN CERTIFICATE-----).";
  }
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)) {
    return "Chave privada inválida: cole o conteúdo do arquivo .key (começa com -----BEGIN ... PRIVATE KEY-----).";
  }
  return { env, clientId, certificate, privateKey };
}

export async function saveCoraAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAuth();
  const creds = await readCora(fd);
  if (typeof creds === "string") return { error: creds };
  try {
    await testCoraCredentials(creds);
  } catch (err) {
    if (fd.get("force") !== "on") {
      return { error: `Não salvo — o teste de conexão falhou: ${msg(err)}` };
    }
    await saveCoraCredentials(creds);
    revalidate();
    return { error: `Salvo, mas o teste de conexão falhou: ${msg(err)}` };
  }
  await saveCoraCredentials(creds);
  revalidate();
  return { ok: "Credenciais da Cora salvas e conexão testada com sucesso." };
}

export async function testCoraAction(): Promise<ActionState> {
  await requireAuth();
  try {
    const creds = await getCoraCredentials();
    if (!creds) return { error: "Nenhuma credencial da Cora cadastrada." };
    await testCoraCredentials(creds);
    return { ok: `Conexão com a Cora OK (${creds.env === "production" ? "produção" : "testes/stage"}).` };
  } catch (err) {
    return { error: msg(err) };
  }
}

export async function removeCoraAction(): Promise<ActionState> {
  await requireAuth();
  await deleteStored("cora");
  revalidate();
  return { ok: "Credenciais da Cora removidas do painel." };
}

/* -------------------------------- Evolution -------------------------------- */

async function readEvolution(fd: FormData): Promise<EvolutionCredentials | string> {
  const current = await getEvolutionCredentials().catch(() => null);
  const url = field(fd, "url");
  const instance = field(fd, "instance");
  const apiKey = field(fd, "apiKey") || current?.apiKey || "";
  try {
    const u = new URL(url);
    if (!["https:", "http:"].includes(u.protocol)) throw new Error();
  } catch {
    return "URL inválida (ex: https://evolution.seudominio.com.br).";
  }
  if (!instance) return "Informe o nome da instância.";
  if (!apiKey) return "Informe a API key.";
  return { url, instance, apiKey };
}

export async function saveEvolutionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAuth();
  const creds = await readEvolution(fd);
  if (typeof creds === "string") return { error: creds };
  let state: string;
  try {
    state = await getConnectionState(creds);
  } catch (err) {
    if (fd.get("force") !== "on") return { error: `Não salvo — o teste falhou: ${msg(err)}` };
    await saveEvolutionCredentials(creds);
    revalidate();
    return { error: `Salvo, mas o teste falhou: ${msg(err)}` };
  }
  await saveEvolutionCredentials(creds);
  revalidate();
  return state === "open"
    ? { ok: "Credenciais salvas. WhatsApp conectado." }
    : { error: `Credenciais salvas, mas a instância está "${state}". Conecte o WhatsApp (QR code) na Evolution.` };
}

export async function removeEvolutionAction(): Promise<ActionState> {
  await requireAuth();
  await deleteStored("evolution");
  revalidate();
  return { ok: "Credenciais da Evolution removidas do painel." };
}
