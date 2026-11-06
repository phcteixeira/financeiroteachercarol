import "server-only";
import { getEvolutionCredentials, type EvolutionCredentials } from "./credentials";

/**
 * Envio de mensagens de WhatsApp pela Evolution API (v2).
 * Credenciais (URL, apikey e instância) cadastradas em Configurações → Integrações.
 */

export async function isEvolutionConfigured() {
  return Boolean(await getEvolutionCredentials().catch(() => null));
}

async function config(override?: EvolutionCredentials) {
  const creds = override ?? (await getEvolutionCredentials());
  if (!creds) {
    throw new Error("Evolution API não configurada. Cadastre as credenciais em Configurações → Integrações.");
  }
  return {
    url: creds.url.trim().replace(/\/+$/, ""),
    apiKey: creds.apiKey.trim(),
    instance: encodeURIComponent(creds.instance.trim()),
    instanceName: creds.instance.trim(),
  };
}

export async function sendWhatsAppText(number: string, text: string) {
  const { url, apiKey, instance } = await config();
  const res = await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Evolution API respondeu HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return body;
}

/** Estado da conexão da instância ("open" = conectada). Aceita credenciais para teste antes de salvar. */
export async function getConnectionState(override?: EvolutionCredentials): Promise<string> {
  const { url, apiKey, instance } = await config(override);
  let res: Response;
  try {
    res = await fetch(`${url}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new Error(`Não foi possível acessar ${url}: ${(err as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) throw new Error("API key recusada pela Evolution.");
  if (res.status === 404) throw new Error("Instância não encontrada na Evolution.");
  if (!res.ok) throw new Error(`Evolution respondeu HTTP ${res.status}.`);
  const data = (await res.json()) as { instance?: { state?: string }; state?: string };
  return data.instance?.state ?? data.state ?? "desconhecido";
}

export async function getInstanceName() {
  return (await getEvolutionCredentials().catch(() => null))?.instance ?? null;
}
