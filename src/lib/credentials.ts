import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { credentials, db } from "@/db";

/**
 * Credenciais das integrações, cadastradas pelo painel (Configurações → Integrações).
 * Ficam no banco criptografadas (AES-256-GCM). A chave vem de ENCRYPTION_KEY
 * (ou, se ausente, de AUTH_SECRET). Se não houver nada no banco, usa as
 * variáveis de ambiente antigas (CORA_*, EVOLUTION_*).
 */

export interface CoraCredentials {
  env: "stage" | "production";
  clientId: string;
  certificate: string; // PEM
  privateKey: string; // PEM
}

export interface EvolutionCredentials {
  url: string;
  apiKey: string;
  instance: string;
}

type Source = "painel" | "ambiente";

function encryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY (ou AUTH_SECRET) ausente ou curta (mínimo 32 caracteres).");
  }
  return Buffer.from(hkdfSync("sha256", secret, "financeiro-teacher-carol", "credenciais", 32));
}

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

function decrypt(value: string) {
  const [version, iv, tag, data] = value.split(":");
  if (version !== "v1") throw new Error("Formato de credencial desconhecido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

async function readStored<T>(key: string): Promise<T | null> {
  const row = await db.query.credentials.findFirst({ where: eq(credentials.key, key) });
  if (!row) return null;
  try {
    return JSON.parse(decrypt(row.value)) as T;
  } catch {
    throw new Error(
      `Não foi possível ler as credenciais "${key}" (a chave de criptografia mudou?). Cadastre-as novamente.`,
    );
  }
}

async function writeStored(key: string, value: unknown) {
  const encrypted = encrypt(JSON.stringify(value));
  await db
    .insert(credentials)
    .values({ key, value: encrypted, updatedAt: new Date() })
    .onConflictDoUpdate({ target: credentials.key, set: { value: encrypted, updatedAt: new Date() } });
}

export async function deleteStored(key: "cora" | "evolution") {
  await db.delete(credentials).where(eq(credentials.key, key));
}

/** Aceita PEM colado (com quebras reais ou "\n") ou o PEM em base64. */
export function normalizePem(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (v.includes("-----BEGIN")) return v.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  try {
    const decoded = Buffer.from(v, "base64").toString("utf8");
    return decoded.includes("-----BEGIN") ? decoded.trim() : v;
  } catch {
    return v;
  }
}

function coraFromEnv(): CoraCredentials | null {
  const { CORA_CLIENT_ID, CORA_CERTIFICATE, CORA_PRIVATE_KEY, CORA_ENV } = process.env;
  if (!CORA_CLIENT_ID || !CORA_CERTIFICATE || !CORA_PRIVATE_KEY) return null;
  return {
    env: CORA_ENV === "production" ? "production" : "stage",
    clientId: CORA_CLIENT_ID,
    certificate: normalizePem(CORA_CERTIFICATE),
    privateKey: normalizePem(CORA_PRIVATE_KEY),
  };
}

function evolutionFromEnv(): EvolutionCredentials | null {
  const { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE } = process.env;
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) return null;
  return { url: EVOLUTION_API_URL, apiKey: EVOLUTION_API_KEY, instance: EVOLUTION_INSTANCE };
}

export async function getCoraCredentials(): Promise<(CoraCredentials & { source: Source }) | null> {
  const stored = await readStored<CoraCredentials>("cora");
  if (stored) return { ...stored, source: "painel" };
  const env = coraFromEnv();
  return env ? { ...env, source: "ambiente" } : null;
}

export async function getEvolutionCredentials(): Promise<(EvolutionCredentials & { source: Source }) | null> {
  const stored = await readStored<EvolutionCredentials>("evolution");
  if (stored) return { ...stored, source: "painel" };
  const env = evolutionFromEnv();
  return env ? { ...env, source: "ambiente" } : null;
}

export async function saveCoraCredentials(value: CoraCredentials) {
  await writeStored("cora", value);
}

export async function saveEvolutionCredentials(value: EvolutionCredentials) {
  await writeStored("evolution", value);
}

/** Últimos caracteres de um segredo, para identificação na tela. */
export function hint(secret: string) {
  return secret.length > 8 ? `••••${secret.slice(-4)}` : "••••";
}
