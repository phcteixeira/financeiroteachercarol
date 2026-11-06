import "server-only";

/**
 * Envio de mensagens de WhatsApp pela Evolution API (v2).
 *
 * Variáveis:
 *  EVOLUTION_API_URL      ex: https://evolution.seudominio.com
 *  EVOLUTION_API_KEY      apikey da instância (ou global)
 *  EVOLUTION_INSTANCE     nome da instância conectada
 */

export function isEvolutionConfigured() {
  return Boolean(
    process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE,
  );
}

function config() {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!url || !apiKey || !instance) {
    throw new Error("Evolution API não configurada (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE).");
  }
  return { url, apiKey, instance: encodeURIComponent(instance) };
}

export async function sendWhatsAppText(number: string, text: string) {
  const { url, apiKey, instance } = config();
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

export async function getConnectionState(): Promise<string> {
  const { url, apiKey, instance } = config();
  const res = await fetch(`${url}/instance/connectionState/${instance}`, {
    headers: { apikey: apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return `erro HTTP ${res.status}`;
  const data = (await res.json()) as { instance?: { state?: string }; state?: string };
  return data.instance?.state ?? data.state ?? "desconhecido";
}
